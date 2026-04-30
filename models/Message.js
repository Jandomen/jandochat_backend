const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    contenido: { type: String, required: false },
    emisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    conversacion: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    media: [
      {
        url: String,
        tipo: { type: String, enum: ["imagen", "video", "audio", "documento"] },
        nombre: String
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
