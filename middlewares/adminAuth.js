const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Falta token de administrador" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.rol !== 'admin') {
      return res.status(403).json({ message: "Acceso denegado: Se requiere rango administrativo" });
    }

    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Administrador no hallado en el búnker" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Sesión de administrador expirada o inválida" });
  }
};

module.exports = { authenticateAdmin };
