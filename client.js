const socket = io();
let pseudo = "";
let currentReceiver = null;

document.getElementById("auth").style.display = "block";

function checkKey() {
  const key = document.getElementById("keyInput").value;
  if (key === "C3P64jWxZt2eTc8a98tJ9yNjNC22") {
    document.getElementById("auth").style.display = "none";
    document.getElementById("login").style.display = "block";
  } else {
    document.getElementById("keyError").innerText = "Mauvaise clé.";
  }
}

function login() {
  pseudo = document.getElementById("pseudoInput").value;
  if (pseudo) {
    socket.emit("login", pseudo);
    document.getElementById("login").style.display = "none";
    document.getElementById("chat").style.display = "block";
  }
}

function send() {
  const msg = document.getElementById("msg").value;
  if (msg && currentReceiver) {
    socket.emit("privateMessage", {
      to: currentReceiver,
      message: msg
    });
    addMessage(pseudo, msg);
    document.getElementById("msg").value = "";
  }
}

function addMessage(from, msg) {
  const messages = document.getElementById("messages");
  messages.innerHTML += `<p><strong>${from}:</strong> ${msg}</p>`;
  messages.scrollTop = messages.scrollHeight;
}

socket.on("users", users => {
  const userDiv = document.getElementById("users");
  userDiv.innerHTML = "<h3>En ligne</h3>";
  users.forEach(u => {
    if (u !== pseudo) {
      const btn = document.createElement("button");
      btn.innerText = u;
      btn.onclick = () => {
        currentReceiver = u;
        document.getElementById("messages").innerHTML = "";
        socket.emit("loadMessages", u);
      };
      userDiv.appendChild(btn);
      userDiv.appendChild(document.createElement("br"));
    }
  });
});

socket.on("privateMessage", ({ from, message }) => {
  addMessage(from, message);
});

socket.on("loadMessages", messages => {
  document.getElementById("messages").innerHTML = "";
  messages.forEach(m => addMessage(m.from, m.message));
});
