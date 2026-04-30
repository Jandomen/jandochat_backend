const Story = require("../models/Story");
const User = require("../models/User");

// Archive expired stories (utility - called before queries)
const archivarExpiradas = async (userId) => {
    try {
        await Story.updateMany(
            { usuario: userId, archived: false, expiresAt: { $lte: new Date() } },
            { $set: { archived: true } }
        );
    } catch (err) {
        console.error("Error archivando historias expiradas:", err);
    }
};

// CREATE STORY
exports.crearStory = async (req, res) => {
    try {
        const { tipo, url, thumbnail, duracion, trimStart, trimEnd, texto, textoPosition, emoji, metadata } = req.body;

        if (!url || !tipo) {
            return res.status(400).json({ msg: "URL y tipo son obligatorios" });
        }

        const videoDuration = duracion ? parseFloat(duracion) : 30;

        if (tipo === "video" && videoDuration > 30) {
            return res.status(400).json({ msg: "La duración máxima es de 30 segundos" });
        }

        const storyDuration = tipo === "imagen" ? 5 : Math.min(videoDuration || 30, 30);

        const story = new Story({
            usuario: req.user._id,
            tipo,
            url,
            thumbnail: thumbnail || "",
            duracion: storyDuration,
            trimStart: trimStart || 0,
            trimEnd: trimEnd || storyDuration,
            texto: texto || "",
            textoPosition: textoPosition || { x: 50, y: 50 },
            emoji: emoji || "",
            metadata: metadata || {},
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
        });

        await story.save();
        const populated = await story.populate("usuario", "nombre fotoPerfil username");

        // Real-time broadcast
        const io = req.app.get("io");
        if (io) {
            io.emit("nuevaHistoria", populated);
        }

        res.status(201).json(populated);
    } catch (error) {
        console.error("Error al crear story:", error);
        res.status(500).json({ msg: "Error al crear historia" });
    }
};

// GET FEED STORIES (from followed users + own)
exports.getStoriesFeed = async (req, res) => {
    try {
        const userId = req.user._id;

        // Archive expired stories for current user
        await archivarExpiradas(userId);

        const user = await User.findById(userId).select("siguiendo bloqueados");
        const siguiendoIds = user.siguiendo || [];
        const bloqueadosIds = user.bloqueados || [];

        // Find users who have blocked current user
        const usersWhoBlockedMe = await User.find({ bloqueados: userId }).select("_id");
        const whoBlockedMeIds = usersWhoBlockedMe.map(u => u._id.toString());

        // Filter targetIds excluding blocks
        const targetIds = [...siguiendoIds, userId]
            .filter(id => !bloqueadosIds.map(b => b.toString()).includes(id.toString()))
            .filter(id => !whoBlockedMeIds.includes(id.toString()));

        const stories = await Story.find({
            usuario: { $in: targetIds },
            archived: false,
            expiresAt: { $gt: new Date() },
        })
            .populate("usuario", "nombre fotoPerfil username")
            .populate("viewers.usuario", "nombre fotoPerfil")
            .sort({ createdAt: -1 });

        // Group stories by user
        const grouped = {};
        stories.forEach((story) => {
            const uid = story.usuario._id.toString();
            if (!grouped[uid]) {
                grouped[uid] = {
                    usuario: story.usuario,
                    stories: [],
                    hasNew: false,
                };
            }
            grouped[uid].stories.push(story);
            // Check if current user has viewed this story
            const viewed = story.viewers.some(
                (v) => v.usuario?._id?.toString() === userId.toString()
            );
            if (!viewed) grouped[uid].hasNew = true;
        });

        // Convert to array and sort (own stories first, then unviewed, then viewed)
        const result = Object.values(grouped).sort((a, b) => {
            const aIsOwn = a.usuario._id.toString() === userId.toString();
            const bIsOwn = b.usuario._id.toString() === userId.toString();
            if (aIsOwn && !bIsOwn) return -1;
            if (!aIsOwn && bIsOwn) return 1;
            if (a.hasNew && !b.hasNew) return -1;
            if (!a.hasNew && b.hasNew) return 1;
            return 0;
        });

        res.json(result);
    } catch (error) {
        console.error("Error al obtener stories feed:", error);
        res.status(500).json({ msg: "Error al obtener historias" });
    }
};

// GET MY ACTIVE STORIES
exports.getMisStories = async (req, res) => {
    try {
        await archivarExpiradas(req.user._id);

        const stories = await Story.find({
            usuario: req.user._id,
            archived: false,
            expiresAt: { $gt: new Date() },
        })
            .populate("viewers.usuario", "nombre fotoPerfil")
            .sort({ createdAt: -1 });

        res.json(stories);
    } catch (error) {
        console.error("Error al obtener mis stories:", error);
        res.status(500).json({ msg: "Error al obtener tus historias" });
    }
};

// GET ARCHIVED STORIES
exports.getArchivedStories = async (req, res) => {
    try {
        await archivarExpiradas(req.user._id);

        const stories = await Story.find({
            usuario: req.user._id,
            archived: true,
        })
            .sort({ createdAt: -1 });

        res.json(stories);
    } catch (error) {
        console.error("Error al obtener archivo de stories:", error);
        res.status(500).json({ msg: "Error al obtener archivo" });
    }
};

// GET SINGLE STORY
exports.getStoryById = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id)
            .populate("usuario", "nombre fotoPerfil username")
            .populate("viewers.usuario", "nombre fotoPerfil");

        if (!story) return res.status(404).json({ msg: "Historia no encontrada" });

        res.json(story);
    } catch (error) {
        console.error("Error al obtener story:", error);
        res.status(500).json({ msg: "Error al obtener historia" });
    }
};

// MARK STORY AS VIEWED
exports.viewStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ msg: "Historia no encontrada" });

        // Don't add if already viewed or if its own story
        const alreadyViewed = story.viewers.some(
            (v) => v.usuario.toString() === req.user._id.toString()
        );

        if (!alreadyViewed && story.usuario.toString() !== req.user._id.toString()) {
            story.viewers.push({ usuario: req.user._id });
            await story.save();
        }

        res.json({ msg: "Vista registrada" });
    } catch (error) {
        console.error("Error al marcar vista:", error);
        res.status(500).json({ msg: "Error al registrar vista" });
    }
};

// DELETE STORY (owner only)
exports.deleteStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ msg: "Historia no encontrada" });

        if (story.usuario.toString() !== req.user._id.toString()) {
            return res.status(403).json({ msg: "No autorizado" });
        }

        await story.deleteOne();

        // Real-time broadcast
        const io = req.app.get("io");
        if (io) {
            io.emit("eliminarHistoria", id);
        }

        res.json({ msg: "Historia eliminada" });
    } catch (error) {
        console.error("Error al eliminar story:", error);
        res.status(500).json({ msg: "Error al eliminar historia" });
    }
};

// DELETE ARCHIVED STORY PERMANENTLY
exports.deleteArchivedStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ msg: "Historia no encontrada" });

        if (story.usuario.toString() !== req.user._id.toString()) {
            return res.status(403).json({ msg: "No autorizado" });
        }

        if (!story.archived) {
            return res.status(400).json({ msg: "Solo se pueden eliminar historias archivadas" });
        }

        await story.deleteOne();
        res.json({ msg: "Historia eliminada permanentemente" });
    } catch (error) {
        console.error("Error al eliminar story archivada:", error);
        res.status(500).json({ msg: "Error al eliminar" });
    }
};

// GET STORIES BY USER (for viewing other profiles)
exports.getStoriesByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const stories = await Story.find({
            usuario: userId,
            archived: false,
            expiresAt: { $gt: new Date() },
        })
            .populate("usuario", "nombre fotoPerfil username")
            .sort({ createdAt: -1 });

        res.json(stories);
    } catch (error) {
        console.error("Error al obtener stories del usuario:", error);
        res.status(500).json({ msg: "Error al obtener historias del usuario" });
    }
};

// DELETE ALL MY STORIES (Active & Archived)
exports.deleteAllMyStories = async (req, res) => {
    try {
        await Story.deleteMany({ usuario: req.user._id });
        res.json({ msg: "Todas tus historias han sido eliminadas" });
    } catch (error) {
        console.error("Error al eliminar todas las historias:", error);
        res.status(500).json({ msg: "Error al eliminar" });
    }
};
