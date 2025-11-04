// API Configuration
const API_BASE_URL = 'http://localhost:4000/api';

const API_ENDPOINTS = {
    LOGIN: `${API_BASE_URL}/auth/login`,
    STUDENT_INFO: (studentId) => `${API_BASE_URL}/student/${studentId}`,
    SEMESTERS: (studentId) => `${API_BASE_URL}/transaction/semesters/${studentId}`,
    TRANSACTION_INIT: `${API_BASE_URL}/transaction/initialize`,
    TRANSACTION_COMPLETE: `${API_BASE_URL}/transaction/complete`,
    RESEND_OTP: `${API_BASE_URL}/transaction/send_otp`,
};

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Helper function to make API calls
async function apiCall(url, options = {}) {
    const token = localStorage.getItem('token');

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }

    return data;
}
