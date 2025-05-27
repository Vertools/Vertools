const socket = io();

let pseudo = null;
let currentChat = null;

const authContainer = document.getElementById("auth-container");
const chatContainer = document.getElementById("chat-container");

const regPseudoInput = document.getElementById("regPseudo");
const regPassInput = document.getElementById("regPass");
const regMsg = document.getElementById("regMsg");

const loginPseudoInput = document.getElementById("loginPseudo");
const loginPassInput = document.getElementById("loginPass");
const loginMsg = document.getElementById("loginMsg");

const usersDiv = document.getElementById("users");
const messagesDiv = document.getElementById("messages");
const chatWithTitle = document.getElementById("chat-with");

const messageInput = document.getElementById("messageInput");
const imageInput = document.getElementById("imageInput");

async function register() {
  const pseudoVal = regPseudoInput.value.trim();
  const passVal = regPassInput.value;
  if (!pseudoVal || !passVal) {
    regMsg.textContent = "Remplis les deux champs";
    return;
  }
  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo: pseudoVal, password: passVal })
  });
  const data = await res.json();
  if (data.error) {
    regMsg.textContent = data.error;
  } else {
    regMsg.style.color = "lightgreen";
    regMsg.textContent = "Inscription OK, connecte-toi !";
  }
}

async function login() {
  const pseudoVal = loginPseudoInput.value.trim();
  const passVal = loginPassInput.value;
  if (!pseudoVal || !passVal) {
    loginMsg.textContent = "Remplis les deux champs";
    return;
  }
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo: pseudoVal, password: passVal })
  });
  const data = await res.json();
  if (data.error) {
    loginMsg.textContent = data.error;
  } else {
    pseudo = pseudoVal;
    loginMsg.textContent = "";
    startChat();
  }
}

function startChat() {
  authContainer.style.display = "none";
  chatContainer.style.display = "flex";
  socket.emit("login", pseudo);
  loadUsers();

  messageInput.focus();
}

function loadUsers() {
  socket.emit("users");
}

socket.on("users", usersList => {
  usersDiv.innerHTML = "";
  usersList.forEach(user => {
    if (user === pseudo) return; // pas afficher soi-même
    const btn = document.createElement("button");
    btn.textContent = user;
    btn.onclick = () => {
      selectChat(user);
    };
    if (currentChat === user) btn.classList.add("active");
    usersDiv.appendChild(btn);
  });
});

// Sélection chat
function selectChat(user) {
  currentChat = user;
  chatWithTitle.textContent = `Chat avec ${user}`;
  messagesDiv.innerHTML = "";
  socket.emit("loadMessages", user);
}

// Afficher messages
socket.on("loadMessages", msgs => {
  messagesDiv.innerHTML = "";
  msgs.forEach(m => appendMessage(m));
  scrollToBottom();
});

socket.on("receiveMessage", msg => {
  if (msg.from === currentChat || msg.from === pseudo) {
    appendMessage(msg);
    scrollToBottom();
  }
});

function appendMessage({ from, content, type }) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(from === pseudo ? "from-me" : "from-other");
  if (type === "text") {
    div.textContent = content;
  } else if (type === "image") {
    const img = document.createElement("img");
    img.src = content;
    div.appendChild(img);
  }
  messagesDiv.appendChild(div);
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Envoyer message au clavier (Entrée)
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && currentChat && messageInput.value.trim() !== "") {
    sendMessage(messageInput.value.trim());
    messageInput.value = "";
  }
});

// Envoyer message
function sendMessage(text) {
  socket.emit("sendMessage", { to: currentChat, content: text, type: "text" });
}

// Envoi image
imageInput.addEventListener("change", async e => {
  if (!currentChat) {
    alert("Sélectionne un chat d'abord");
    imageInput.value = "";
    return;
  }
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("/upload", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  if (data.url) {
    socket.emit("sendMessage", { to: currentChat, content: data.url, type: "image" });
  }
  imageInput.value = "";
});
