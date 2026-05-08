let TOKEN = localStorage.getItem('fa_token');

// Auto-login check
(async () => {
    if (!TOKEN) return;
    try {
        const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + TOKEN } });
        if (res.ok) { window.location.href = 'index.html'; }
        else { localStorage.removeItem('fa_token'); }
    } catch (_) { localStorage.removeItem('fa_token'); }
})();

// Tự động điền Email cũ nhưng luôn xóa sạch ô Mật khẩu khi vào trang
window.addEventListener('load', () => {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    
    // 2. Ép xóa mật khẩu sau 100ms để chặn tính năng tự điền của trình duyệt
    setTimeout(() => {
        if (passInput) passInput.value = '';
    }, 100); 
});

// Hàm ẩn hiện mật khẩu
function togglePass(id, el) {
    const input = document.getElementById(id);
    const svg = el.querySelector('svg');
    if (input.type === "password") {
        input.type = "text";
        svg.style.color = "#00d4ff";
    } else {
        input.type = "password";
        svg.style.color = "#4a5568";
    }
}

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

async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;

    // Biểu thức kiểm tra định dạng email chung (không chỉ riêng Gmail)
    // login.js - Đoạn trong hàm doLogin
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|vn|net|org|edu|gov)$/;
    if (!emailRegex.test(email)) {
        return showAlert('login-alert', '// ERROR: lỗi định dạng email');
    }

    if (!email || !pass) return showAlert('login-alert', '// ERROR: Vui lòng điền đầy đủ thông tin.');

    setLoading('btn-login', true);
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        localStorage.setItem('fa_token', data.token);
        localStorage.setItem('last_user_email', email); 

        showAlert('login-alert', '// ACCESS GRANTED...', 'success');
        showAlert('login-alert', '// ACCESS GRANTED — Đang chuyển hướng...', 'success');
        setTimeout(() => window.location.href = 'index.html', 800);
    } catch (e) {
        showAlert('login-alert', '// ACCESS DENIED: ' + e.message);
    } finally {
        setLoading('btn-login', false, '▶ ĐĂNG NHẬP HỆ THỐNG');
    }
}