const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    tipo: {
        type: String,
        enum: ["imagen", "video"],
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    thumbnail: {
        type: String,
        default: "",
    },
    duracion: {
        type: Number,
        max: 30,
        default: 5, // 5s for images, up to 30s for video
    },
    trimStart: {
        type: Number,
        default: 0,
    },
    trimEnd: {
        type: Number,
        default: 30,
    },
    texto: {
        type: String,
        default: "",
        maxlength: 200,
    },
    textoPosition: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 50 },
    },
    emoji: {
        type: String,
        default: "",
    },
    metadata: {
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        size: { type: Number, default: 0 },
        mimeType: { type: String, default: "" },
    },
    archived: {
        type: Boolean,
        default: false,
    },
    viewers: [
        {
            usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            viewedAt: { type: Date, default: Date.now },
        },
    ],
    expiresAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

// Index for efficient queries
storySchema.index({ usuario: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });
storySchema.index({ archived: 1, usuario: 1 });

module.exports = mongoose.model("Story", storySchema);
