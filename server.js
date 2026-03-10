require("./utils/displayHeader")();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./db/connection");
const socketChat = require("./sockets/socketChat");
const socketNotification = require("./sockets/socketNotification");
const socketCall = require("./sockets/socketCall");



const sanitizeInputs = require("./middlewares/sanitize");
const limiter = require("./middlewares/rateLimiter");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());
app.use(sanitizeInputs);
app.use(limiter);
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/mensajes", require("./routes/messageRoutes"));
app.use("/api/conversaciones", require("./routes/conversationRoutes"));
app.use("/api/notificaciones", require("./routes/notificationRoutes"));
app.use("/api/status", require("./routes/statusRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/stories", require("./routes/storyRoutes"));

connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

app.set("io", io);

socketChat(io);
socketNotification(io);
socketCall(io);

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`✅ JandoChat backend corriendo en http://localhost:${PORT}`);
});
