const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const { port, clientOrigin } = require("./config/env");

const server = http.createServer(app);

// Socket.IO — pairs with `socket.io-client` in the frontend
const io = new Server(server, {
  cors: { origin: clientOrigin, methods: ["GET", "POST"] },
});
app.set("io", io); // make io available to controllers via req.app.get("io")

io.on("connection", (socket) => {
  console.log(`socket connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`socket disconnected: ${socket.id}`));
});

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("✗ MongoDB connection failed:", err.message);
  }
  server.listen(port, () => {
    console.log(`Trust Prism backend listening on http://localhost:${port}`);
  });
}

start();
