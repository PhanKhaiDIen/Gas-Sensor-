// telegram.js - Multi-user Telegram bot (polling)
const axios = require("axios");
const db = require("./db");
const { TELEGRAM } = require("./config");

const BASE = `https://api.telegram.org/bot${TELEGRAM.BOT_TOKEN}`;

// ─── Cooldown chống spam alert ───────────────────────────────────────────────
let alertSent = false;

// ─── Gửi đến 1 chat_id cụ thể ────────────────────────────────────────────────
async function sendTo(chat_id, message) {
    try {
        await axios.post(`${BASE}/sendMessage`, {
            chat_id,
            text: message,
            parse_mode: "Markdown"
        });
    } catch (err) {
        console.error(`[TELEGRAM ✗] chat_id=${chat_id}`, err.response?.data?.description || err.message);
    }
}

// ─── Gửi đến TẤT CẢ users đã link Telegram ──────────────────────────────────
async function sendToAll(message) {
    const [rows] = await db.query(
        "SELECT chat_id FROM users WHERE chat_id IS NOT NULL AND verified = 1"
    );
    const chatIds = rows.map(r => r.chat_id);
    await Promise.all(chatIds.map(id => sendTo(id, message)));
    return chatIds;
}

// ─── Cảnh báo cháy / gas ─────────────────────────────────────────────────────
async function sendAlert(gas, temp, status) {
    if (alertSent) return;
    alertSent = true;

    const time = new Date().toLocaleString("vi-VN");
    const type = status === 3 ? "FIRE" : "GAS";

    const content = status === 3
        ? `🔥 *CẢNH BÁO CHÁY!*\n🌡 Nhiệt độ: *${temp.toFixed(1)}°C*\n💨 Gas: *${Math.round(gas)}*\n🕐 ${time}`
        : `☠ *CẢNH BÁO GAS!*\n💨 Gas: *${Math.round(gas)}*\n🌡 Nhiệt độ: *${temp.toFixed(1)}°C*\n🕐 ${time}`;

    const sentTo = await sendToAll(content);

    // Lưu vào alert_logs
    await db.query(
        `INSERT INTO alert_logs (type, temperature, gas_level, status_code, message, sent_to, notified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [type, temp, Math.round(gas), status, content, JSON.stringify(sentTo), sentTo.length > 0 ? 1 : 0]
    );

    setTimeout(() => alertSent = false, 60000);
}

// ─── Phục hồi an toàn ────────────────────────────────────────────────────────
async function sendRecovery(temp, gas) {
    const time = new Date().toLocaleString("vi-VN");

    const content = `✅ *ĐÃ AN TOÀN TRỞ LẠI*\n🌡 Nhiệt độ: *${temp.toFixed(1)}°C*\n💨 Gas: *${Math.round(gas)}*\n🕐 ${time}`;

    const sentTo = await sendToAll(content);

    await db.query(
        `INSERT INTO alert_logs (type, temperature, gas_level, status_code, message, sent_to, notified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["RECOVERY", temp, Math.round(gas), 1, content, JSON.stringify(sentTo), 1]
    );

    alertSent = false;
}

// ─── Xử lý lệnh từ user nhắn vào bot ─────────────────────────────────────────
async function handleUpdate(update) {
    const msg = update.message;
    if (!msg || !msg.text) return;

    const chat_id = msg.chat.id;
    const text = msg.text.trim();
    const from = msg.from?.first_name || "bạn";

    // /start  →  chào mừng
    if (text === "/start") {
        await sendTo(chat_id,
            `👋 Xin chào *${from}*!\n\nBot cảnh báo cháy đang hoạt động.\n\nNếu bạn vừa đăng ký tài khoản, hãy gửi token kích hoạt:\n\`/link <token>\`\n\nGõ /status để kiểm tra hệ thống.`
        );
        return;
    }

    // /link <token>  →  kết nối tài khoản với chat_id này
    if (text.startsWith("/link ")) {
        const token = text.slice(6).trim();
        const [rows] = await db.query(
            `SELECT lt.user_id, u.name FROM link_tokens lt
             JOIN users u ON u.id = lt.user_id
             WHERE lt.token = ? AND lt.used = 0 AND lt.expires_at > NOW()`,
            [token]
        );

        if (rows.length === 0) {
            await sendTo(chat_id, "❌ Token không hợp lệ hoặc đã hết hạn.\n\nĐăng ký lại tài khoản để lấy token mới.");
            return;
        }

        const { user_id, name } = rows[0];

        // Cập nhật chat_id + verified cho user
        await db.query(
            "UPDATE users SET chat_id = ?, verified = 1 WHERE id = ?",
            [chat_id, user_id]
        );
        // Đánh dấu token đã dùng
        await db.query("UPDATE link_tokens SET used = 1 WHERE token = ?", [token]);

        await sendTo(chat_id,
            `✅ *Kết nối thành công!*\n\nTài khoản *${name}* đã được liên kết.\nBạn sẽ nhận cảnh báo cháy/gas tại đây.`
        );

        // Ghi log
        await db.query(
            `INSERT INTO alert_logs (type, message, sent_to, notified)
             VALUES ('INFO', ?, ?, 1)`,
            [`User ${name} linked Telegram`, JSON.stringify([chat_id])]
        );
        return;
    }

    // /status  →  xem trạng thái hệ thống
    if (text === "/status") {
        const [userRows] = await db.query(
            "SELECT COUNT(*) AS total, SUM(verified) AS linked FROM users"
        );
        const [logRows] = await db.query(
            "SELECT type, COUNT(*) AS cnt FROM alert_logs GROUP BY type"
        );

        const { total, linked } = userRows[0];
        const logSummary = logRows.map(r => `  • ${r.type}: ${r.cnt} lần`).join("\n") || "  Chưa có log";

        await sendTo(chat_id,
            `📊 *TRẠNG THÁI HỆ THỐNG*\n\n👥 Users: ${total} (${linked || 0} đã link)\n\n📋 *Lịch sử cảnh báo:*\n${logSummary}`
        );
        return;
    }

    // Lệnh không nhận ra
    await sendTo(chat_id, "ℹ️ Các lệnh hỗ trợ:\n/start - Khởi động\n/link <token> - Kết nối tài khoản\n/status - Trạng thái hệ thống");
}

// ─── Polling loop ─────────────────────────────────────────────────────────────
let offset = 0;
async function startPolling() {
    console.log("[BOT] Polling started...");
    while (true) {
        try {
            const { data } = await axios.get(`${BASE}/getUpdates`, {
                params: { offset, timeout: 30 },
                timeout: 35000
            });

            for (const update of data.result) {
                offset = update.update_id + 1;
                handleUpdate(update).catch(e => console.error("[BOT] handleUpdate error:", e.message));
            }
        } catch (err) {
            if (!axios.isCancel(err)) {
                console.error("[BOT] Polling error:", err.message);
                await new Promise(r => setTimeout(r, 5000)); // chờ 5s rồi retry
            }
        }
    }
}
// Alias để tương thích với code cũ
async function sendTelegram(message) {
    return sendToAll(message);
}

module.exports = { sendTo, sendToAll, sendAlert, sendRecovery, sendTelegram, startPolling };