const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const { initSerial } = require("./serial");
const { sendAlert, sendRecovery, sendTelegram, startPolling } = require("./telegram");
const { register, login, verifySession, logout } = require("./auth");
const { getLogs, getStats } = require("./alertLogs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

let lastStatus = 0;

// ─── SERIAL (giữ nguyên như cũ) ──────────────────────────────────────────────
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

// ─── SOCKET (giữ nguyên như cũ) ──────────────────────────────────────────────
io.on("connection", (socket) => {
    console.log("[WEB] Kết nối:", socket.id);
});

// ─── MIDDLEWARE xác thực ──────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Chưa đăng nhập." });
    try {
        req.user = await verifySession(token);
        next();
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// Đăng ký
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin." });
        if (password.length < 8)
            return res.status(400).json({ error: "Mật khẩu tối thiểu 8 ký tự." });

        const result = await register({ name, email, password });
        res.json({
            success: true,
            message: result.message,
            linkToken: result.linkToken,
            botUsername: result.botUsername,
            instruction: `/link ${result.linkToken}`
        });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Đăng nhập
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await login({
            email, password,
            deviceInfo: req.headers["user-agent"],
            ipAddress: req.ip
        });
        res.json({ success: true, ...result });
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
});

// Đăng xuất
app.post("/api/logout", requireAuth, async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    await logout(token);
    res.json({ success: true });
});

// Thông tin user hiện tại
app.get("/api/me", requireAuth, (req, res) => {
    res.json(req.user);
});

// ─── ALERT LOG ROUTES ─────────────────────────────────────────────────────────

// Lịch sử cảnh báo: GET /api/logs?limit=50&type=FIRE
app.get("/api/logs", requireAuth, async (req, res) => {
    try {
        const logs = await getLogs({
            limit: req.query.limit,
            type: req.query.type,
            fromDate: req.query.fromDate
        });
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Thống kê 7 ngày: GET /api/logs/stats
app.get("/api/logs/stats", requireAuth, async (req, res) => {
    try {
        const stats = await getStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── START ────────────────────────────────────────────────────────────────────
server.listen(3000, () => {
    console.log("[SERVER] http://localhost:3000");
});

// Khởi động Telegram polling (nhận /link token từ users)
startPolling();

// Test kết nối Telegram
sendTelegram("✅ Hệ thống khởi động");