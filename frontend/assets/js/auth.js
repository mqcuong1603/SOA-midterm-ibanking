// Authentication utilities

function saveAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function getAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        return null;
    }

    return {
        token,
        user: JSON.parse(userStr)
    };
}

function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function requireAuth() {
    const auth = getAuth();
    if (!auth) {
        window.location.href = 'index.html';
        return null;
    }
    return auth;
}

function redirectIfAuthenticated() {
    const auth = getAuth();
    if (auth) {
        window.location.href = 'dashboard.html';
    }
}

// Logout functionality
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuth();
            window.location.href = 'index.html';
        });
    }
});
