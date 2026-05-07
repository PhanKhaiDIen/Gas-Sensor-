// auth.js - Đăng ký / Đăng nhập
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("./db");
const { sendTo } = require("./telegram");

// ─── Đăng ký ──────────────────────────────────────────────────────────────────
async function register({ name, email, password }) {
    // Kiểm tra email đã tồn tại chưa
    const [exist] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exist.length > 0) throw new Error("Email đã được đăng ký.");

    // Hash mật khẩu
    const hash = await bcrypt.hash(password, 12);

    // Tạo user
    const userId = crypto.randomUUID();
    await db.query(
        `INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`,
        [userId, name, email, hash]
    );

    // Tạo link token (hết hạn sau 24h)
    const linkToken = crypto.randomBytes(24).toString("hex");
    await db.query(
        `INSERT INTO link_tokens (token, user_id, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [linkToken, userId]
    );

    // Gửi hướng dẫn link Telegram đến ADMIN (optional - nếu có TELEGRAM.ADMIN_CHAT_ID)
    // await sendTo(process.env.ADMIN_CHAT_ID, `👤 User mới: ${name} (${email})`);

    return {
        userId,
        linkToken,
        botUsername: process.env.BOT_USERNAME || "YourFireAlertBot",
        message: `Đăng ký thành công! Gửi token sau đến bot Telegram để nhận cảnh báo:`
    };
}

// ─── Đăng nhập ────────────────────────────────────────────────────────────────
async function login({ email, password, deviceInfo, ipAddress }) {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) throw new Error("Email hoặc mật khẩu không đúng.");

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Email hoặc mật khẩu không đúng.");

    // Tạo session token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 ngày

    await db.query(
        `INSERT INTO sessions (id, user_id, token, device_info, ip_address, expires_at)
         VALUES (UUID(), ?, ?, ?, ?, ?)`,
        [user.id, token, deviceInfo || null, ipAddress || null, expires]
    );

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            verified: user.verified === 1,
            chat_id: user.chat_id
        }
    };
}

// ─── Xác thực token session ───────────────────────────────────────────────────
async function verifySession(token) {
    const [rows] = await db.query(
        `SELECT u.id, u.name, u.email, u.verified, u.chat_id
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW()`,
        [token]
    );
    if (rows.length === 0) throw new Error("Session không hợp lệ hoặc đã hết hạn.");
    return rows[0];
}

// ─── Đăng xuất ────────────────────────────────────────────────────────────────
async function logout(token) {
    await db.query("DELETE FROM sessions WHERE token = ?", [token]);
}

module.exports = { register, login, verifySession, logout };