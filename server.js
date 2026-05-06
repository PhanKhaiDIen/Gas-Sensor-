require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { initSerial } = require("./serial");
const { sendAlert, sendRecovery, sendTelegram } = require("./telegram");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let lastStatus = 0;

// 🔌 SERIAL
initSerial((data) => {
    console.log("[DATA]", data);

    if (data.status >= 2 && lastStatus < 2) {
        sendAlert(data.gas, data.temp, data.status);
    }

    if (data.status === 0 && lastStatus >= 2) {
        sendRecovery(data.temp, data.gas);
    }

    lastStatus = data.status;

    io.emit("sensorData", data);
});

// 🌐 SOCKET
io.on("connection", (socket) => {
    console.log("[WEB] Kết nối:", socket.id);
});

// 🚀 START
server.listen(3000, () => {
    console.log("Server chạy http://localhost:3000");
});

// test
sendTelegram("TEST HE THONG");