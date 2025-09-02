// यह Frontend का JavaScript है जो Backend से बात करता है।

// Backend का पता (अभी यह लोकल है, बाद में इसे बदलेंगे)
const API_BASE_URL = 'https://earning-website-backend.onrender.com'; // इसे खाली छोड़ दें, क्योंकि यह उसी सर्वर पर है

let authToken = null;

// --- YouTube IFrame API ---
let player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('yt-player', {
        height: '100%', width: '100%', videoId: '0t_Y-f22P-A',
        events: { 'onStateChange': onPlayerStateChange }
    });
}
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        addCoins(10, 'Watched a YouTube video');
    }
}

// --- API से बात करने का फंक्शन ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const options = { method, headers, body: body ? JSON.stringify(body) : null };
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        alert(`Error: ${error.message}`);
        return null;
    }
}

// --- UI को अपडेट करने वाले फंक्शन ---
const authButtons = document.getElementById('auth-buttons');
const userInfo = document.getElementById('user-profile-info');

const updateUI = (userData) => {
    if (userData) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        document.getElementById('coin-balance-display').textContent = userData.coins;
        const activityLogList = document.getElementById('activity-log-list');
        activityLogList.innerHTML = '';
        userData.activity.forEach(log => {
            const li = document.createElement('li');
            li.textContent = log;
            activityLogList.prepend(li);
        });
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }
};

const fetchAndDisplayUserData = async () => {
    const data = await apiCall('/api/user-data');
    if (data) updateUI(data);
};

const addCoins = async (amount, reason) => {
    if (!authToken) { alert('Please sign in to earn coins!'); return; }
    const result = await apiCall('/api/add-coins', 'POST', { amount, reason });
    if (result) {
        alert(`Success! ${amount} coins added.`);
        fetchAndDisplayUserData();
    }
};

// --- Modal (पॉप-अप) का लॉजिक ---
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const openModal = (isRegister) => {
    authModal.style.display = 'flex';
    loginForm.style.display = isRegister ? 'none' : 'block';
    registerForm.style.display = isRegister ? 'block' : 'none';
};
document.getElementById('signin-btn').addEventListener('click', () => openModal(false));
document.getElementById('signup-btn').addEventListener('click', () => openModal(true));
document.getElementById('modal-close-btn').addEventListener('click', () => authModal.style.display = 'none');
document.getElementById('show-register-form').addEventListener('click', () => openModal(true));
document.getElementById('show-login-form').addEventListener('click', () => openModal(false));

// --- नेविगेशन (साइडबार के लिंक) ---
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll(`.nav-link[data-target="${targetId}"]`).forEach(nav => nav.classList.add('active'));
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.toggle('active', section.id === targetId);
        });
    });
});

// --- फॉर्म्स और बटन के लिए इवेंट्स ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await apiCall('/register', 'POST', {
        username: e.target.querySelector('#register-username').value,
        password: e.target.querySelector('#register-password').value
    });
    if (result) { alert(result.message); openModal(false); }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await apiCall('/login', 'POST', {
        username: e.target.querySelector('#login-username').value,
        password: e.target.querySelector('#login-password').value
    });
    if (result && result.token) {
        authToken = result.token;
        sessionStorage.setItem('authToken', authToken);
        authModal.style.display = 'none';
        fetchAndDisplayUserData();
    }
});

document.getElementById('logout-btn-header').addEventListener('click', () => {
    authToken = null;
    sessionStorage.removeItem('authToken');
    updateUI(null);
});

document.getElementById('watch-ad-btn').addEventListener('click', (e) => {
    const btn = e.target;
    let timeLeft = 15;
    btn.disabled = true;
    const timer = setInterval(() => {
        btn.textContent = `Waiting... (${timeLeft}s)`;
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = 'Start Ad';
            addCoins(5, 'Watched an ad');
        }
    }, 1000);
});

document.getElementById('redeem-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!authToken) { alert("Please sign in first!"); return; }
    const result = await apiCall('/api/redeem', 'POST', {
        diamonds: parseInt(document.getElementById('diamonds').value, 10),
        ffId: document.getElementById('ff-id').value
    });
    if (result) { alert(result.message); fetchAndDisplayUserData(); e.target.reset(); }
});

// --- पेज लोड होने पर टोकन चेक करना ---
document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('authToken');
    if (token) { authToken = token; fetchAndDisplayUserData(); }
});