const checkSuspension = (req, res, next) => {
  if (req.user && req.user.status === "suspendido") {
    // Check if auto-lift is needed
    if (req.user.suspension?.hasta && new Date() > new Date(req.user.suspension.hasta)) {
      next();
      return;
    }

    return res.status(403).json({ 
      msg: "Tu cuenta se encuentra bajo suspensión administrativa.",
      motivo: req.user.suspension?.motivo || "Violación de normas de la comunidad.",
      hasta: req.user.suspension?.hasta || "Permanente"
    });
  }
  next();
};

module.exports = checkSuspension;
