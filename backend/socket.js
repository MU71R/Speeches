let io;
function init(server) {
  const { Server } = require("socket.io");
  // إعداد socket.io وربطه بالسيرفر
  io = new Server(server, {
    cors: {
      origin: "*", // تقدر تحدد دومين الفرونت بدلاً من *
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
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
