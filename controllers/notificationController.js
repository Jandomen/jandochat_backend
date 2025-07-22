const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const socketNotification = require("../sockets/socketNotification");

exports.crearNotificacion = async (req, res) => {
  try {
    const { receptor, tipo, mensaje, conversacion } = req.body;

    const notificacion = new Notification({
      receptor,
      emisor: req.user.id,
      tipo,
      mensaje,
      conversacion,
    });
    await notificacion.save();

    const io = socketNotification.getIO();
    io.to(receptor.toString()).emit("nueva-notificacion", notificacion);

    //console.log("✅ Notificación creada:", notificacion);
    res.status(201).json(notificacion);
  } catch (err) {
    //console.error("❌ Error al crear notificación:", err);
    res.status(500).json({ msg: "Error al crear notificación" });
  }
};

exports.obtenerNotificaciones = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ msg: "Usuario no autenticado" });

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const notificaciones = await Notification.find({ receptor: userId })
      .populate("emisor", "nombre fotoPerfil")
      .sort({ createdAt: -1 });

    res.json(notificaciones || []);
   // console.log("📥 Notificaciones obtenidas para el usuario:", req.user.id);
  } catch (err) {
   // console.error("❌ Error al obtener notificaciones:", err);
    res.status(500).json([]);
  }
};

exports.marcarComoLeida = async (req, res) => {
  try {
    const notificacion = await Notification.findById(req.params.id);
    if (!notificacion) return res.status(404).json({ msg: "No encontrada" });

    if (notificacion.receptor.toString() !== req.user.id)
      return res.status(403).json({ msg: "No autorizado" });

    notificacion.leido = true;
    await notificacion.save();
    res.json(notificacion);
    //console.log("Notificación actualizada:", notificacion);
  } catch (err) {
    //console.error("❌ Error al actualizar notificación:", err);
    res.status(500).json({ msg: "Error al actualizar notificación" });
  }
};

exports.eliminarNotificacion = async (req, res) => {
  try {
    const notificacion = await Notification.findById(req.params.id);
    if (!notificacion) return res.status(404).json({ msg: "No encontrada" });

    if (notificacion.receptor.toString() !== req.user.id)
      return res.status(403).json({ msg: "No autorizado" });

    await notificacion.deleteOne();
    res.json({ msg: "Notificación eliminada" });
   // console.log("Notificación eliminada:", notificacion);
  } catch (err) {
    //console.error("❌ Error al eliminar notificación:", err);
    res.status(500).json({ msg: "Error al eliminar notificación" });
  }
};

exports.marcarTodasLeidas = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    await Notification.updateMany({ receptor: userId, leido: false }, { leido: true });
    res.json({ msg: "Todas marcadas como leídas" });
   // console.log("Todas las notificaciones marcadas como leídas para el usuario:", req.user.id);
  } catch (err) {
   // console.error("❌ Error al marcar todas como leídas:", err);
    res.status(500).json({ msg: "Error" });
  }
};

exports.eliminarTodas = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    await Notification.deleteMany({ receptor: userId });
    res.json({ msg: "Todas eliminadas" });
   // console.log("Todas las notificaciones eliminadas para el usuario:", req.user.id);
  } catch (err) {
   // console.error("❌ Error al eliminar todas:", err);
    res.status(500).json({ msg: "Error" });
  }
};
