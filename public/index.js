
        // ═══════════════════════════════════════
        //  AUTH GUARD
        // ═══════════════════════════════════════
        let FA_TOKEN = localStorage.getItem('fa_token');

        (async () => {
            if (!FA_TOKEN) { window.location.href = 'login.html'; return; }
            try {
                const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + FA_TOKEN } });
                if (!res.ok) { localStorage.removeItem('fa_token'); window.location.href = 'login.html'; return; }
                const user = await res.json();
                document.getElementById('header-user').textContent = user.email || user.name;
                if (user.verified) document.getElementById('tg-badge').style.display = 'inline-block';
            } catch (_) {
                localStorage.removeItem('fa_token');
                window.location.href = 'login.html';
            }
        })();

        function doLogout() {
            fetch('/api/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + FA_TOKEN } }).catch(() => { });
            localStorage.removeItem('fa_token');
            window.location.href = 'login.html';
        }

        // ═══════════════════════════════════════
        //  STATE
        // ═══════════════════════════════════════
        const state = {
            gas: 0, temp: 0, status: 0,
            fanOn: false, pumpOn: false,
            alertCount: 0,
            maxGas: 0, maxTemp: 0,
            uptime: 0,
            labels: [], gasData: [], tempData: []
        };

        // ═══════════════════════════════════════
        //  CHART
        // ═══════════════════════════════════════
        const ctx = document.getElementById('mainChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: state.labels,
                datasets: [
                    {
                        label: 'Gas',
                        data: state.gasData,
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0,212,255,0.06)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#00d4ff',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'yGas'
                    },
                    {
                        label: 'Nhiệt độ',
                        data: state.tempData,
                        borderColor: '#00ff88',
                        backgroundColor: 'rgba(0,255,136,0.05)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#00ff88',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'yTemp'
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 300 },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0d1220',
                        borderColor: 'rgba(0,212,255,0.3)', borderWidth: 1,
                        titleColor: '#4a5568', bodyColor: '#dce6ff',
                        titleFont: { family: 'Share Tech Mono' },
                        bodyFont: { family: 'Share Tech Mono' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#4a5568', font: { family: 'Share Tech Mono', size: 10 }, maxRotation: 0 },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        border: { color: 'rgba(255,255,255,0.08)' }
                    },
                    yGas: {
                        position: 'left', min: 0, max: 1023,
                        ticks: { color: '#00d4ff', font: { family: 'Share Tech Mono', size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        border: { color: 'rgba(0,212,255,0.2)' }
                    },
                    yTemp: {
                        position: 'right', min: 0, max: 100,
                        ticks: { color: '#00ff88', font: { family: 'Share Tech Mono', size: 10 } },
                        grid: { display: false },
                        border: { color: 'rgba(0,255,136,0.2)' }
                    }
                }
            }
        });

        // ═══════════════════════════════════════
        //  GAUGE ARC HELPER
        //  semicircle total length ≈ 251 (π*80)
        // ═══════════════════════════════════════
        function setArc(id, pct) {
            const arc = document.getElementById(id);
            const total = 251;
            const fill = Math.max(0, Math.min(1, pct)) * total;
            arc.style.strokeDasharray = fill + ' ' + (total - fill);
        }

        // ═══════════════════════════════════════
        //  UPDATE UI FROM DATA
        // ═══════════════════════════════════════
        function applyData(gas, temp, status) {
            state.gas = gas;
            state.temp = temp;
            state.status = status;
            state.maxGas = Math.max(state.maxGas, gas);
            state.maxTemp = Math.max(state.maxTemp, temp);

            // ── Gauges ──
            const gasPct = gas / 1023;
            const tmpPct = temp / 100;
            setArc('gasArc', gasPct);
            setArc('tmpArc', tmpPct);

            // Gas num color
            const gasCol = gas >= 700 ? 'var(--red)' : gas >= 300 ? 'var(--gold)' : 'var(--cyan)';
            document.getElementById('gasNum').style.color = gasCol;
            document.getElementById('gasNum').textContent = Math.round(gas);

            // Temp num color
            const tmpCol = temp >= 50 ? 'var(--red)' : temp >= 35 ? 'var(--gold)' : 'var(--green)';
            document.getElementById('tmpNum').style.color = tmpCol;
            document.getElementById('tmpNum').textContent = temp.toFixed(1);

            // Bar fills
            document.getElementById('gasBarWarn').style.width = Math.min(100, (gas / 300) * 100) + '%';
            document.getElementById('gasBarMax').style.width = Math.min(100, (gas / 700) * 100) + '%';
            document.getElementById('tmpBarFire').style.width = Math.min(100, (temp / 50) * 100) + '%';

            // ── LCD ──
            const lcdLine2 = 'G:' + String(Math.round(gas)).padEnd(4) + ' T:' + temp.toFixed(1) + 'C';
            let lcdLine1;
            if (status === 3) lcdLine1 = 'CHAY! XA NUOC  ';
            else if (status === 2) lcdLine1 = 'GAS NGUY HIEM! ';
            else if (status === 1) lcdLine1 = 'GAS: CANH BAO  ';
            else lcdLine1 = 'Status: AN TOAN';
            document.getElementById('lcd1').textContent = lcdLine1.substring(0, 16).padEnd(16);
            document.getElementById('lcd2').textContent = lcdLine2.substring(0, 16).padEnd(16);
            const lcdColor = status === 0 ? '#64ff50' : status === 3 ? '#ffbe32' : '#ff8040';
            document.getElementById('lcd1').style.color = lcdColor;

            // ── Alert Banner ──
            const banner = document.getElementById('alertBanner');
            const alertTxt = document.getElementById('alertText');
            let prevStatus = banner.dataset.status || '0';

            if (status === 3) {
                banner.className = 'fire';
                alertTxt.textContent = '🔥  CHÁY!  NHIỆT ĐỘ ' + temp.toFixed(1) + '°C ≥ 50°C  —  BƠM ĐANG XẢ NƯỚC!';
            } else if (status === 2) {
                banner.className = 'danger';
                alertTxt.textContent = '☠  GAS NGUY HIỂM!  MỨC ' + Math.round(gas) + ' ≥ 700  —  QUẠT + CÒI ĐANG HOẠT ĐỘNG!';
            } else if (status === 1) {
                banner.className = 'warn';
                alertTxt.textContent = '⚠  GAS CẢNH BÁO!  MỨC ' + Math.round(gas) + ' ≥ 300  —  QUẠT ĐANG BẬT';
            } else {
                banner.className = 'safe';
                alertTxt.textContent = 'HỆ THỐNG ĐANG HOẠT ĐỘNG  —  AN TOÀN';
            }
            banner.dataset.status = status;

            if (parseInt(prevStatus) < status && status > 0) {
                state.alertCount++;
                const cls = status >= 3 ? 'danger' : status === 1 ? 'warn' : 'danger';
                addLog(alertTxt.textContent, cls);
            } else if (parseInt(prevStatus) > 0 && status === 0) {
                addLog('Tro ve trang thai an toan', 'safe');
            }

            // ── Status badge ──
            const statMap = { 0: 'S:0  AN TOAN', 1: 'S:1  CANH BAO', 2: 'S:2  NGUY HIEM', 3: 'S:3  CHAY' };
            const statCol = ['var(--green)', 'var(--gold)', 'var(--orange)', 'var(--red)'];
            const el = document.getElementById('threshStatus');
            el.textContent = statMap[status] || 'UNKNOWN';
            el.style.color = statCol[status] || 'var(--green)';

            // ── Auto relay state reflect ──
            if (status === 3) {
                setRelayState('PUMP', true);
                setRelayState('FAN', false);
            } else if (status >= 1) {
                setRelayState('FAN', true);
            } else {
                setRelayState('FAN', false);
                setRelayState('PUMP', false);
            }

            // ── Stats ──
            document.getElementById('statMaxGas').textContent = Math.round(state.maxGas);
            document.getElementById('statMaxTemp').textContent = state.maxTemp.toFixed(1);
            document.getElementById('statAlerts').textContent = state.alertCount;

            // ── Chart ──
            const now = new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            state.labels.push(now);
            state.gasData.push(gas);
            state.tempData.push(temp);
            if (state.labels.length > 20) {
                state.labels.shift(); state.gasData.shift(); state.tempData.shift();
            }
            chart.update();
        }

        // ═══════════════════════════════════════
        //  RELAY CONTROLS
        // ═══════════════════════════════════════
        function setRelayState(device, on) {
            if (device === 'FAN') {
                if (state.fanOn === on) return;
                state.fanOn = on;
                const btn = document.getElementById('btnFan');
                btn.classList.toggle('active', on);
                document.getElementById('btnFanText').textContent = on ? 'QUẠT  —  ĐANG CHẠY' : 'QUẠT  —  TẮT';
            } else if (device === 'PUMP') {
                if (state.pumpOn === on) return;
                state.pumpOn = on;
                const btn = document.getElementById('btnPump');
                btn.classList.toggle('active', on);
                document.getElementById('btnPumpText').textContent = on ? 'BƠM NƯỚC  —  ĐANG XẢ' : 'BƠM NƯỚC  —  TẮT';
            }
        }

        function toggleDevice(device) {
            if (device === 'FAN') {
                const newState = !state.fanOn;
                setRelayState('FAN', newState);
                socket.emit('control', { device: 'FAN', state: newState ? 1 : 0 });
                addLog('Lenh tay: QUAT ' + (newState ? 'BAT' : 'TAT'), 'cmd');
            } else if (device === 'PUMP') {
                const newState = !state.pumpOn;
                setRelayState('PUMP', newState);
                socket.emit('control', { device: 'PUMP', state: newState ? 1 : 0 });
                addLog('Lenh tay: BOM ' + (newState ? 'BAT' : 'TAT'), 'cmd');
            }
        }

        function silenceAll() {
            setRelayState('FAN', false);
            setRelayState('PUMP', false);
            socket.emit('control', { device: 'SILENCE', state: 1 });
            addLog('SILENCE ALL — Tat tat ca canh bao', 'cmd');
            document.getElementById('alertBanner').className = 'safe';
            document.getElementById('alertText').textContent = 'DA TAT CANH BAO — GIAM SAT TIEP TUC';
        }

        // ═══════════════════════════════════════
        //  EVENT LOG
        // ═══════════════════════════════════════
        function addLog(msg, cls) {
            const now = new Date().toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const log = document.getElementById('eventLog');
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = '<span class="log-time">' + now + '</span>'
                + '<span class="log-msg ' + cls + '">' + msg + '</span>';
            log.insertBefore(div, log.firstChild);
            if (log.children.length > 60) log.removeChild(log.lastChild);
        }

        // ═══════════════════════════════════════
        //  CLOCK + UPTIME
        // ═══════════════════════════════════════
        setInterval(() => {
            document.getElementById('clockDisplay').textContent =
                new Date().toLocaleTimeString('vi');
            state.uptime++;
            const u = state.uptime;
            document.getElementById('statUptime').textContent =
                u < 60 ? u + 's' : u < 3600 ? Math.floor(u / 60) + 'm' : Math.floor(u / 3600) + 'h';
        }, 1000);

        // ═══════════════════════════════════════
        //  SOCKET.IO — nhận dữ liệu từ server
        //  Arduino → Node.js server → Socket.IO → Browser
        //  Server gửi: { gas, temp, status }
        // ═══════════════════════════════════════
        const socket = io();

        socket.on('sensorData', (data) => {
            applyData(
                parseFloat(data.gas) || 0,
                parseFloat(data.temp) || 0,
                parseInt(data.status) || 0
            );
        });

        socket.on('connect', () => addLog('Ket noi server thanh cong', 'safe'));
        socket.on('disconnect', () => addLog('Mat ket noi server!', 'danger'));


        // Init log
        addLog('He thong khoi dong', 'safe');
   