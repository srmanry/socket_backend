const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const onlineUsers = {}; // userId → socket.id

io.on("connection", (socket) => {
  console.log(`[CONNECT] New client: ${socket.id}`);

  socket.on("register", (userId) => {
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.log(`[INVALID] Register attempt from ${socket.id}`);
      return;
    }

    // পুরানো সকেট থাকলে replace
    if (onlineUsers[userId] && onlineUsers[userId] !== socket.id) {
      console.log(`[REPLACE] Old socket for ${userId}`);
    }

    onlineUsers[userId] = socket.id;
    socket.userId = userId;

    console.log(`[REGISTER] ${userId} → ${socket.id}`);
    console.log("[ONLINE]", Object.keys(onlineUsers));
  });

  socket.on("send_message", (data) => {
    const { senderId, receiverId, message } = data;

    if (!senderId || !receiverId || !message) {
      console.log(`[INVALID MSG] from ${socket.id}`);
      return;
    }

    console.log(`[SEND] ${senderId} → ${receiverId}: "${message}"`);
    console.log("[ONLINE NOW]", Object.keys(onlineUsers));

    const receiverSocketId = onlineUsers[receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", {
        senderId,
        receiverId,
        message,
        timestamp: new Date().toISOString()
      });
      console.log(`[DELIVERED] to ${receiverId} (${receiverSocketId})`);
    } else {
      console.log(`[NOT ONLINE] ${receiverId}`);
    }
  });

  socket.on("typing", ({ from, to }) => {
    const sid = onlineUsers[to];
    if (sid) io.to(sid).emit("typing", { from });
  });

  socket.on("stop_typing", ({ to }) => {
    const sid = onlineUsers[to];
    if (sid) io.to(sid).emit("stop_typing");
  });

  socket.on("disconnect", (reason) => {
    if (socket.userId) {
      delete onlineUsers[socket.userId];
      console.log(`[DISCONNECT] ${socket.userId} (${socket.id}) | reason: ${reason}`);
      console.log("[REMAINING]", Object.keys(onlineUsers));
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Socket server running → http://localhost:${PORT}`);
});