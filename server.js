const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// ── Serial Port ──────────────────────────────────────────
const port = new SerialPort({
    path: "COM1",   // ← đổi thành COM của Proteus (COM3, COM4...)
    baudRate: 9600
});

const parser = port.pipe(
    new ReadlineParser({ delimiter: "\n" })
);

// ── Nhận dữ liệu từ Arduino → broadcast lên browser ─────
parser.on("data", (line) => {
    line = line.trim();
    console.log("[ARDUINO →]", line);

    const match = /G:([\d.]+),T:([\d.]+),S:(\d+)/.exec(line);
    if (match) {
        const data = {
            gas: parseInt(match[1]),
            temp: parseFloat(match[2]),
            status: parseInt(match[3])
        };
        console.log("[EMIT]", data);
        io.emit("sensorData", data);
    }
});

port.on("error", (err) => {
    console.error("[SERIAL] Lỗi:", err.message);
});

port.on("open", () => {
    console.log("[SERIAL] Đã kết nối COM port @ 9600bps");
});

// ── Socket.IO ────────────────────────────────────────────
// ✅ socket.on('control',...) phải nằm TRONG io.on('connection',...)
io.on("connection", (socket) => {
    console.log("[WEB] Browser kết nối:", socket.id);

    // Nhận lệnh từ browser → gửi xuống Arduino qua Serial
    socket.on("control", (data) => {
        // data = { device: 'FAN', state: 1 }
        let cmd = "";

        switch (data.device) {
            case "FAN": cmd = data.state ? "FAN:1" : "FAN:0"; break;
            case "PUMP": cmd = data.state ? "PUMP:1" : "PUMP:0"; break;
            case "BUZZ": cmd = data.state ? "BUZZ:1" : "BUZZ:0"; break;
            case "SILENCE": cmd = "SILENCE"; break;
            default:
                console.warn("[WEB] Lệnh không hợp lệ:", data.device);
                return;
        }

        console.log("[ARDUINO ←]", cmd);
        port.write(cmd + "\n", (err) => {
            if (err) console.error("[SERIAL] Lỗi gửi:", err.message);
        });
    });

    socket.on("disconnect", () => {
        console.log("[WEB] Browser ngắt kết nối:", socket.id);
    });
});

// ── Start server ─────────────────────────────────────────
server.listen(3000, () => {
    console.log("[SERVER] Chạy tại http://localhost:3000");
});