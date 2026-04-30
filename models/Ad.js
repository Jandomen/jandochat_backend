const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({
  empresa: { type: String, required: true },
  fotoPerfil: { type: String, default: "" },
  contenido: { type: String, required: true },
  media: [{
    url: String,
    tipo: { type: String, enum: ["imagen", "video"] },
    publicId: String
  }],
  permitirComentarios: { type: Boolean, default: true },
  reacciones: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  clics: { type: Number, default: 0 },
  vistas: { type: Number, default: 0 },
  webUrl: { type: String, default: "" },
  status: { type: String, enum: ["activo", "pausado"], default: "activo" },
  expiraEn: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Ad", adSchema);
