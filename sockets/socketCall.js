let io;
const activeCalls = new Map();

function socketCall(ioInstance) {
  io = ioInstance;

  io.on("connection", (socket) => {
    console.log("📞 [Backend] Socket conectado:", socket.id);

    socket.on("join-user", (userId) => {
      console.log(`📞 [Backend] Usuario ${userId} se unió con socket ${socket.id}`);
      socket.data.userId = userId;
      socket.join(userId);
    });

    socket.on("call:start", ({ to, caller }) => {
      console.log(`📞 [Backend] Intentando llamada: Desde ${caller.id} hacia ${to}`);

      if (activeCalls.has(to)) {
        console.log(`📞 [Backend] Usuario ${to} ocupado. Informando a ${caller.id}`);
        io.to(to).emit("call:busy", { caller });
        socket.emit("call:busy", { to });
        return;
      }

      const callData = {
        caller,
        to,
        status: "ringing",
        startTime: Date.now()
      };
      activeCalls.set(to, callData);
      activeCalls.set(caller.id, callData);

      console.log(`📞 [Backend] Enviando call:incoming a ${to}`);
      io.to(to).emit("call:incoming", callData);
    });

    socket.on("call:accept", ({ to, callerId }) => {
      console.log(`📞 [Backend] Llamada aceptada por ${to} (Llamada original de ${callerId})`);

      const call = activeCalls.get(callerId);
      if (call) {
        call.status = "accepted";
        call.acceptTime = Date.now();
      }
      activeCalls.set(to, { ...call, status: "accepted" });

      io.to(to).emit("call:accept", { callerId });
      io.to(callerId).emit("call:accept", { callerId: to });
    });

    socket.on("call:reject", ({ to, callerId }) => {
      console.log(`📞 [Backend] Llamada rechazada por ${to}`);

      activeCalls.delete(to);
      activeCalls.delete(callerId);

      io.to(to).emit("call:reject", { callerId });
      io.to(callerId).emit("call:reject", { callerId: to });
    });

    socket.on("call:end", ({ to, callerId }) => {
      console.log(`📞 [Backend] Llamada terminada entre ${to} y ${callerId}`);

      activeCalls.delete(to);
      activeCalls.delete(callerId);

      io.to(to).emit("call:end", { callerId });
      io.to(callerId).emit("call:end", { callerId: to });
    });

    socket.on("webrtc:offer", ({ to, offer, callerId }) => {
      console.log(`📞 [Backend] SEÑAL: webrtc:offer de ${callerId} hacia ${to}`);
      io.to(to).emit("webrtc:offer", { offer, callerId });
    });

    socket.on("webrtc:answer", ({ to, answer, callerId }) => {
      console.log(`📞 [Backend] SEÑAL: webrtc:answer de ${callerId} hacia ${to}`);
      io.to(to).emit("webrtc:answer", { answer, callerId });
    });

    socket.on("webrtc:ice-candidate", ({ to, candidate, callerId }) => {
      console.log(`📞 [Backend] SEÑAL: ICE-Candidate de ${callerId} hacia ${to}`);
      io.to(to).emit("webrtc:ice-candidate", { candidate, callerId });
    });

    socket.on("disconnect", () => {
      const userId = socket.data?.userId;
      console.log(`📞 [Backend] Socket desconectado: ${socket.id} (User: ${userId})`);

      if (userId) {
        const call = activeCalls.get(userId);
        if (call) {
          const otherUser = call.to === userId ? call.caller?.id : call.to;
          console.log(`📞 [Backend] Limpiando llamada abandonada por desconexión de ${userId}. Notificando a ${otherUser}`);
          if (otherUser) {
            io.to(otherUser).emit("call:end", { callerId: userId });
          }
          activeCalls.delete(userId);
          activeCalls.delete(otherUser);
        }
      }
    });
  });
}

module.exports = socketCall;
