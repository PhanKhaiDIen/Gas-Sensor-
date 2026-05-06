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

        const match = /G:([\d.]+),T:([\d.]+),S:(\d+)/.exec(line);
        if (!match) return;

        onData({
            gas: parseFloat(match[1]),
            temp: parseFloat(match[2]),
            status: parseInt(match[3])
        });
    });

    return port;
}

module.exports = { initSerial };