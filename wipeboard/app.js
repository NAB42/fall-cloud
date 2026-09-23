const socket = io("http://localhost:3001");

const whiteboard = document.getElementById("whiteboard");

// Load initial content
fetch("http://localhost:3001/whiteboard")
    .then(res => res.json())
    .then(data => {
        whiteboard.value = data.content;
    });

// Send updates when typing
whiteboard.addEventListener("input", () => {
    const content = whiteboard.value;

    fetch("http://localhost:3001/whiteboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
    });

    socket.emit("whiteboardUpdate", content);
});

// Receive real-time updates
socket.on("whiteboardUpdate", (content) => {
    whiteboard.value = content;
});
