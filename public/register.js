
        function showAlert(id, msg, type = 'error') {
            const el = document.getElementById(id);
            el.textContent = msg;
            el.className = 'alert-box ' + type + ' show';
        }

        function setLoading(btnId, loading, label) {
            const btn = document.getElementById(btnId);
            btn.disabled = loading;
            btn.innerHTML = loading ? `<div class="spinner"></div>` : `<span>${label}</span>`;
        }

        function checkPass() {
            const pass = document.getElementById('reg-pass').value;
            const hint = document.getElementById('pass-hint');
            const input = document.getElementById('reg-pass');
            if (pass.length === 0) {
                input.className = ''; hint.textContent = '// Tối thiểu 8 ký tự';
                hint.style.color = '';
            } else if (pass.length < 8) {
                input.classList.add('invalid');
                hint.textContent = `// Cần thêm ${8 - pass.length} ký tự nữa`;
                hint.style.color = 'rgba(255,65,105,0.7)';
            } else {
                input.classList.remove('invalid');
                input.classList.add('valid');
                hint.textContent = '// ✓ Đủ độ dài';
                hint.style.color = 'rgba(0,255,136,0.6)';
            }
        }

        function setStep(n) {
            document.querySelectorAll('.step-item').forEach((el, i) => {
                el.classList.remove('active', 'done');
                if (i + 1 < n) el.classList.add('done');
                else if (i + 1 === n) el.classList.add('active');
            });
        }

        async function doRegister() {
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const pass = document.getElementById('reg-pass').value;
            const pass2 = document.getElementById('reg-pass2').value;

            // 1. Kiểm tra điền đầy đủ thông tin (Sửa lỗi ID reg_alert thành reg-alert)
    if (!name || !email || !pass) return showAlert('reg-alert', '// ERROR: Vui lòng điền đầy đủ thông tin.');
    
    // 2. Kiểm tra định dạng Email (Regex nghiêm ngặt để chặn .con, .abc...)
    // 2. Kiểm tra định dạng Email (Sử dụng danh sách đuôi tên miền hợp lệ để chặn .con)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|vn|net|org|edu|gov)$/;
    
    if (!emailRegex.test(email)) {
        return showAlert('reg-alert', '// ERROR: lỗi định dạng email');
    }

    // 3. Kiểm tra độ dài mật khẩu
    if (pass.length < 8) return showAlert('reg-alert', '// ERROR: Mật khẩu tối thiểu 8 ký tự.');
    
    // 4. Kiểm tra mật khẩu xác nhận (Cập nhật câu báo lỗi theo yêu cầu của Duy)
    if (pass !== pass2) {
        return showAlert('reg-alert', '// ERROR: xác nhận lại mật khẩu sai');
    }
            

            setLoading('btn-reg', true);
            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password: pass })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                showAlert('reg-alert', '// SUCCESS: Tài khoản đã được tạo! Kết nối Telegram bên dưới.', 'success');
                document.getElementById('reg-form').style.display = 'none';

                // Show telegram box
                document.getElementById('tg-cmd').textContent = data.instruction;
                document.getElementById('tg-box').classList.add('show');

                setStep(2);
            } catch (e) {
                showAlert('reg-alert', '// ERROR: ' + e.message);
            } finally {
                setLoading('btn-reg', false, '▶ TẠO TÀI KHOẢN');
            }
        }

        function copyCmd() {
            const cmd = document.getElementById('tg-cmd').textContent;
            navigator.clipboard?.writeText(cmd);
            document.getElementById('tg-cmd').textContent = '✓ ĐÃ COPY VÀO CLIPBOARD';
            setTimeout(() => { document.getElementById('tg-cmd').textContent = cmd; }, 1800);
        }

    function togglePass(id, el) {
    const input = document.getElementById(id);
    const svg = el.querySelector('svg');
    if (input.type === "password") {
        input.type = "text";
        svg.style.color = "#00d4ff"; // Hiện mật khẩu - đổi màu xanh
    } else {
        input.type = "password";
        svg.style.color = "#4a5568"; // Ẩn mật khẩu - về màu xám
    }
}
/// register.js - Dán vào cuối file
(function() {
    const nameInput = document.getElementById('reg-name');
    if (nameInput) {
        // Tắt tính năng tự động gợi ý của trình duyệt để tránh xung đột
        nameInput.setAttribute('spellcheck', 'false');
        
        nameInput.addEventListener('blur', function() {
            let value = this.value.trim();
            if (value) {
                this.value = value.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
            }
        });
    }
})();