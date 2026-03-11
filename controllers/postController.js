const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const socketNotification = require("../sockets/socketNotification");

const enviarNotiSocial = async (receptor, emisor, tipo, mensaje, publicacionId = null, comentarioId = null) => {
    if (receptor.toString() === emisor.toString()) return;
    try {
        // Check for blocks
        const userReceptor = await User.findById(receptor).select("bloqueados");
        const userEmisor = await User.findById(emisor).select("bloqueados");

        if (userReceptor.bloqueados.includes(emisor) || userEmisor.bloqueados.includes(receptor)) {
            return;
        }

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

exports.createPost = async (req, res) => {
    try {
        const { contenido, media } = req.body; // media must be array of objects {url, tipo}
        const nuevoPost = new Post({
            usuario: req.user._id,
            contenido,
            media: media || [],
        });
        await nuevoPost.save();
        const populated = await nuevoPost.populate("usuario", "nombre fotoPerfil");
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ msg: "Error al crear publicación" });
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
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("reacciones.usuario", "nombre fotoPerfil username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil")
            .populate({
                path: "sharedFrom",
                populate: { path: "usuario", select: "nombre fotoPerfil username" }
            })
            .sort({ createdAt: -1 });

        res.json(posts);
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

        const nuevoComentario = {
            usuario: req.user._id,
            texto,
        };
        post.comentarios.push(nuevoComentario);
        await post.save();

        enviarNotiSocial(post.usuario, req.user._id, "comentario", `@${req.user.nombre} comentou tu publicación`, id);

        const populatedPost = await Post.findById(id)
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil");
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

        comentario.respuestas.push({
            usuario: req.user._id,
            texto,
        });

        await post.save();

        enviarNotiSocial(comentario.usuario, req.user._id, "respuesta", `@${req.user.nombre} respondió tu comentario`, id, comentarioId);

        const populatedPost = await Post.findById(id)
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil");
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
        res.json(post);
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
        res.json({ msg: "Post eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar post" });
    }
};

exports.compartirPost = async (req, res) => {
    try {
        const { id } = req.params; // ID del post original
        const { contenidoCompartir } = req.body;
        const originalPost = await Post.findById(id);
        if (!originalPost) return res.status(404).json({ msg: "Post original no encontrado" });

        const nuevoPost = new Post({
            usuario: req.user._id,
            contenido: originalPost.contenido, // Copiamos el contenido original o lo dejamos dinámico? Facebook suele mostrar el original.
            media: originalPost.media,
            isShared: true,
            sharedFrom: id,
            contenidoCompartir: contenidoCompartir || ""
        });

        await nuevoPost.save();

        enviarNotiSocial(originalPost.usuario, req.user._id, "compartir", `@${req.user.nombre} compartió tu publicación`);

        const populated = await nuevoPost.populate([
            { path: "usuario", select: "nombre fotoPerfil username" },
            {
                path: "sharedFrom",
                populate: { path: "usuario", select: "nombre fotoPerfil username" }
            }
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
        await post.save();
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

        // El dueño del comentario o el dueño del post pueden borrarlo
        const esDuenoComentario = comentario.usuario.toString() === req.user._id.toString();
        const esDuenoPost = post.usuario.toString() === req.user._id.toString();

        if (!esDuenoComentario && !esDuenoPost) {
            return res.status(401).json({ msg: "No autorizado" });
        }

        post.comentarios.pull(comentarioId);
        await post.save();
        res.json(post.comentarios);
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar comentario" });
    }
};

exports.getPostsByUser = async (req, res) => {
    try {
        const { id } = req.params;
        const posts = await Post.find({ usuario: id })
            .populate("usuario", "nombre fotoPerfil username")
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("reacciones.usuario", "nombre fotoPerfil username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil")
            .populate({
                path: "sharedFrom",
                populate: { path: "usuario", select: "nombre fotoPerfil username" }
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
        const post = await Post.findById(id)
            .populate("usuario", "nombre fotoPerfil username")
            .populate("comentarios.usuario", "nombre fotoPerfil username")
            .populate("reacciones.usuario", "nombre fotoPerfil username")
            .populate("comentarios.respuestas.usuario", "nombre fotoPerfil");

        if (!post) return res.status(404).json({ msg: "Publicación no encontrada" });
        res.json(post);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener la publicación" });
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
