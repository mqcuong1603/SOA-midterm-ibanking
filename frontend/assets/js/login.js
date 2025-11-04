// Login page logic
redirectIfAuthenticated();

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');

// Toggle password visibility
togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    eyeIcon.classList.toggle('bi-eye');
    eyeIcon.classList.toggle('bi-eye-slash');
});

// Handle login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Hide error message
    errorMessage.classList.add('d-none');

    // Show loading state
    document.getElementById('loginText').classList.add('d-none');
    document.getElementById('loginSpinner').classList.remove('d-none');
    loginBtn.disabled = true;

    try {
        const data = await apiCall(API_ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        // Save authentication data
        saveAuth(data.token, data.user);

        // Redirect to dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('d-none');

        // Reset loading state
        document.getElementById('loginText').classList.remove('d-none');
        document.getElementById('loginSpinner').classList.add('d-none');
        loginBtn.disabled = false;
    }
});
