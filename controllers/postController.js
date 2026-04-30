const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Report = require("../models/Report");
const Ad = require("../models/Ad");
const socketNotification = require("../sockets/socketNotification");
const cloudinary = require("../config/cloudinary");

const enviarNotiSocial = async (receptor, emisor, tipo, mensaje, publicacionId = null, comentarioId = null) => {
    if (receptor.toString() === emisor.toString()) return;
    try {
        // Check for blocks - Use toString() for safe comparison
        const userReceptor = await User.findById(receptor).select("bloqueados");
        const userEmisor = await User.findById(emisor).select("bloqueados");

        const isBlocked = userReceptor.bloqueados.some(id => id.toString() === emisor.toString()) || 
                          userEmisor.bloqueados.some(id => id.toString() === receptor.toString());

        if (isBlocked) return;

        const noti = new Notification({ receptor, emisor, tipo, mensaje, publicacion: publicacionId, comentarioId });
        await noti.save();
        const io = socketNotification.getIO();
        if (io) {
            const populatedNoti = await Notification.findById(noti._id).populate("emisor", "nombre fotoPerfil").populate("publicacion", "contenido");
            io.to(receptor.toString()).emit("nueva-notificacion", populatedNoti);
        }
    } catch (e) {
        console.error("Error enviando noti social", e);
    }
};

const processMentions = async (texto, emisorId, publicacionId, commentId = null, replyId = null) => {
    if (!texto) return;
    // Regex updated to include accents and special characters
    const mentionRegex = /@([a-zA-Z0-9_\.áéíóúÁÉÍÓÚñÑ-]+)/g;
    const matches = texto.matchAll(mentionRegex);
    const usernames = [...new Set([...matches].map(m => m[1]))];
    const mentionIds = [];

    for (const username of usernames) {
        try {
            const user = await User.findOne({
                $or: [
                    { username: username.toLowerCase() },
                    { nombre: new RegExp(`^${username.replace(/[._-]/g, '[._ -]')}$`, 'i') },
                    { nombre: new RegExp(`^${username.replace(/_/g, ' ')}$`, 'i') }
                ]
            }).select("_id nombre username");
            
            if (user) {
                mentionIds.push(user._id);
                let msg = `@${username} te ha mencionado en una publicación`;
                if (replyId) msg = `@${username} te ha mencionado en una respuesta`;
                else if (commentId) msg = `@${username} te ha mencionado en un comentario`;
                
                await enviarNotiSocial(user._id, emisorId, "mencion", msg, publicacionId, commentId || replyId);
            }
        } catch (err) {
            console.error("Error al procesar mencion", err);
        }
    }

    if (mentionIds.length > 0) {
        if (replyId) {
            await Post.findOneAndUpdate(
                { _id: publicacionId, "comentarios._id": commentId },
                { $addToSet: { "comentarios.$.respuestas.$[repl].mentions": { $each: mentionIds } } },
                { arrayFilters: [{ "repl._id": replyId }] }
            );
        } else if (commentId) {
            await Post.findOneAndUpdate(
                { _id: publicacionId, "comentarios._id": commentId },
                { $addToSet: { "comentarios.$.mentions": { $each: mentionIds } } }
            );
        } else if (publicacionId) {
            await Post.findByIdAndUpdate(publicacionId, { $addToSet: { mentions: { $each: mentionIds } } });
        }
    }
};

exports.createPost = async (req, res) => {
    try {
        // Force normalization directly on req.body for Mongoose safety
        if (req.body.visibilidad) {
            const v = req.body.visibilidad.toLowerCase().trim();
            if (v === "publico" || v === "público") req.body.visibilidad = "público";
            else if (v === "seguidores") req.body.visibilidad = "seguidores";
            else if (v === "privado") req.body.visibilidad = "privado";
        }

        let { contenido, titulo, categoria, visibilidad, media } = req.body;

        let mediaArr = [];
        if (media) {
            // Already uploaded media from frontend (e.g. via uploadMedia)
            mediaArr = Array.isArray(media) ? media : [media];
        }

        // Handle file uploads if they exist in req.files (e.g. from direct Multipart upload)
        if (req.files && req.files.length > 0) {
            const uploaded = await Promise.all(
                req.files.map(async (file) => {
                    const tipo = file.mimetype.startsWith("video/") ? "video" : "imagen";

                    const result = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                resource_type: tipo === "video" ? "video" : "image",
                                folder: "jandochat/posts"
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        );
                        uploadStream.end(file.buffer);
                    });

                    return {
                        url: result.secure_url,
                        tipo: tipo === "video" ? "video" : "imagen"
                    };
                })
            );
            mediaArr = [...mediaArr, ...uploaded];
        }

        const nuevoPost = new Post({
            usuario: req.user._id,
            contenido,
            media: mediaArr,
            titulo: titulo || "",
            categoria: categoria || "general",
            visibilidad: visibilidad || "público"
        });

        await nuevoPost.save();

        // Process Mentions Task - Await it before populating to ensure consistency
        await processMentions(contenido, req.user._id, nuevoPost._id);

        const populated = await Post.findById(nuevoPost._id).populate([
            { path: "usuario", select: "nombre fotoPerfil username" },
            { path: "mentions", select: "nombre username" }
        ]);

        // Real-time broadcast
        const io = req.app.get("io");
        if (io) {
            io.emit("nuevoPost", populated);
        }

        res.status(201).json(populated);
    } catch (error) {
        console.error("Error al crear publicación:", error);
        res.status(500).json({ msg: "Error al crear publicación" });
    }
};

exports.getVideos = async (req, res) => {
    try {
        const { categoria, q } = req.query;
        let query = {
            "media.tipo": "video",
            visibilidad: "público"
        };

        if (categoria && categoria !== "todas") {
            query.categoria = { $regex: new RegExp(`^${categoria}$`, 'i') };
        }
        if (q) query.titulo = { $regex: q, $options: "i" };

        const videos = await Post.find(query)
            .populate("usuario", "nombre fotoPerfil username")
            .populate("mentions", "nombre username")
            .sort({ createdAt: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener videos" });
    }
};

exports.getPhotos = async (req, res) => {
    try {
        const { categoria, q } = req.query;
        let query = {
            "media.tipo": "imagen",
            visibilidad: "público"
        };

        if (categoria && categoria !== "todas") {
            query.categoria = { $regex: new RegExp(`^${categoria}$`, 'i') };
        }
        if (q) query.titulo = { $regex: q, $options: "i" };

        const photos = await Post.find(query)
            .populate("usuario", "nombre fotoPerfil username")
            .populate("mentions", "nombre username")
            .sort({ createdAt: -1 });
        res.json(photos);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener galería" });
    }
};

exports.updatePostSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const { visibilidad, categoria, titulo, contenido } = req.body;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: "No encontrado" });
        if (post.usuario.toString() !== req.user._id.toString()) return res.status(401).json({ msg: "No autorizado" });

        if (visibilidad) post.visibilidad = visibilidad;
        if (categoria) post.categoria = categoria;
        if (titulo !== undefined) post.titulo = titulo;
        if (contenido !== undefined) post.contenido = contenido;

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar" });
    }
};

exports.getFeed = async (req, res) => {
    try {
        const userId = req.user._id;
        // Get user with following and blocked lists
        const user = await User.findById(userId).select("siguiendo bloqueados");
        const siguiendoIds = user.siguiendo || [];
        const bloqueadosIds = user.bloqueados || [];

        // Find users who have blocked current user
        const usersWhoBlockedMe = await User.find({ bloqueados: userId }).select("_id");
        const whoBlockedMeIds = usersWhoBlockedMe.map(u => u._id.toString());

        // Target IDs are following + self, MINUS those I blocked and those who blocked me
        const targetIds = [...siguiendoIds, userId]
            .filter(id => !bloqueadosIds.map(b => b.toString()).includes(id.toString()))
            .filter(id => !whoBlockedMeIds.includes(id.toString()));

        const posts = await Post.find({ usuario: { $in: targetIds } })
            .populate("usuario", "nombre fotoPerfil username")
            .populate("mentions", "nombre username")
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("comentarios.mentions", "nombre username")
            .populate("reacciones.usuario", "nombre fotoPerfil username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil")
            .populate("comentarios.respuestas.mentions", "nombre username")
            .populate({
                path: "sharedFrom",
                populate: [
                    { path: "usuario", select: "nombre fotoPerfil username" },
                    { path: "mentions", select: "nombre username" }
                ]
            })
            .sort({ createdAt: -1 });

        // Fetch active ads (only those not expired)
        const activeAds = await Ad.find({
            status: "activo",
            $or: [{ expiraEn: null }, { expiraEn: { $gt: new Date() } }]
        }).sort({ createdAt: -1 });

        // Intersperse ads: Every 5 posts, insert an ad
        let feedWithAds = [];
        let adIndex = 0;

        posts.forEach((post, index) => {
            feedWithAds.push({ ...post.toObject(), type: "post" });
            if ((index + 1) % 5 === 0 && activeAds.length > 0) {
                const ad = activeAds[adIndex % activeAds.length];
                feedWithAds.push({ ...ad.toObject(), type: "ad" });
                adIndex++;
            }
        });

        res.json(feedWithAds);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener feed" });
    }
};

exports.reaccionarPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.body;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: "Post no encontrado" });

        const index = post.reacciones.findIndex((r) => r.usuario.toString() === req.user._id.toString());

        if (index !== -1) {
            if (post.reacciones[index].tipo === tipo) {
                post.reacciones.splice(index, 1);
            } else {
                post.reacciones[index].tipo = tipo;
                enviarNotiSocial(post.usuario, req.user._id, "reaccion", `@${req.user.nombre} ha reaccionado a tu publicación`, id);
            }
        } else {
            post.reacciones.push({ usuario: req.user._id, tipo });
            enviarNotiSocial(post.usuario, req.user._id, "reaccion", `@${req.user.nombre} ha reaccionado a tu publicación`, id);
        }

        await post.save();
        const populatedPost = await Post.findById(id).populate("reacciones.usuario", "nombre fotoPerfil username");

        const io = req.app.get("io");
        if (io) io.emit("actualizarReacciones", { postId: id, reacciones: populatedPost.reacciones });

        res.json(populatedPost.reacciones);
    } catch (error) {
        res.status(500).json({ msg: "Error al reaccionar" });
    }
};

exports.comentarPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { texto } = req.body;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: "Post no encontrado" });

        let mediaArr = [];
        if (req.files && req.files.length > 0) {
            mediaArr = await Promise.all(req.files.map(async (f) => {
                const b64 = Buffer.from(f.buffer).toString("base64");
                const dataURI = "data:" + f.mimetype + ";base64," + b64;
                
                let resCloud;
                if (f.mimetype.startsWith("audio/")) {
                    resCloud = await cloudinary.uploader.upload(dataURI, { resource_type: "raw", folder: "jandochat/comments" });
                    return { url: resCloud.secure_url, tipo: "audio" };
                } else if (f.mimetype.startsWith("video/")) {
                    resCloud = await cloudinary.uploader.upload(dataURI, { resource_type: "video", folder: "jandochat/comments" });
                    return { url: resCloud.secure_url, tipo: "video" };
                } else {
                    resCloud = await cloudinary.uploader.upload(dataURI, { folder: "jandochat/comments" });
                    return { url: resCloud.secure_url, tipo: "imagen" };
                }
            }));
        }

        const nuevoComentario = {
            usuario: req.user._id,
            texto,
            media: mediaArr
        };
        post.comentarios.push(nuevoComentario);
        await post.save();

        const commentIdx = post.comentarios.length - 1;
        const savedComment = post.comentarios[commentIdx];

        await processMentions(texto, req.user._id, id, savedComment._id);
        enviarNotiSocial(post.usuario, req.user._id, "comentario", `@${req.user.nombre} comentó tu publicación`, id, savedComment._id);

        const populatedPost = await Post.findById(id)
            .populate("usuario", "nombre fotoPerfil username")
            .populate("mentions", "nombre username")
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("comentarios.mentions", "nombre username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil")
            .populate("comentarios.respuestas.mentions", "nombre username");

        const io = req.app.get("io");
        if (io) io.emit("actualizarComentarios", { postId: id, comentarios: populatedPost.comentarios });

        res.json(populatedPost.comentarios);
    } catch (error) {
        res.status(500).json({ msg: "Error al comentar" });
    }
};

exports.responderComentario = async (req, res) => {
    try {
        const { id, comentarioId } = req.params;
        const { texto } = req.body;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: "Post no encontrado" });

        const comentario = post.comentarios.id(comentarioId);
        if (!comentario) return res.status(404).json({ msg: "Comentario no encontrado" });

        let mediaArr = [];
        if (req.files && req.files.length > 0) {
            mediaArr = await Promise.all(req.files.map(async (f) => {
                const b64 = Buffer.from(f.buffer).toString("base64");
                const dataURI = "data:" + f.mimetype + ";base64," + b64;
                
                let resCloud;
                if (f.mimetype.startsWith("audio/")) {
                    resCloud = await cloudinary.uploader.upload(dataURI, { resource_type: "raw", folder: "jandochat/comments" });
                    return { url: resCloud.secure_url, tipo: "audio" };
                } else if (f.mimetype.startsWith("video/")) {
                    resCloud = await cloudinary.uploader.upload(dataURI, { resource_type: "video", folder: "jandochat/comments" });
                    return { url: resCloud.secure_url, tipo: "video" };
                } else {
                    resCloud = await cloudinary.uploader.upload(dataURI, { folder: "jandochat/comments" });
                    return { url: resCloud.secure_url, tipo: "imagen" };
                }
            }));
        }

        const nuevaRespuesta = { usuario: req.user._id, texto, media: mediaArr };
        comentario.respuestas.push(nuevaRespuesta);
        await post.save();

        const replyIdx = comentario.respuestas.length - 1;
        const savedReply = comentario.respuestas[replyIdx];

        await processMentions(texto, req.user._id, id, comentarioId, savedReply._id);
        enviarNotiSocial(comentario.usuario, req.user._id, "respuesta", `@${req.user.nombre} respondió tu comentario`, id, comentarioId);

        const populatedPost = await Post.findById(id)
            .populate("usuario", "nombre fotoPerfil username")
            .populate("mentions", "nombre username")
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("comentarios.mentions", "nombre username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil")
            .populate("comentarios.respuestas.mentions", "nombre username");

        const io = req.app.get("io");
        if (io) io.emit("actualizarComentarios", { postId: id, comentarios: populatedPost.comentarios });

        res.json(populatedPost.comentarios);
    } catch (error) {
        res.status(500).json({ msg: "Error al responder" });
    }
};

exports.editPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { contenido } = req.body;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: "Post no encontrado" });

        if (post.usuario.toString() !== req.user._id.toString()) {
            return res.status(401).json({ msg: "No autorizado para editar este post" });
        }

        post.contenido = contenido;
        await post.save();

        await processMentions(contenido, req.user._id, id);

        const updated = await Post.findById(id)
            .populate("usuario", "nombre fotoPerfil username")
            .populate("mentions", "nombre username");

        const io = req.app.get("io");
        if (io) io.emit("actualizarPost", updated);

        res.json(updated);
    } catch (error) {
        res.status(500).json({ msg: "Error al editar post" });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: "Post no encontrado" });

        if (post.usuario.toString() !== req.user._id.toString()) {
            return res.status(401).json({ msg: "No autorizado para eliminar este post" });
        }

        await Post.findByIdAndDelete(id);

        const io = req.app.get("io");
        if (io) {
            io.emit("eliminarPost", id);
        }

        res.json({ msg: "Post eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar post" });
    }
};

exports.compartirPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { contenidoCompartir } = req.body;
        const originalPost = await Post.findById(id);
        if (!originalPost) return res.status(404).json({ msg: "Post original no encontrado" });

        const nuevoPost = new Post({
            usuario: req.user._id,
            contenido: originalPost.contenido,
            media: originalPost.media,
            isShared: true,
            sharedFrom: id,
            contenidoCompartir: contenidoCompartir || ""
        });

        await nuevoPost.save();

        // Process mentions in the shared content
        await processMentions(contenidoCompartir, req.user._id, nuevoPost._id);

        enviarNotiSocial(originalPost.usuario, req.user._id, "compartir", `@${req.user.nombre} compartió tu publicación`);

        const populated = await Post.findById(nuevoPost._id).populate([
            { path: "usuario", select: "nombre fotoPerfil username" },
            {
                path: "sharedFrom",
                populate: { path: "usuario", select: "nombre fotoPerfil username" }
            },
            { path: "mentions", select: "nombre username" }
        ]);
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ msg: "Error al compartir" });
    }
};

exports.editarComentario = async (req, res) => {
    try {
        const { postId, comentarioId } = req.params;
        const { texto } = req.body;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ msg: "Post no encontrado" });

        const comentario = post.comentarios.id(comentarioId);
        if (!comentario) return res.status(404).json({ msg: "Comentario no encontrado" });

        if (comentario.usuario.toString() !== req.user._id.toString()) {
            return res.status(401).json({ msg: "No autorizado" });
        }

        comentario.texto = texto;
        
        // Refresh mentions for the comment
        await processMentions(texto, req.user._id, postId, comentarioId);
        
        await post.save();
        
        const io = req.app.get("io");
        if (io) io.emit("actualizarComentarios", { postId, comentarios: post.comentarios });

        res.json(post.comentarios);
    } catch (error) {
        res.status(500).json({ msg: "Error al editar comentario" });
    }
};

exports.eliminarComentario = async (req, res) => {
    try {
        const { postId, comentarioId } = req.params;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ msg: "Post no encontrado" });

        const comentario = post.comentarios.id(comentarioId);
        if (!comentario) return res.status(404).json({ msg: "Comentario no encontrado" });

        const esDuenoComentario = comentario.usuario.toString() === req.user._id.toString();
        const esDuenoPost = post.usuario.toString() === req.user._id.toString();

        if (!esDuenoComentario && !esDuenoPost) {
            return res.status(401).json({ msg: "No autorizado" });
        }

        post.comentarios.pull(comentarioId);
        await post.save();
        
        const io = req.app.get("io");
        if (io) io.emit("actualizarComentarios", { postId, comentarios: post.comentarios });

        res.json(post.comentarios);
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar comentario" });
    }
};

exports.getPostsByMention = async (req, res) => {
    try {
        const { id } = req.params;
        const posts = await Post.find({ mentions: id })
            .populate("usuario", "nombre fotoPerfil username")
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener menciones" });
    }
};

exports.getPostsByUser = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id;
        const isOwner = currentUserId.toString() === id.toString();

        let query = { usuario: id };

        if (!isOwner) {
            const targetUser = await User.findById(id).select("seguidores bloqueados");
            if (!targetUser) return res.status(404).json({ msg: "Usuario no encontrado" });

            if (targetUser.bloqueados.includes(currentUserId)) {
                return res.json([]);
            }

            const following = targetUser.seguidores.some(s => s.toString() === currentUserId.toString());

            if (following) {
                query.visibilidad = { $in: ["público", "seguidores"] };
            } else {
                query.visibilidad = "público";
            }
        }

        const posts = await Post.find(query)
            .populate("usuario", "nombre fotoPerfil username")
            .populate("mentions", "nombre username")
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("comentarios.mentions", "nombre username")
            .populate("reacciones.usuario", "nombre fotoPerfil username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil")
            .populate("comentarios.respuestas.mentions", "nombre username")
            .populate({
                path: "sharedFrom",
                populate: [
                    { path: "usuario", select: "nombre fotoPerfil username" },
                    { path: "mentions", select: "nombre username" }
                ]
            })
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener posts del usuario" });
    }
};

exports.getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        // Increment viewership on each load
        const post = await Post.findByIdAndUpdate(id, { $inc: { vistas: 1 } }, { new: true })
            .populate("usuario", "nombre fotoPerfil username")
            .populate("mentions", "nombre username")
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("comentarios.mentions", "nombre username")
            .populate("reacciones.usuario", "nombre fotoPerfil username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil")
            .populate("comentarios.respuestas.mentions", "nombre username")
            .populate({
                path: "sharedFrom",
                populate: [
                    { path: "usuario", select: "nombre fotoPerfil username" },
                    { path: "mentions", select: "nombre username" }
                ]
            });

        if (!post) return res.status(404).json({ msg: "Publicación no encontrada" });
        res.json(post);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener la publicación" });
    }
};

exports.incrementVistas = async (req, res) => {
    try {
        const { id } = req.params;
        await Post.findByIdAndUpdate(id, { $inc: { vistas: 1 } });
        res.json({ msg: "Vista registrada" });
    } catch (error) {
        res.status(500).json({ msg: "Error al registrar vista" });
    }
};

exports.deleteAllUserPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        await Post.deleteMany({ usuario: userId });
        res.json({ msg: "Todas tus publicaciones han sido eliminadas" });
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar publicaciones" });
    }
};

exports.bookmarkPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

        const index = user.guardados.indexOf(id);
        if (index !== -1) {
            user.guardados.splice(index, 1);
        } else {
            user.guardados.push(id);
        }

        await user.save();
        res.json({ msg: index !== -1 ? "Quitado de favoritos" : "Guardado en favoritos", guardados: user.guardados });
    } catch (error) {
        res.status(500).json({ msg: "Error al guardar publicación" });
    }
};

exports.getBookmarkedPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).populate({
            path: "guardados",
            populate: [
                { path: "usuario", select: "nombre fotoPerfil username" },
                { path: "mentions", select: "nombre username" },
                { path: "comentarios.usuario", select: "nombre fotoPerfil username" },
                { path: "comentarios.mentions", select: "nombre username" },
                { path: "reacciones.usuario", select: "nombre fotoPerfil username" },
                { path: "comentarios.respuestas.usuario", select: "nombre fotoPerfil" },
                { path: "comentarios.respuestas.mentions", select: "nombre username" },
                {
                    path: "sharedFrom",
                    populate: [
                        { path: "usuario", select: "nombre fotoPerfil username" },
                        { path: "mentions", select: "nombre username" }
                    ]
                }
            ]
        });

        if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });
        res.json(user.guardados.reverse());
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener favoritos" });
    }
};

exports.reportPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo, detalles } = req.body;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ msg: "Post no hallado" });

        const nuevoReporte = new Report({
            emisor: req.user._id,
            post: id,
            usuarioReportado: post.usuario,
            motivo,
            detalles: detalles || ""
        });

        await nuevoReporte.save();
        res.status(201).json({ msg: "Denuncia enviada al búnker central" });
    } catch (error) {
        res.status(500).json({ msg: "Fallo en la conexión del reporte" });
    }
};
