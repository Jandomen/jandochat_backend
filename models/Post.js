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
            texto: { type: String, required: true },
            respuestas: [
                {
                    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                    texto: { type: String, required: true },
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
    contenidoCompartir: { // El comentario que el usuario agrega al compartir
        type: String,
        default: "",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Post", postSchema);
