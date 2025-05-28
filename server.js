const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const bcrypt = require("bcryptjs"); // Utilise bcryptjs pour compatibilité Render
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 Multer pour upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// 📁 users.json
const USERS_FILE = "users.json";
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");

// 🔐 Inscription
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

  // log pour debug
  console.log("📂 Utilisateurs actuels :", users.map(u => u.username));

  const usernameLower = username.toLowerCase();
  if (users.find(u => u.username.toLowerCase() === usernameLower)) {
    return res.status(400).json({ error: "Ce pseudo est déjà pris." });
  }

  const hashed = bcrypt.hashSync(password, 10);
  users.push({ username, password: hashed });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.json({ success: true });
});

// 🔐 Connexion
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  res.json({ success: true });
});

// 📤 Upload d'image
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé." });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 💬 WebSocket temps réel
const onlineUsers = new Map(); // username -> socket.id

io.on("connection", socket => {
  let currentUser = null;

  socket.on("join", username => {
    currentUser = username;
    onlineUsers.set(username, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("sendMessage", ({ to, content, type }) => {
    const toSocketId = onlineUsers.get(to);
    if (toSocketId) {
      io.to(toSocketId).emit("privateMessage", {
        from: currentUser,
        content,
        type,
      });
    }
  });

  socket.on("disconnect", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    }
  });
});

server.listen(3000, () => console.log("✅ Serveur en ligne : http://localhost:3000"));
