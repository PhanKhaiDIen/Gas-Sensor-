require("dotenv").config();

module.exports = {
    SERIAL_PATH: "COM1",
    TELEGRAM: {
        BOT_TOKEN: process.env.BOT_TOKEN,
        CHAT_ID: process.env.CHAT_ID
    }
};