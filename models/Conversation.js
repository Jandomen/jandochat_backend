const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participantes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    esGrupo: { type: Boolean, default: false },
    nombreGrupo: { type: String },
    ultimoMensaje: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
