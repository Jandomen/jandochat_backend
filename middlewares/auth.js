const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {

    return res.status(401).json({ message: "No hay token, permiso no válido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id || decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }


    req.user = user;


    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!user.lastActive || user.lastActive < fiveMinutesAgo) {
      user.lastActive = new Date();
      await user.save();
    }

    next();
  } catch (error) {

    return res.status(401).json({ message: "Token no válido o expirado" });
  }
};

module.exports = { authenticate };

