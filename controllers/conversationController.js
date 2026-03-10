const { emitirNuevaConversacion } = require("../sockets/socketChat");
const Conversation = require("../models/Conversation");


exports.crearConversacion = async (req, res) => {
  try {
    const { participantes, esGrupo, nombreGrupo } = req.body;

    if (!participantes || participantes.length < 1) {
      //console.error("Error: No se proporcionaron participantes");
      return res.status(400).json({ msg: "Debes incluir al menos un participante" });
    }

    const participantesUnicos = [...new Set([...participantes, req.user.id])];

    const conversacion = new Conversation({
      participantes: participantesUnicos,
      esGrupo,
      nombreGrupo: esGrupo ? nombreGrupo : null,
    });

    await conversacion.save();
    // console.log("Conversación creada:", conversacion);

    participantesUnicos.forEach((userId) => {
      if (userId.toString() !== req.user.id.toString()) {
        emitirNuevaConversacion(userId.toString(), conversacion);
      }
    });

    res.status(201).json(conversacion);
  } catch (err) {
    // console.error("Error al crear conversación:", err);
    res.status(500).json({ msg: "Error al crear conversación" });
  }
};


exports.obtenerConversaciones = async (req, res) => {
  try {
    const conversaciones = await Conversation.find({ participantes: req.user.id })
      .populate("participantes", "nombre email fotoPerfil")
      .populate("ultimoMensaje")
      .sort({ updatedAt: -1 });

    res.json(conversaciones);
    // console.log("Conversaciones obtenidas:", conversaciones);
  } catch (err) {
    // console.error("Error al obtener conversaciones:", err);
    res.status(500).json({ msg: "Error al obtener conversaciones" });
  }
};



exports.agregarParticipante = async (req, res) => {
  try {
    const { userId } = req.body;
    const conversacion = await Conversation.findById(req.params.id);
    if (!conversacion) return res.status(404).json({ msg: "Conversación no encontrada" });

    if (!conversacion.participantes.includes(req.user.id))
      return res.status(403).json({ msg: "No perteneces a esta conversación" });

    if (!conversacion.participantes.includes(userId)) {
      conversacion.participantes.push(userId);
      await conversacion.save();
    }

    res.json(conversacion);
    // console.log("Participante agregado:", userId, "a conversación:", conversacion._id);
  } catch (err) {
    // console.error("Error al agregar participante:", err);
    res.status(500).json({ msg: "Error al agregar participante" });
  }
};


exports.eliminarConversacion = async (req, res) => {
  try {
    const conversacion = await Conversation.findById(req.params.id);

    if (!conversacion) return res.status(404).json({ msg: "Conversación no encontrada" });

    if (!conversacion.participantes.includes(req.user.id))
      return res.status(403).json({ msg: "No autorizado" });

    await conversacion.deleteOne();
    // console.log("Conversación eliminada:", conversacion._id);
    res.json({ msg: "Conversación eliminada" });
  } catch (err) {
    // console.error("Error al eliminar conversación:", err);
    res.status(500).json({ msg: "Error al eliminar conversación" });
  }
};




exports.obtenerConversacionPorId = async (req, res) => {
  try {
    const conversacion = await Conversation.findById(req.params.id)
      .populate("participantes", "nombre email _id");

    if (!conversacion) {
      // console.warn(`⚠️ Conversación con ID ${req.params.id} no encontrada`);
      return res.status(404).json({ msg: "No encontrada" });
    }

    //console.log("✅ Conversación obtenida con ID:", conversacion._id);
    res.json(conversacion);
  } catch (err) {
    //console.error("❌ Error al obtener conversación con ID:", req.params.id, err);
    res.status(500).json({ msg: "Error al obtener la conversación" });
  }
};



