const Admin = require("../models/Admin");
const User = require("../models/User");
const Post = require("../models/Post");
const Report = require("../models/Report");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Ad = require("../models/Ad");

// Login for Admin (Independent entrance)
exports.loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(401).json({ msg: "Acceso denegado: Credenciales no registradas" });

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) return res.status(400).json({ msg: "Contraseña incorrecta" });

        const token = jwt.sign({ id: admin._id, rol: "admin" }, process.env.JWT_SECRET, { expiresIn: "24h" });

        // Audit log
        admin.lastLogin = Date.now();
        await admin.save();

        res.json({ token, admin: { id: admin._id, nombre: admin.nombre, email: admin.email, rol: admin.rol } });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error del servidor");
    }
};

// Advanced Dashboard Metrics (Platinum Aggregation)
exports.getAdminMetrics = async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const [userCount, postCount, activeCount] = await Promise.all([
            User.countDocuments(),
            Post.countDocuments(),
            User.countDocuments({ lastActive: { $gt: oneHourAgo } })
        ]);

        const topPosts = await Post.aggregate([
            {
                $project: {
                    usuario: 1,
                    titulo: 1,
                    contenido: 1,
                    media: 1,
                    vistas: 1,
                    reacciones: 1,
                    comentarios: 1,
                    engagement: {
                        $add: [
                            { $ifNull: ["$vistas", 0] },
                            { $size: { $ifNull: ["$reacciones", []] } },
                            { $size: { $ifNull: ["$comentarios", []] } }
                        ]
                    }
                }
            },
            { $sort: { engagement: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "users",
                    localField: "usuario",
                    foreignField: "_id",
                    as: "usuario"
                }
            },
            { $unwind: "$usuario" }
        ]);

        const recentActive = await User.find({ lastActive: { $gt: oneHourAgo } })
            .select("nombre fotoPerfil status lastActive")
            .sort({ lastActive: -1 })
            .limit(10);

        const stats = {
            users: userCount,
            posts: postCount,
            active: activeCount,
            videos: await Post.countDocuments({ "media.tipo": "video" }),
            photos: await Post.countDocuments({ "media.tipo": "imagen" }),
            ads: await Ad.countDocuments()
        };

        res.json({ stats, ranking: topPosts, recentActive });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error interno del búnker");
    }
};


exports.searchById = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ msg: "Query required" });

    try {
        if (mongoose.isValidObjectId(q)) {
            const [user, post] = await Promise.all([
                User.findById(q).select("-password"),
                Post.findById(q).populate("usuario", "nombre fotoPerfil email")
            ]);
            if (user) return res.json({ type: "usuario", data: user });
            if (post) return res.json({ type: "publicacion", data: post });
        } else {
            const users = await User.find({
                $or: [
                    { nombre: { $regex: q, $options: "i" } },
                    { email: { $regex: q, $options: "i" } }
                ]
            }).select("-password").limit(10);

            if (users.length > 0) return res.json({ type: "usuarios_multi", data: users });
        }

        res.status(404).json({ msg: "Objeto no hallado en JandoChat" });
    } catch (err) {
        res.status(500).json({ msg: "Error en el buscador central" });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ msg: "Usuario no hallado" });

        await User.findByIdAndDelete(id);

        await Post.deleteMany({ usuario: id });

        res.json({ msg: "Usuario eliminado de los anales de JandoChat" });
    } catch (err) {
        res.status(500).json({ msg: "Fallo en la purga del usuario" });
    }
};

exports.suspendUser = async (req, res) => {
    const { id } = req.params;
    const { motivo, hasta, status } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ msg: "Usuario no hallado" });

        user.status = status || "suspendido";
        user.suspension = {
            isSuspended: (status !== "activo"),
            motivo: motivo || "",
            hasta: hasta || null
        };

        await user.save();
        res.json({ msg: "Acción ejecutada correctamente", status: user.status });
    } catch (err) {
        res.status(500).json({ msg: "Fallo en la ejecución de la sanción" });
    }
};

exports.getReports = async (req, res) => {
    try {
        const reports = await Report.find()
            .populate("emisor", "nombre fotoPerfil")
            .populate({
                path: "post",
                populate: { path: "usuario", select: "nombre fotoPerfil" }
            })
            .populate("usuarioReportado", "nombre fotoPerfil")
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (err) {
        res.status(500).json({ msg: "Error al captar búnker de reportes" });
    }
};


exports.handleReport = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const report = await Report.findByIdAndUpdate(id, { status }, { new: true });
        res.json(report);
    } catch (err) {
        res.status(500).json({ msg: "Error al actualizar reporte" });
    }
};


exports.createAd = async (req, res) => {
    const { empresa, contenido, media, permitirComentarios, fotoPerfil, status, expiraEn, webUrl } = req.body;
    try {
        const newAd = new Ad({
            empresa,
            contenido,
            media: media || [],
            permitirComentarios: permitirComentarios !== undefined ? permitirComentarios : true,
            fotoPerfil: fotoPerfil || "",
            status: status || "activo",
            expiraEn: expiraEn || null,
            webUrl: webUrl || ""
        });
        await newAd.save();
        res.status(201).json(newAd);
    } catch (err) {
        res.status(500).json({ msg: "Error al crear anuncio maestro" });
    }
};


exports.updateAd = async (req, res) => {
    const { id } = req.params;
    const { empresa, contenido, media, permitirComentarios, fotoPerfil, expiraEn, webUrl } = req.body;
    try {
        const ad = await Ad.findByIdAndUpdate(id, {
            empresa, contenido, media, permitirComentarios, fotoPerfil, expiraEn, webUrl
        }, { new: true });
        res.json(ad);
    } catch (err) {
        res.status(500).json({ msg: "Fallo al actualizar campaña" });
    }
};


exports.getAllAds = async (req, res) => {
    try {
        const ads = await Ad.find().sort({ createdAt: -1 });
        res.json(ads);
    } catch (err) {
        res.status(500).json({ msg: "Error al captar búnker de anuncios" });
    }
};


exports.toggleAdStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const ad = await Ad.findByIdAndUpdate(id, { status }, { new: true });
        res.json(ad);
    } catch (err) {
        res.status(500).json({ msg: "Error al cambiar estado del anuncio" });
    }
};


exports.deleteAd = async (req, res) => {
    const { id } = req.params;
    try {
        await Ad.findByIdAndDelete(id);
        res.json({ msg: "Anuncio depurado" });
    } catch (err) {
        res.status(500).json({ msg: "Fallo al purgar anuncio" });
    }
};

exports.incrementAdClicks = async (req, res) => {
    const { id } = req.params;
    try {
        await Ad.findByIdAndUpdate(id, { $inc: { clics: 1 } });
        res.json({ msg: "Clic registrado" });
    } catch (err) {
        res.status(500).json({ msg: "Error al registrar clic" });
    }
};


exports.deletePostAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        await Post.findByIdAndDelete(id);
        res.json({ msg: "Post purgado correctamente" });
    } catch (err) {
        res.status(500).json({ msg: "Fallo al purgar el post" });
    }
};
