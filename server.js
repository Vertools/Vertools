const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const multer = require("multer");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

// Stockage multer pour images
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function(req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Fichiers utilisateurs et messages
const USERS_FILE = "users.json";
const MESSAGES_FILE = "messages.json";

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "{}");
if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, "{}");

let users = JSON.parse(fs.readFileSync(USERS_FILE));
let messages = JSON.parse(fs.readFileSync(MESSAGES_FILE));

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function saveMessages() {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

// Inscription
app.post("/register", async (req, res) => {
  const { pseudo, password } = req.body;
  if (!pseudo || !password) return res.status(400).json({ error: "Pseudo et mdp requis" });
  if (users[pseudo]) return res.status(400).json({ error: "Pseudo déjà pris" });

  const hash = await bcrypt.hash(password, 10);
  users[pseudo] = { password: hash };
  saveUsers();
  res.json({ success: true });
});

// Connexion
app.post("/login", async (req, res) => {
  const { pseudo, password } = req.body;
  if (!pseudo || !password) return res.status(400).json({ error: "Pseudo et mdp requis" });
  if (!users[pseudo]) return res.status(400).json({ error: "Pseudo inconnu" });

  const match = await bcrypt.compare(password, users[pseudo].password);
  if (!match) return res.status(400).json({ error: "Mot de passe incorrect" });

  res.json({ success: true });
});

// Upload image via POST, renvoie l'URL de l'image
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Pas d'image" });
  const url = "/uploads/" + req.file.filename;
  res.json({ url });
});

// Gestion des sockets
let connectedUsers = {}; // pseudo => socket.id
let socketsUsers = {};   // socket.id => pseudo

io.on("connection", socket => {

  // Connexion utilisateur valide (après login)
  socket.on("login", (pseudo) => {
    connectedUsers[pseudo] = socket.id;
    socketsUsers[socket.id] = pseudo;
    io.emit("users", Object.keys(connectedUsers));
  });

  // Envoi message texte ou image
  socket.on("sendMessage", ({ to, content, type }) => {
    // Stocker message
    const key = [socketsUsers[socket.id], to].sort().join("-");
    if (!messages[key]) messages[key] = [];
    messages[key].push({ from: socketsUsers[socket.id], content, type, timestamp: Date.now() });
    saveMessages();

    // Envoyer aux 2 interlocuteurs si en ligne
    [connectedUsers[to], connectedUsers[socketsUsers[socket.id]]].forEach(id => {
      if (id) io.to(id).emit("receiveMessage", { from: socketsUsers[socket.id], content, type });
    });
  });

  // Charger historique
  socket.on("loadMessages", (withUser) => {
    const key = [socketsUsers[socket.id], withUser].sort().join("-");
    socket.emit("loadMessages", messages[key] || []);
  });

  // Déconnexion
  socket.on("disconnect", () => {
    const pseudo = socketsUsers[socket.id];
    delete connectedUsers[pseudo];
    delete socketsUsers[socket.id];
    io.emit("users", Object.keys(connectedUsers));
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));
