const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

let whiteboardContent = "";

// REST endpoints
app.get("/whiteboard", (req, res) => {
    res.json({ content: whiteboardContent });
});

app.put("/whiteboard", (req, res) => {
    const { content } = req.body;
    whiteboardContent = content;

    io.emit("whiteboardUpdate", content);

    res.json({ success: true });
});

// Real-time updates
io.on("connection", (socket) => {
    console.log("User connected to whiteboard");

    socket.emit("whiteboardUpdate", whiteboardContent);

    socket.on("whiteboardUpdate", (data) => {
        whiteboardContent = data;
        io.emit("whiteboardUpdate", data);
    });
});

http.listen(3001, () => {
    console.log("Whiteboard server running on port 3001");
});
