const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  emisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receptor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  mensaje: { type: String, required: true },
  tipo: { type: String, enum: ["mensaje", "sistema"], default: "mensaje" },
  conversacion: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
  leido: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
