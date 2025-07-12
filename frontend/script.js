let username = prompt("Enter your name:");
if (!username || username.trim() === "") {
  username = "Guest User";
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth - 100;
canvas.height = window.innerHeight;

let drawing = false;
let color = "#000000";
let brushSize = 8;
let history = [];
let redoStack = [];
let currentColor = "#000000";

const socket = new WebSocket(`ws://${location.host}`);

// ✅ WebSocket Message Handler (with Blob Fix)
socket.onmessage = async (event) => {
  try {
    let message = event.data;
    if (message instanceof Blob) {
      message = await message.text();  // Fix: Convert Blob to text
    }
    const data = JSON.parse(message);

    if (data.type === "draw") {
      draw(data, false);
      showUsername(data.username, data.x1, data.y1);
    } else if (data.type === "clear") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (data.type === "chat") {
      appendMessage(data.username, data.message);
    }
  } catch (err) {
    console.error("Failed to parse WebSocket message:", err);
  }
};

// ✅ Draw Function
function draw({ x0, y0, x1, y1, color, width, username }, emit = true, save = true) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.closePath();

  if (emit) {
    socket.send(JSON.stringify({ type: "draw", x0, y0, x1, y1, color, width, username }));
  }
  if (save) {
    history.push({ x0, y0, x1, y1, color, width, username });
  }
}

// ✅ Show Username on Canvas Temporarily
function showUsername(name, x, y) {
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#000";
  ctx.fillText(name, x + 5, y - 5);
  setTimeout(() => redraw(), 1000);
}

// ✅ Redraw All History
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  history.forEach((line) => {
    draw(line, false, false);
  });
}

let lastX = 0, lastY = 0;

// ✅ Drawing Events
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const newX = e.offsetX;
  const newY = e.offsetY;
  draw({ x0: lastX, y0: lastY, x1: newX, y1: newY, color, width: brushSize, username });
  lastX = newX;
  lastY = newY;
});

canvas.addEventListener("mouseup", () => drawing = false);
canvas.addEventListener("mouseout", () => drawing = false);

// ✅ Toolbar Button Events
document.getElementById("colorPicker").addEventListener("change", (e) => {
  currentColor = e.target.value;
  color = currentColor;
});

document.getElementById("pencil").addEventListener("click", () => {
  color = currentColor;
});

document.getElementById("eraser").addEventListener("click", () => {
  color = "#FFFFFF";  // Erase with white
});

document.getElementById("brushSize").addEventListener("change", (e) => {
  brushSize = parseInt(e.target.value);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  history = [];
  redoStack = [];
  socket.send(JSON.stringify({ type: "clear" }));
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "whiteboard.png";
  link.href = canvas.toDataURL();
  link.click();
});

document.getElementById("undo").addEventListener("click", () => {
  if (history.length === 0) return;
  redoStack.push(history.pop());
  redraw();
});

document.getElementById("redo").addEventListener("click", () => {
  if (redoStack.length === 0) return;
  history.push(redoStack.pop());
  redraw();
});

// ✅ Dark Mode Toggle
document.getElementById("darkModeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// ✅ Chatbox Code
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chat-messages");

sendBtn.addEventListener("click", () => {
  const message = chatInput.value.trim();
  if (message !== "") {
    socket.send(JSON.stringify({ type: "chat", message, username }));
    chatInput.value = "";
  }
});

function appendMessage(user, message) {
  const msg = document.createElement("div");
  msg.textContent = `${user}: ${message}`;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}




