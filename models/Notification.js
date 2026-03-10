const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  emisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receptor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  mensaje: { type: String, required: true },
  tipo: { type: String, enum: ["mensaje", "sistema", "reaccion", "comentario", "respuesta", "compartir"], default: "mensaje" },
  conversacion: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
  publicacion: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  comentarioId: { type: String, default: null },
  leido: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
