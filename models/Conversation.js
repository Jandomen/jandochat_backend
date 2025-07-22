const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participantes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    esGrupo: { type: Boolean, default: false },
    nombreGrupo: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
