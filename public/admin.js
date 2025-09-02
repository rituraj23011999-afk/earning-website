document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin page script loaded.");

    const loginSection = document.getElementById('admin-login');
    const dashboardSection = document.getElementById('admin-dashboard');
    const loginBtn = document.getElementById('admin-login-btn');
    const usersTableBody = document.querySelector('#users-table tbody');
    const userModal = document.getElementById('user-modal');
    
    // Backend का पता
    const API_BASE_URL = 'https://earning-website-backend.onrender.com';

    let adminPassword = sessionStorage.getItem('adminPassword');

    async function apiCall(endpoint, body) {
        console.log(`Calling API: ${API_BASE_URL}${endpoint}`);
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...body, password: adminPassword })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unknown error");
            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            alert(`API Error: ${error.message}`);
            return null;
        }
    }

    async function fetchAndDisplayUsers() {
        if (!adminPassword) return;
        const users = await apiCall('/admin/dashboard-data', {});
        if (users) {
            usersTableBody.innerHTML = '';
            for (const username in users) {
                const user = users[username];
                const row = document.createElement('tr');
                row.innerHTML = `<td>${username}</td><td>${user.coins}</td><td><button class="manage-btn" data-username="${username}">Manage</button></td>`;
                usersTableBody.appendChild(row);
            }
        }
    }

    loginBtn.addEventListener('click', async () => {
        console.log("Login button clicked!");
        const password = document.getElementById('admin-password').value;
        const loginErrorEl = document.getElementById('login-error');
        loginErrorEl.textContent = '';

        try {
            // लॉगिन के लिए API कॉल
            const response = await fetch(`${API_BASE_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            adminPassword = password;
            sessionStorage.setItem('adminPassword', password);
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            fetchAndDisplayUsers();
        } catch (error) {
            console.error("Login failed:", error);
            loginErrorEl.textContent = `Login Failed: ${error.message}`;
        }
    });
    
    // बाकी का कोड पहले जैसा ही रहेगा...
    document.getElementById('refresh-btn').addEventListener('click', fetchAndDisplayUsers);
    usersTableBody.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('manage-btn')) return;
        const username = e.target.dataset.username;
        const users = await apiCall('/admin/dashboard-data', {});
        if (users && users[username]) {
            const user = users[username];
            document.getElementById('modal-username').textContent = `Manage: ${username}`;
            document.getElementById('modal-body').innerHTML = `
                <h4>Update Coins</h4>
                <input type="number" id="new-coin-value" value="${user.coins}">
                <input type="text" id="update-reason" placeholder="Reason for change">
                <button id="update-coins-btn">Update Coins</button>
                <hr style="margin: 20px 0;">
                <h4>Activity Log</h4>
                <ul>${user.activity.map(log => `<li>${log}</li>`).join('')}</ul>
                <h4>Redeem Requests</h4>
                <ul>${user.redeemRequests.length > 0 ? user.redeemRequests.map(req => `<li>${req.diamonds} diamonds for FF ID: ${req.ffId}</li>`).join('') : '<li>No requests</li>'}</ul>
            `;
            userModal.style.display = 'flex';
            document.getElementById('update-coins-btn').addEventListener('click', async () => {
                const newCoinValue = document.getElementById('new-coin-value').value;
                const reason = document.getElementById('update-reason').value || 'Admin adjustment';
                await apiCall('/admin/update-user', { username, newCoinValue, reason });
                alert('User updated!');
                userModal.style.display = 'none';
                fetchAndDisplayUsers();
            });
        }
    });
    userModal.querySelector('.modal-close').addEventListener('click', () => userModal.style.display = 'none');
    if (adminPassword) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        fetchAndDisplayUsers();
    }
});