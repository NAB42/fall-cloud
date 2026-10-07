const socket = io(window.location.origin);

const whiteboard = document.getElementById("whiteboard");

// Send updates when typing
whiteboard.addEventListener("input", () => {
    socket.emit("whiteboardUpdate", whiteboard.value);
});

// Receive real-time updates
socket.on("whiteboardUpdate", (content) => {
    whiteboard.value = content;
});
