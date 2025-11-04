// Payment page logic
const auth = requireAuth();
if (!auth) {
    throw new Error('Not authenticated');
}

// Get payment data from localStorage
const paymentDataStr = localStorage.getItem('paymentData');
if (!paymentDataStr) {
    window.location.href = 'student-search.html';
    throw new Error('No payment data');
}

const paymentData = JSON.parse(paymentDataStr);

// Display payment details
document.getElementById('studentInfo').textContent = `${paymentData.studentName} (${paymentData.studentId})`;
document.getElementById('semesterInfo').textContent = `${paymentData.semester} - ${paymentData.academicYear}`;
document.getElementById('amountInfo').textContent = formatCurrency(paymentData.amount);

// OTP input handling
const otpInputs = document.querySelectorAll('.otp-input');
const otpForm = document.getElementById('otpForm');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const otpError = document.getElementById('otpError');

// Auto-focus next input
otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });

    // Only allow numbers
    input.addEventListener('keypress', (e) => {
        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });
});

let transactionId = null;

// Initialize payment
async function initializePayment() {
    const loadingCard = document.getElementById('loadingCard');
    const otpCard = document.getElementById('otpCard');

    loadingCard.classList.remove('d-none');
    otpCard.classList.add('d-none');

    try {
        const data = await apiCall(API_ENDPOINTS.TRANSACTION_INIT, {
            method: 'POST',
            body: JSON.stringify({
                student_id: paymentData.studentId,
                tuition_id: paymentData.tuitionId
            })
        });

        transactionId = data.transaction.id;
        document.getElementById('transactionId').textContent = `#${transactionId}`;

        // Show OTP card
        loadingCard.classList.add('d-none');
        otpCard.classList.remove('d-none');

        // Focus first input
        otpInputs[0].focus();

    } catch (error) {
        alert(`Failed to initialize payment: ${error.message}`);
        window.location.href = 'student-search.html';
    }
}

// Verify OTP and complete payment
otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otp = Array.from(otpInputs).map(input => input.value).join('');

    if (otp.length !== 6) {
        otpError.textContent = 'Please enter complete OTP code';
        otpError.classList.remove('d-none');
        return;
    }

    // Hide error
    otpError.classList.add('d-none');

    // Show loading
    document.getElementById('verifyText').classList.add('d-none');
    document.getElementById('verifySpinner').classList.remove('d-none');
    verifyBtn.disabled = true;
    resendBtn.disabled = true;

    try {
        const data = await apiCall(API_ENDPOINTS.TRANSACTION_COMPLETE, {
            method: 'POST',
            body: JSON.stringify({
                transaction_id: transactionId,
                otp_code: otp
            })
        });

        // Hide OTP card
        document.getElementById('otpCard').classList.add('d-none');

        // Update progress
        document.getElementById('step2').innerHTML = `
            <div class="rounded-circle bg-success text-white mx-auto d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                <i class="bi bi-check"></i>
            </div>
            <small class="text-muted mt-1 d-block">Verify OTP</small>
        `;

        // Show success card
        document.getElementById('newBalance').textContent = formatCurrency(data.new_balance);
        document.getElementById('successCard').classList.remove('d-none');

        // Clear payment data
        localStorage.removeItem('paymentData');

        // Update user balance in localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        user.balance = data.new_balance;
        localStorage.setItem('user', JSON.stringify(user));

    } catch (error) {
        otpError.textContent = error.message;
        otpError.classList.remove('d-none');

        // Reset loading
        document.getElementById('verifyText').classList.remove('d-none');
        document.getElementById('verifySpinner').classList.add('d-none');
        verifyBtn.disabled = false;
        resendBtn.disabled = false;

        // Clear OTP inputs
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();
    }
});

// Resend OTP
resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    resendBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

    try {
        await apiCall(API_ENDPOINTS.RESEND_OTP, {
            method: 'POST',
            body: JSON.stringify({
                transaction_id: transactionId
            })
        });

        alert('OTP has been resent to your email');

        // Clear OTP inputs
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();

    } catch (error) {
        alert(`Failed to resend OTP: ${error.message}`);
    } finally {
        resendBtn.disabled = false;
        resendBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Resend OTP';
    }
});

// Start payment initialization
initializePayment();
