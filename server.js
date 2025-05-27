const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname)); // sert index.html et les fichiers

let users = {};

io.on("connection", socket => {
  socket.on("login", pseudo => {
    socket.pseudo = pseudo;
    users[socket.id] = pseudo;
    io.emit("users", Object.values(users));
  });

  socket.on("message", message => {
    io.emit("message", { pseudo: socket.pseudo, message });
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("users", Object.values(users));
  });
});

http.listen(3000, () => {
  console.log("Serveur lancé sur http://localhost:3000");
});
