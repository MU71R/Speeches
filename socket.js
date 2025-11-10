let io;

function init(server) {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*", // يفضل تحديد دومين الفرونت لاحقًا
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {

    // المستخدم يسجل نفسه في غرفته
    socket.on("registerUser", (userId) => {
      if (userId) {
        socket.join(userId.toString());
      }
    });

    socket.on("disconnect", () => {
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io لم يتم تهيئته بعد!");
  }
  return io;
}

module.exports = { init, getIo };