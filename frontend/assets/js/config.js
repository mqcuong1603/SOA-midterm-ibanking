// API Configuration
const API_BASE_URL = 'http://localhost:4000/api';

const API_ENDPOINTS = {
    LOGIN: `${API_BASE_URL}/auth/login`,
    USER_PROFILE: `${API_BASE_URL}/user/profile`,
    USER_TRANSACTIONS: `${API_BASE_URL}/user/transactions`,
    STUDENT_INFO: (studentId) => `${API_BASE_URL}/student/${studentId}`,
    SEMESTERS: (studentId) => `${API_BASE_URL}/transaction/semesters/${studentId}`,
    TRANSACTION_INIT: `${API_BASE_URL}/transaction/initialize`,
    TRANSACTION_COMPLETE: `${API_BASE_URL}/transaction/complete`,
    TRANSACTION_CANCEL: `${API_BASE_URL}/transaction/cancel`,
    RESEND_OTP: `${API_BASE_URL}/transaction/send_otp`,
    PENDING_TRANSACTIONS: `${API_BASE_URL}/transaction/pending`,
    TRANSACTION_HISTORY: `${API_BASE_URL}/transaction/history`,
};

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Helper function to format semester display
function formatSemester(semester, academicYear) {
    // Convert "2024-1" to "Semester 1"
    // Convert "2024-2" to "Semester 2"
    // Convert "2024-Summer" to "Summer Semester"

    const semesterPart = semester.split('-')[1];
    let semesterName = '';

    if (semesterPart === '1') {
        semesterName = 'Semester 1';
    } else if (semesterPart === '2') {
        semesterName = 'Semester 2';
    } else if (semesterPart.toLowerCase() === 'summer') {
        semesterName = 'Summer Semester';
    } else {
        semesterName = semester; // fallback
    }

    return `${semesterName} (${academicYear})`;
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
