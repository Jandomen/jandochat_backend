const mongoose = require("mongoose");

const safeNoteSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  titulo: { type: String, required: true },
  contenido: { type: String, default: "" },
  tipo: { type: String, enum: ["nota", "credencial", "documento"], default: "nota" },
  campos: {
    sitio: { type: String, default: "" },
    identificador: { type: String, default: "" },
    secreto: { type: String, default: "" },
  },
  adjuntos: [{
    nombre: String,
    url: String,
    publicId: String,
    mime: String,
  }],
  pinned: { type: Boolean, default: false },
  tags: [{ type: String }],
}, { timestamps: true });

safeNoteSchema.index({ usuario: 1, pinned: -1, updatedAt: -1 });

module.exports = mongoose.model("SafeNote", safeNoteSchema);
