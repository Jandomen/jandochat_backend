const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
  //  console.error("❌ No se proporcionó token de autorización");
    return res.status(401).json({ message: "No hay token, permiso no válido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id || decoded.userId).select("-password");
    if (!user) {
     // console.error("❌ Usuario no encontrado:", decoded.id || decoded.userId);
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    req.user = user;

   // console.log("✅ Usuario autenticado:", user._id);
    next();
  } catch (error) {
   // console.error("❌ Token inválido:", error.message);
    return res.status(401).json({ message: "Token no válido o expirado" });
  }
};

module.exports = { authenticate };

