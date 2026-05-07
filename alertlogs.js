// alertLogs.js - Lấy lịch sử cảnh báo
const db = require("./db");

// Lấy logs mới nhất (mặc định 50 bản ghi)
async function getLogs({ limit = 50, type = null, fromDate = null } = {}) {
    let sql = "SELECT * FROM alert_logs";
    const params = [];
    const where = [];

    if (type) { where.push("type = ?"); params.push(type); }
    if (fromDate) { where.push("created_at >= ?"); params.push(fromDate); }

    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(Number(limit));

    const [rows] = await db.query(sql, params);
    return rows;
}

// Thống kê theo ngày
async function getStats() {
    const [rows] = await db.query(`
        SELECT
            DATE(created_at)       AS date,
            type,
            COUNT(*)               AS count,
            AVG(temperature)       AS avg_temp,
            MAX(temperature)       AS max_temp,
            MAX(gas_level)         AS max_gas
        FROM alert_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at), type
        ORDER BY date DESC
    `);
    return rows;
}

module.exports = { getLogs, getStats };