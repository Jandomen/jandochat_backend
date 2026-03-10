const Status = require("../models/Status");
const User = require("../models/User");

exports.getRecentStatuses = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select("siguiendo");
        const siguiendoIds = user.siguiendo || [];
        const targetIds = [...siguiendoIds, userId];

        const statuses = await Status.find({
            usuario: { $in: targetIds }
        })
            .populate("usuario", "nombre fotoPerfil")
            .sort({ createdAt: -1 });

        res.json(statuses);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener estados" });
    }
};

exports.createStatus = async (req, res) => {
    try {
        const { contenido, tipo, mediaUrl, colorFondo, duracionHoras } = req.body;

        // Calcular tiempo de expiración
        const horas = parseInt(duracionHoras) || 24;
        const expiresAt = new Date(Date.now() + horas * 60 * 60 * 1000);

        const newStatus = new Status({
            usuario: req.user._id,
            contenido,
            tipo: tipo || "texto",
            mediaUrl,
            colorFondo: colorFondo || "bg-red-600",
            expiresAt
        });
        await newStatus.save();

        const populated = await Status.findById(newStatus._id).populate("usuario", "nombre fotoPerfil");
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: "Error al crear estado" });
    }
};

exports.deleteStatus = async (req, res) => {
    try {
        const status = await Status.findById(req.params.id);
        if (!status) return res.status(404).json({ message: "Estado no encontrado" });

        if (status.usuario.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "No autorizado" });
        }

        await status.deleteOne();
        res.json({ message: "Estado eliminado" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar estado" });
    }
};

exports.vistoPor = async (req, res) => {
    try {
        const status = await Status.findById(req.params.id);
        if (!status) return res.status(404).json({ message: "Estado no encontrado" });

        // No registrar si es el propio usuario
        if (status.usuario.toString() === req.user._id.toString()) {
            return res.json(status);
        }

        // Evitar duplicados
        const yaVisto = status.vistas.some(v => v.usuario.toString() === req.user._id.toString());
        if (!yaVisto) {
            status.vistas.push({ usuario: req.user._id });
            await status.save();
        }

        res.json(status);
    } catch (error) {
        res.status(500).json({ message: "Error al registrar vista" });
    }
};

exports.getVistas = async (req, res) => {
    try {
        const status = await Status.findById(req.params.id).populate("vistas.usuario", "nombre fotoPerfil");
        if (!status) return res.status(404).json({ message: "Estado no encontrado" });

        if (status.usuario.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "No autorizado para ver estadísticas" });
        }

        res.json(status.vistas);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener vistas" });
    }
};
