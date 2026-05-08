// auth.js - Đăng ký / Đăng nhập (Bản tối ưu cho Database mới)
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("./db");

// ─── Đăng ký ──────────────────────────────────────────────────────────────────
async function register({ name, email, password }) {
    // 1. Kiểm tra Email tồn tại
    const [emailExist] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (emailExist.length > 0) throw new Error("Email đã được đăng ký.");

    // 2. Kiểm tra Họ và tên trùng (Như Duy yêu cầu)
    const [nameExist] = await db.query("SELECT id FROM users WHERE name = ?", [name]);
    if (nameExist.length > 0) {
        throw new Error("Họ và tên đã được sử dụng. Vui lòng nhập tên khác.");
    }

    // 3. CHẶN TRÙNG MẬT KHẨU (Quét toàn bộ DB để so sánh mật khẩu mã hóa)
    const [allPasswords] = await db.query("SELECT password FROM users");
    for (let user of allPasswords) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            throw new Error("Mật khẩu này đã có người sử dụng. Vui lòng chọn mật khẩu khác.");
        }
    }

    // 4. Hash mật khẩu
    const hash = await bcrypt.hash(password, 12);

    // 5. Tạo user (Database tự sinh ID và Device_ID nên Duy không cần dùng crypto.randomUUID() nữa)
    const [result] = await db.query(
        `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
        [name, email, hash]
    );
    
    // Lấy ID mà database vừa tự sinh ra để làm tiếp bước tạo token
    const [newUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    const userId = newUser[0].id;

    // 6. Tạo link token (hết hạn sau 24h)
    const linkToken = crypto.randomBytes(24).toString("hex");
    await db.query(
        `INSERT INTO link_tokens (token, user_id, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [linkToken, userId]
    );

    return {
        userId,
        linkToken,
        botUsername: process.env.BOT_USERNAME || "YourFireAlertBot",
        message: `Đăng ký thành công! Gửi token sau đến bot Telegram để nhận cảnh báo:`
    };
}

// ─── Đăng nhập ────────────────────────────────────────────────────────────────
async function login({ email, password, deviceInfo, ipAddress }) {
    // Thêm device_id vào câu lệnh SELECT để trả về cho người dùng
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    
    if (rows.length === 0) throw new Error("Email không tồn tại.");

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) throw new Error("mật khẩu đăng nhập sai");

    // Tạo session token (Sử dụng độ dài 255 như database mới hỗ trợ)
    const token = crypto.randomBytes(64).toString("hex"); 
    const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000); 

    // Database tự sinh ID session, Duy chỉ cần truyền các thông tin khác
    await db.query(
        `INSERT INTO sessions (user_id, token, device_info, ip_address, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, token, deviceInfo || null, ipAddress || null, expires]
    );

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            device_id: user.device_id, // Trả thêm Device ID cho chuyên nghiệp
            verified: user.verified === 1,
            chat_id: user.chat_id
        }
    };
}

// ─── Xác thực token session ───────────────────────────────────────────────────
async function verifySession(token) {
    const [rows] = await db.query(
        `SELECT u.id, u.name, u.email, u.verified, u.chat_id, u.device_id
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