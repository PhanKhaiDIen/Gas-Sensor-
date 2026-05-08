const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { SERIAL_PATH } = require("./config");

function initSerial(onData) {
    const port = new SerialPort({
        path: SERIAL_PATH,
        baudRate: 9600,
        autoOpen: false
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

    port.open(err => {
        if (err) {
            console.error("[SERIAL ✗]", err.message);
            return;
        }
        console.log("[SERIAL ✓]");
    });

    parser.on("data", (line) => {
        line = line.trim();
        if (!line) return;

        // HIỆN DỮ LIỆU THÔ ĐỂ DUY KIỂM TRA TRONG TERMINAL
        console.log("[RAW FROM PROTEUS]:", line); 

        // Regex khớp với định dạng: GAS: 748 | TEMP: 39.1 C
        const match = /GAS:\s*(\d+)\s*\|\s*TEMP:\s*([\d.]+)/.exec(line);
        
        if (match) {
            const gasValue = parseFloat(match[1]);
            const tempValue = parseFloat(match[2]);

            // Tính toán Status dựa trên logic cảm biến của Duy
            let currentStatus = 0;
            if (tempValue >= 50.0) {
                currentStatus = 3; // Cháy (Fire)
            } else if (gasValue >= 700) {
                currentStatus = 2; // Nguy hiểm (Gas Danger)
            } else if (gasValue >= 300) {
                currentStatus = 1; // Cảnh báo (Gas Warning)
            }

            // Gửi dữ liệu về server.js
            onData({
                gas: gasValue,
                temp: tempValue,
                status: currentStatus
            });
        }
    });

    return port;
}

module.exports = { initSerial };