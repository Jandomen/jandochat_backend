const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");

let io;
const usuariosViendoChat = new Map();

function socketChat(ioInstance) {
  io = ioInstance;

  io.on("connection", (socket) => {
  //  console.log("🟢 Usuario conectado, socket id:", socket.id);

    socket.on("join-user", async (userId) => {
    //  console.log(`Socket ${socket.id} se unió a la sala del usuario ${userId}`);
      socket.data.userId = userId;

      try {
        const conversaciones = await Conversation.find({ participantes: userId });
        conversaciones.forEach((conv) => socket.join(conv._id.toString()));
        socket.join(userId);
      } catch (err) {
   //     console.error("❌ Error al unir a salas de conversación:", err.message);
      }
    });

    socket.on("mensaje", async (msg) => {
      try {
        const nuevoMensaje = new Message({
          contenido: msg.contenido,
          emisor: msg.emisor,
          conversacion: msg.conversacion,
        });

        await nuevoMensaje.save();
        await nuevoMensaje.populate("emisor", "nombre email");

        io.to(msg.conversacion).emit("mensaje-recibido", nuevoMensaje);
     //   console.log("✅ Mensaje guardado y emitido:", nuevoMensaje);

        const conversacion = await Conversation.findById(msg.conversacion).populate("participantes");

        for (const participante of conversacion.participantes) {
          const receptorId = participante._id.toString();
          if (receptorId === msg.emisor) continue;

          const estaViendo = usuariosViendoChat.get(receptorId) === msg.conversacion;
          if (!estaViendo) {
            
            const noti = new Notification({
              de: msg.emisor,
              para: receptorId,
              mensaje: `Nuevo mensaje de ${nuevoMensaje.emisor.nombre}`,
              tipo: "mensaje",
              conversacion: msg.conversacion,
            });

            await noti.save();
            io.to(receptorId).emit("nueva-notificacion", noti);
       //     console.log("🔔 Notificación enviada a", receptorId);
          }
        }
      } catch (error) {
   //     console.error("❌ Error al guardar mensaje:", error.message);
      }
    });

    socket.on("viendo-conversacion", ({ userId, conversacionId }) => {
      usuariosViendoChat.set(userId, conversacionId);
   //   console.log(`👁️ Usuario ${userId} está viendo conversación ${conversacionId}`);
    });

    socket.on("disconnect", () => {
      const userId = socket.data?.userId;
      if (userId) {
        usuariosViendoChat.delete(userId);
     //   console.log("🗑️ Usuario desconectado del mapa:", userId);
      }
    //  console.log("🔴 Usuario desconectado, socket id:", socket.id);
    });
  });
}

function emitirNuevaConversacion(usuarioId, conversacion) {
  if (!io) return;
  io.to(usuarioId).emit("nueva-conversacion", conversacion);
}

module.exports = socketChat;
module.exports.emitirNuevaConversacion = emitirNuevaConversacion;
