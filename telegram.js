const axios = require("axios");
const { TELEGRAM } = require("./config");

let alertSent = false;

async function sendTelegram(message) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM.BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM.CHAT_ID,
                text: message,
                parse_mode: "Markdown"
            }
        );
        console.log("[TELEGRAM ✓] Sent");
    } catch (err) {
        console.error("[TELEGRAM ✗]", err.response?.data || err.message);
    }
}

async function sendAlert(gas, temp, status) {
    if (alertSent) return;
    alertSent = true;

    const time = new Date().toLocaleString("vi-VN");

    let content = status === 3
        ? `🔥 *CANH BAO CHAY!*\n🌡 ${temp.toFixed(1)}°C\n💨 ${Math.round(gas)}\n🕐 ${time}`
        : `☠ *CANH BAO GAS!*\n💨 ${Math.round(gas)}\n🌡 ${temp.toFixed(1)}°C\n🕐 ${time}`;

    await sendTelegram(content);

    setTimeout(() => alertSent = false, 60000);
}

async function sendRecovery(temp, gas) {
    const time = new Date().toLocaleString("vi-VN");

    await sendTelegram(
        `✅ AN TOAN LAI\n🌡 ${temp.toFixed(1)}°C\n💨 ${Math.round(gas)}\n🕐 ${time}`
    );

    alertSent = false;
}

module.exports = {
    sendTelegram,
    sendAlert,
    sendRecovery
};