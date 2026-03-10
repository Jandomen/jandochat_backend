const mongoose = require("mongoose");
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fotoPerfil: { type: String, default: "" },
  fotoPublicId: { type: String, default: "" },
  bio: { type: String, default: "" },
  ubicacion: { type: String, default: "" },
  sitioWeb: { type: String, default: "" },
  bloqueados: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  seguidores: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  siguiendo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  ultimaModificacionNombre: { type: Date, default: null },
  configuracionStatus: {
    duracion: { type: Number, default: 24 },
    sonidoTipo: { type: String, default: "classic" }
  },
  storySettings: {
    autoArchive: { type: Boolean, default: true },
    visibility: { type: String, enum: ["todos", "seguidores", "nadie"], default: "todos" }
  }
}, { timestamps: true });

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
