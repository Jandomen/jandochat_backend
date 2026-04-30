const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    contenido: {
        type: String,
        required: false,
    },
    titulo: {
        type: String,
        default: "",
    },
    categoria: {
        type: String,
        default: "general",
    },
    visibilidad: {
        type: String,
        enum: ["público", "seguidores", "privado"],
        default: "público"
    },
    media: [
        {
            url: String,
            tipo: { type: String, enum: ["imagen", "video"] }
        }
    ],
    reacciones: [
        {
            usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            tipo: {
                type: String,
                enum: ["brutal", "acuerdo", "blown", "mirando", "inteligente", "apoyo", "colaboro", "respeto"],
                default: "brutal"
            },
        },
    ],
    comentarios: [
        {
            usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            texto: { type: String, required: false },
            media: [
                {
                    url: String,
                    tipo: { type: String, enum: ["imagen", "video", "audio"] }
                }
            ],
            mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            respuestas: [
                {
                    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                    texto: { type: String, required: false },
                    media: [
                        {
                            url: String,
                            tipo: { type: String, enum: ["imagen", "video", "audio"] }
                        }
                    ],
                    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
                    createdAt: { type: Date, default: Date.now },
                }
            ],
            createdAt: { type: Date, default: Date.now },
        },
    ],
    sharedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: null,
    },
    isShared: {
        type: Boolean,
        default: false,
    },
    contenidoCompartir: {
        type: String,
        default: "",
    },
    vistas: {
        type: Number,
        default: 0,
    },
    mentions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Post", postSchema);
