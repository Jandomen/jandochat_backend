const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const socketNotification = require("../sockets/socketNotification");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");


exports.crearMensaje = async (req, res) => {
  try {
    const { contenido, conversacion } = req.body;
    const emisorId = req.user._id;

    const conv = await Conversation.findById(conversacion).populate("participantes", "_id nombre bloqueados");

    if (!conv) {
      return res.status(404).json({ msg: "Conversación no encontrada" });
    }

    const esParticipante = conv.participantes.some(p => p._id.equals(emisorId));
    if (!esParticipante) {
      return res.status(403).json({ msg: "No tienes acceso a esta conversación" });
    }

    const receptor = conv.participantes.find(p => !p._id.equals(emisorId));

    if (!receptor) {
      return res.status(400).json({ msg: "No se encontró receptor válido en la conversación" });
    }

    const emisor = await User.findById(emisorId).select("bloqueados");

    const bloqueadoPorEmisor = emisor.bloqueados.includes(receptor._id);
    const bloqueadoPorReceptor = receptor.bloqueados.includes(emisorId);

    if (bloqueadoPorEmisor || bloqueadoPorReceptor) {
      return res.status(403).json({ msg: "No puedes enviar mensajes debido a bloqueo entre usuarios." });
    }

    let mediaArr = [];
    if (req.files && req.files.length > 0) {
      mediaArr = await Promise.all(req.files.map(async (f) => {
        const b64 = Buffer.from(f.buffer).toString("base64");
        const dataURI = "data:" + f.mimetype + ";base64," + b64;
        
        let resCloud;
        if (f.mimetype.startsWith("audio/")) {
            resCloud = await cloudinary.uploader.upload(dataURI, { resource_type: "raw", folder: "jandochat/messages" });
            return { url: resCloud.secure_url, tipo: "audio", nombre: f.originalname };
        } else if (f.mimetype.startsWith("video/")) {
            resCloud = await cloudinary.uploader.upload(dataURI, { resource_type: "video", folder: "jandochat/messages" });
            return { url: resCloud.secure_url, tipo: "video", nombre: f.originalname };
        } else if (f.mimetype.startsWith("image/")) {
            resCloud = await cloudinary.uploader.upload(dataURI, { folder: "jandochat/messages" });
            return { url: resCloud.secure_url, tipo: "imagen", nombre: f.originalname };
        } else {
            // General files / PDF
            resCloud = await cloudinary.uploader.upload(dataURI, { resource_type: "raw", folder: "jandochat/messages" });
            return { url: resCloud.secure_url, tipo: "documento", nombre: f.originalname };
        }
      }));
    }

    const nuevoMensaje = new Message({
      contenido,
      emisor: emisorId,
      conversacion,
      media: mediaArr,
    });

    await nuevoMensaje.save();

    // Actualizar la conversación con el último mensaje
    await Conversation.findByIdAndUpdate(conversacion, {
      ultimoMensaje: nuevoMensaje._id
    });

    await nuevoMensaje.populate("emisor", "nombre email fotoPerfil");

    const io = req.app.get("io");
    io.to(conversacion).emit("mensaje-recibido", nuevoMensaje);
    // console.log("📤 Mensaje enviado a la conversación:", conversacion);

    const usuariosViendoChat = socketNotification.getUsuariosViendoChat
      ? socketNotification.getUsuariosViendoChat()
      : new Map();

    const estaViendo = usuariosViendoChat.get(receptor._id.toString()) === conversacion;

    if (!estaViendo) {
      const nuevaNotificacion = new Notification({
        receptor: receptor._id,
        emisor: emisorId,
        tipo: "mensaje",
        mensaje: `${nuevoMensaje.emisor.nombre} te ha enviado un mensaje`,
        conversacion,
        leido: false,
      });

      await nuevaNotificacion.save();

      io.to(receptor._id.toString()).emit("nueva-notificacion", nuevaNotificacion);
      //log("🔔 Notificación creada y enviada a:", receptor._id.toString());
    } else {
      // console.log("👁️ Receptor está viendo la conversación, no se envía notificación");
    }

    res.status(201).json(nuevoMensaje);
  } catch (err) {
    //console.error("❌ Error al crear mensaje:", err);
    res.status(500).json({ msg: "Error al crear mensaje" });
  }
};




exports.obtenerMensajes = async (req, res) => {
  const conversacionId = req.params.id;
  try {
    const mensajes = await Message.find({ conversacion: conversacionId })
      .populate("emisor", "nombre email fotoPerfil")
      .sort({ createdAt: 1 });

    res.json(mensajes);

    // console.log("📥 Mensajes obtenidos para conversación:", conversacionId);
  } catch (error) {
    // console.error("❌ Error al obtener mensajes:", error);
    res.status(500).json({ msg: "Error al obtener mensajes" });
  }
};

exports.editarMensaje = async (req, res) => {
  try {
    const mensaje = await Message.findById(req.params.id);
    if (!mensaje) return res.status(404).json({ msg: "Mensaje no encontrado" });

    if (mensaje.emisor.toString() !== req.user.id)
      return res.status(403).json({ msg: "No autorizado para editar este mensaje" });

    mensaje.contenido = req.body.contenido || mensaje.contenido;
    await mensaje.save();

    const io = req.app.get("io");
    io.to(mensaje.conversacion.toString()).emit("mensaje-editado", mensaje);

    res.json(mensaje);
    // console.log("✏️ Mensaje editado:", mensaje._id);
  } catch (err) {
    //console.error("❌ Error al editar mensaje:", err);
    res.status(500).json({ msg: "Error al editar mensaje" });
  }
};

exports.eliminarMensaje = async (req, res) => {
  try {
    const mensaje = await Message.findById(req.params.id);
    if (!mensaje) return res.status(404).json({ msg: "Mensaje no encontrado" });

    if (mensaje.emisor.toString() !== req.user.id)
      return res.status(403).json({ msg: "No autorizado para eliminar este mensaje" });

    const conversacionId = mensaje.conversacion.toString();
    const mensajeId = mensaje._id.toString();

    await mensaje.deleteOne();

    const io = req.app.get("io");
    io.to(conversacionId).emit("mensaje-eliminado", { _id: mensajeId });

    res.json({ msg: "Mensaje eliminado", _id: mensajeId });
    // console.log("🗑️ Mensaje eliminado:", mensajeId);
  } catch (err) {
    //console.error("❌ Error al eliminar mensaje:", err);
    res.status(500).json({ msg: "Error al eliminar mensaje" });
  }
};
