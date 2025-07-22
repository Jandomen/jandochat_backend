const usuariosViendoChat = new Map();
let io;


function socketNotification(ioInstance) {
  io = ioInstance;

  io.on("connection", (socket) => {
   //console.log("🔌 Usuario conectado a notificaciones:", socket.id);

    socket.on("enviar-notificacion", (noti) => {
      //console.log("📤 Enviando notificación:", noti);
      io.to(noti.receptor).emit("nueva-notificacion", noti);
    });

    socket.on("join-user", (userId) => {
     // console.log(`👤 Usuario ${userId} se unió a su sala personal (notificaciones)`);
      socket.join(userId);
    });

    socket.on("viendo-conversacion", ({ userId, conversacionId }) => {
      usuariosViendoChat.set(userId, conversacionId);
    });

    socket.on("salio-conversacion", (userId) => {
      usuariosViendoChat.delete(userId);
    });

    socket.on("disconnect", () => {
      //console.log("❌ Usuario desconectado:", socket.id);
      usuariosViendoChat.forEach((_, key) => {
        if (usuariosViendoChat.get(key) === socket.id) {
          usuariosViendoChat.delete(key);
        }
      });
    });
  });
}

socketNotification.getIO = () => io;
socketNotification.getUsuariosViendoChat = () => usuariosViendoChat;


module.exports = socketNotification;