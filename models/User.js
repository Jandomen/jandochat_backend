const mongoose = require("mongoose");
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fotoPerfil: { type: String, default: "" },
  fotoPublicId: { type: String, default: "" },
  bloqueados: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  seguidores: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  siguiendo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  ultimaModificacionNombre: { type: Date, default: null }, 
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
