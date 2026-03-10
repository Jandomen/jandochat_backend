const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    contenido: {
        type: String,
    },
    tipo: {
        type: String,
        enum: ["texto", "imagen", "video"],
        default: "texto",
    },
    mediaUrl: {
        type: String, // URL for image or video
    },
    colorFondo: {
        type: String,
        default: "bg-red-600",
    },
    vistas: [
        {
            usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            vistoEn: { type: Date, default: Date.now }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
});

module.exports = mongoose.model("Status", statusSchema);
