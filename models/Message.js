const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    contenido: { type: String, required: true },
    emisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    conversacion: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
