const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");

app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

let users = {};
let messages = {};

if (fs.existsSync("messages.json")) {
  messages = JSON.parse(fs.readFileSync("messages.json"));
}

function saveMessages() {
  fs.writeFileSync("messages.json", JSON.stringify(messages));
}

io.on("connection", socket => {
  socket.on("login", pseudo => {
    socket.pseudo = pseudo;
    users[socket.id] = pseudo;
    io.emit("users", Object.values(users));
  });

  socket.on("privateMessage", ({ to, message }) => {
    const key = [socket.pseudo, to].sort().join("-");
    if (!messages[key]) messages[key] = [];
    messages[key].push({ from: socket.pseudo, message });
    saveMessages();

    for (let id in users) {
      if (users[id] === to) {
        io.to(id).emit("privateMessage", { from: socket.pseudo, message });
      }
    }
  });

  socket.on("loadMessages", (withUser) => {
    const key = [socket.pseudo, withUser].sort().join("-");
    const chat = messages[key] || [];
    socket.emit("loadMessages", chat);
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("users", Object.values(users));
  });
});

http.listen(3000, () => console.log("Serveur sur http://localhost:3000"));
