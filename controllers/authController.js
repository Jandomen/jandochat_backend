const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


exports.registrarUsuario = async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    if (!password || password.length < 8) {
     // console.warn("Intento de registro con contraseña inválida:", email);
    //  console.warn("La contraseña debe tener al menos 8 caracteres.");
      return res.status(400).json({ msg: "La contraseña debe tener al menos 8 caracteres." });
    }

    const userEmail = await User.findOne({ email });
    if (userEmail) {
     // console.warn("Intento de registro con correo ya usado:", email);
      return res.status(400).json({ msg: "El correo ya está en uso" });
    }

    const userNombre = await User.findOne({ nombre });
    if (userNombre) {
     // console.warn("Intento de registro con nombre ya usado:", nombre);
      return res.status(400).json({ msg: "El nombre de usuario ya está en uso" });
    }

    const user = new User({ nombre, email, password });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();
    //console.log("Usuario registrado:", user);

    const payload = { id: user._id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

   // console.log("Token generado:", token);

    res.status(201).json({ token });
  } catch (err) {
   // console.error("Error al registrar usuario:", err);
    res.status(500).json({ msg: "Error en el servidor" });
  }
};




exports.loginUsuario = async (req, res) => {
  const { email, password } = req.body;

  try {
    //console.log("🔐 Intento de login recibido para:", email);

    if (!email || !password) {
     // console.warn("⚠️ Faltan campos obligatorios para login");
      return res.status(400).json({ msg: "Todos los campos son obligatorios." });
    }

    if (password.length < 8) {
     // console.warn("⚠️ Contraseña demasiado corta para:", email);
      return res.status(400).json({ msg: "La contraseña debe tener al menos 8 caracteres." });
    }

    const user = await User.findOne({ email });

    if (!user) {
     // console.warn("❌ Usuario no encontrado:", email);
      return res.status(400).json({ msg: "Credenciales inválidas" });
    }

    const esPasswordCorrecto = await bcrypt.compare(password, user.password);

    if (!esPasswordCorrecto) {
     //console.warn("❌ Contraseña incorrecta para:", email);
      return res.status(400).json({ msg: "Credenciales inválidas" });
    }

    const payload = { id: user._id, email: user.email };
    //console.log("🔐 JWT_SECRET leída del .env:", process.env.JWT_SECRET);

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    //console.log("✅ Usuario autenticado:", { id: user._id, email: user.email });
    //console.log("🔑 Token generado:", token);

    res.json({
      token,
      user,
    });

  } catch (err) {
   // console.error("🛑 Error al iniciar sesión:", err);
    res.status(500).json({ msg: "Error en el servidor" });
  }
};

