// Payment page logic
const auth = requireAuth();
if (!auth) {
  throw new Error("Not authenticated");
}

// Get payment data from localStorage
const paymentDataStr = localStorage.getItem("paymentData");
if (!paymentDataStr) {
  window.location.href = "student-search.html";
  throw new Error("No payment data");
}

const paymentData = JSON.parse(paymentDataStr);

// Display payment details
document.getElementById(
  "studentInfo"
).textContent = `${paymentData.studentName} (${paymentData.studentId})`;
document.getElementById(
  "semesterInfo"
).textContent = `${paymentData.semester} - ${paymentData.academicYear}`;
document.getElementById("amountInfo").textContent = formatCurrency(
  paymentData.amount
);

// OTP input handling
const otpInputs = document.querySelectorAll(".otp-input");
const otpForm = document.getElementById("otpForm");
const verifyBtn = document.getElementById("verifyBtn");
const resendBtn = document.getElementById("resendBtn");
const otpError = document.getElementById("otpError");

// Auto-focus next input
otpInputs.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    if (e.target.value.length === 1 && index < otpInputs.length - 1) {
      otpInputs[index + 1].focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      otpInputs[index - 1].focus();
    }
  });

  // Only allow numbers
  input.addEventListener("keypress", (e) => {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  });

  // Handle paste
  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length === 6) {
      for (let i = 0; i < 6; i++) {
        otpInputs[i].value = pastedData[i];
      }
      otpInputs[5].focus();
    }
  });
});

let transactionId = null;
let paymentCompleted = false;
let otpExpiryTime = null;
let otpTimerInterval = null;
let resendTimerInterval = null;
let resendAvailableTime = null;
let isResuming = false;

// Get query parameter from URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Format time as MM:SS
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Start OTP expiry countdown timer
function startOTPTimer() {
  // OTP expires in 5 minutes
  otpExpiryTime = Date.now() + 5 * 60 * 1000;
  const timerElement = document.getElementById("otpTimer");

  // Clear existing timer
  if (otpTimerInterval) {
    clearInterval(otpTimerInterval);
  }

  otpTimerInterval = setInterval(() => {
    const remainingMs = otpExpiryTime - Date.now();

    if (remainingMs <= 0) {
      clearInterval(otpTimerInterval);
      timerElement.textContent = "Expired";
      timerElement.classList.remove("bg-warning", "text-dark");
      timerElement.classList.add("bg-danger", "text-white");

      // Disable verify button
      verifyBtn.disabled = true;
      otpError.textContent = "OTP has expired. Please request a new one.";
      otpError.classList.remove("d-none");
    } else {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      timerElement.textContent = formatTime(remainingSeconds);

      // Change color when less than 1 minute remaining
      if (remainingSeconds <= 60) {
        timerElement.classList.remove("bg-warning", "text-dark");
        timerElement.classList.add("bg-danger", "text-white");
      }
    }
  }, 1000);
}

// Start resend OTP cooldown timer
function startResendTimer() {
  // Resend available after 60 seconds
  resendAvailableTime = Date.now() + 60 * 1000;
  const resendTimerElement = document.getElementById("resendTimer");
  const resendTextElement = document.getElementById("resendText");

  resendBtn.disabled = true;

  // Clear existing timer
  if (resendTimerInterval) {
    clearInterval(resendTimerInterval);
  }

  resendTimerInterval = setInterval(() => {
    const remainingMs = resendAvailableTime - Date.now();

    if (remainingMs <= 0) {
      clearInterval(resendTimerInterval);
      resendBtn.disabled = false;
      resendTimerElement.textContent = "";
      resendTextElement.textContent = "Resend OTP";
    } else {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      resendTimerElement.textContent = `Can resend in ${remainingSeconds}s`;
      resendTextElement.textContent = "Resend OTP";
    }
  }, 1000);
}

// Initialize payment
async function initializePayment() {
  const loadingCard = document.getElementById("loadingCard");
  const otpCard = document.getElementById("otpCard");

  loadingCard.classList.remove("d-none");
  otpCard.classList.add("d-none");

  try {
    const data = await apiCall(API_ENDPOINTS.TRANSACTION_INIT, {
      method: "POST",
      body: JSON.stringify({
        student_id: paymentData.studentId,
        tuition_id: paymentData.tuitionId,
      }),
    });

    transactionId = data.transaction.id;
    document.getElementById("transactionId").textContent = `#${transactionId}`;

    // Show OTP card
    loadingCard.classList.add("d-none");
    otpCard.classList.remove("d-none");

    // Start timers
    startOTPTimer();
    startResendTimer();

    // Focus first input
    otpInputs[0].focus();
  } catch (error) {
    alert(`Failed to initialize payment: ${error.message}`);
    window.location.href = "student-search.html";
  }
}

// Resume existing transaction
async function resumeTransaction(txId) {
  const loadingCard = document.getElementById("loadingCard");
  const otpCard = document.getElementById("otpCard");

  loadingCard.classList.remove("d-none");
  otpCard.classList.add("d-none");

  try {
    // Get pending transactions to verify this transaction exists and is valid
    const data = await apiCall(API_ENDPOINTS.PENDING_TRANSACTIONS);
    const transaction = data.pending_transactions.find(tx => tx.id === parseInt(txId));

    if (!transaction) {
      alert("Transaction not found or has expired. Please start a new payment.");
      window.location.href = "student-search.html";
      return;
    }

    // Check if transaction is expired
    if (transaction.is_expired) {
      alert("This transaction has expired. Please cancel it and start a new payment.");
      window.location.href = "transactions.html";
      return;
    }

    // Check if transaction has too many failed attempts
    if (transaction.failed_otp_attempts >= 3) {
      alert("This transaction has been locked due to too many failed OTP attempts. Please cancel it and start a new payment.");
      window.location.href = "transactions.html";
      return;
    }

    // Set transaction ID
    transactionId = transaction.id;
    document.getElementById("transactionId").textContent = `#${transactionId}`;

    // Update payment data display
    document.getElementById("studentInfo").textContent = `${transaction.student_name} (${transaction.student_id})`;
    document.getElementById("semesterInfo").textContent = `${transaction.semester} - ${transaction.academic_year}`;
    document.getElementById("amountInfo").textContent = formatCurrency(transaction.amount);

    // Resend OTP to ensure user has a fresh code
    await apiCall(API_ENDPOINTS.RESEND_OTP, {
      method: "POST",
      body: JSON.stringify({
        transaction_id: transactionId,
      }),
    });

    // Show OTP card
    loadingCard.classList.add("d-none");
    otpCard.classList.remove("d-none");

    // Start timers
    startOTPTimer();
    startResendTimer();

    // Focus first input
    otpInputs[0].focus();

    // Show info message if there were previous failed attempts
    if (transaction.failed_otp_attempts > 0) {
      const remainingAttempts = 3 - transaction.failed_otp_attempts;
      otpError.textContent = `Warning: ${transaction.failed_otp_attempts} failed attempt(s). ${remainingAttempts} remaining.`;
      otpError.classList.remove("d-none");
    }
  } catch (error) {
    alert(`Failed to resume transaction: ${error.message}`);
    window.location.href = "transactions.html";
  }
}

// Verify OTP and complete payment
otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join("");

  if (otp.length !== 6) {
    otpError.textContent = "Please enter complete OTP code";
    otpError.classList.remove("d-none");
    return;
  }

  // Hide error
  otpError.classList.add("d-none");

  // Show loading
  document.getElementById("verifyText").classList.add("d-none");
  document.getElementById("verifySpinner").classList.remove("d-none");
  verifyBtn.disabled = true;
  resendBtn.disabled = true;

  try {
    const data = await apiCall(API_ENDPOINTS.TRANSACTION_COMPLETE, {
      method: "POST",
      body: JSON.stringify({
        transaction_id: transactionId,
        otp_code: otp,
      }),
    });

    // Clean up timers
    cleanupTimers();

    // Hide OTP card
    document.getElementById("otpCard").classList.add("d-none");

    // Update progress
    document.getElementById("step2").innerHTML = `
            <div class="rounded-circle bg-success text-white mx-auto d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                <i class="bi bi-check"></i>
            </div>
            <small class="text-muted mt-1 d-block">Verify OTP</small>
        `;

    // Show success card
    document.getElementById("newBalance").textContent = formatCurrency(
      data.new_balance
    );
    document.getElementById("successCard").classList.remove("d-none");

    // Clear payment data
    localStorage.removeItem("paymentData");

    // Update user balance in localStorage
    const user = JSON.parse(localStorage.getItem("user"));
    user.balance = data.new_balance;
    localStorage.setItem("user", JSON.stringify(user));

    // Mark payment as completed
    paymentCompleted = true;
  } catch (error) {
    otpError.textContent = error.message;
    otpError.classList.remove("d-none");

    // Reset loading
    document.getElementById("verifyText").classList.remove("d-none");
    document.getElementById("verifySpinner").classList.add("d-none");
    verifyBtn.disabled = false;
    resendBtn.disabled = false;

    // Clear OTP inputs
    otpInputs.forEach((input) => (input.value = ""));
    otpInputs[0].focus();
  }
});

// Resend OTP
resendBtn.addEventListener("click", async () => {
  const originalHTML = resendBtn.innerHTML;
  resendBtn.disabled = true;
  resendBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm"></span> Sending...';

  try {
    await apiCall(API_ENDPOINTS.RESEND_OTP, {
      method: "POST",
      body: JSON.stringify({
        transaction_id: transactionId,
      }),
    });

    // Show success message
    const successMsg = document.createElement("div");
    successMsg.className = "alert alert-success alert-dismissible fade show";
    successMsg.innerHTML = `
            <i class="bi bi-check-circle"></i> OTP has been resent to your email
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
    otpError.parentElement.insertBefore(successMsg, otpError);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      successMsg.remove();
    }, 3000);

    // Clear OTP inputs and error
    otpInputs.forEach((input) => (input.value = ""));
    otpError.classList.add("d-none");
    otpInputs[0].focus();

    // Re-enable verify button and restart timers
    verifyBtn.disabled = false;
    startOTPTimer();
    startResendTimer();
  } catch (error) {
    // Show error if it's a rate limit error
    if (error.message.includes("wait")) {
      otpError.textContent = error.message;
      otpError.classList.remove("d-none");
    } else {
      alert(`Failed to resend OTP: ${error.message}`);
    }

    // Restore button state
    resendBtn.disabled = false;
    resendBtn.innerHTML = originalHTML;
  }
});

// Cleanup timers
function cleanupTimers() {
  if (otpTimerInterval) {
    clearInterval(otpTimerInterval);
    otpTimerInterval = null;
  }
  if (resendTimerInterval) {
    clearInterval(resendTimerInterval);
    resendTimerInterval = null;
  }
}

// Cancel transaction if user leaves page without completing
window.addEventListener("beforeunload", async (e) => {
  if (transactionId && !paymentCompleted && !isResuming) {
    // Clean up timers
    cleanupTimers();

    // Show confirmation dialog
    e.preventDefault();
    e.returnValue =
      "You have a pending payment. Are you sure you want to leave?";

    // Try to cancel the transaction (only for new transactions, not resumed ones)
    try {
      await fetch(API_ENDPOINTS.TRANSACTION_CANCEL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ transaction_id: transactionId }),
        keepalive: true, // Important: allows request to complete even if page is closing
      });
    } catch (error) {
      console.error("Failed to cancel transaction:", error);
    }
  } else if (transactionId && !paymentCompleted && isResuming) {
    // For resumed transactions, just show warning but don't auto-cancel
    e.preventDefault();
    e.returnValue =
      "You have a pending payment. Are you sure you want to leave?";
  }
});

// Start payment initialization or resume existing transaction
const resumeTransactionId = getQueryParam('transaction_id');
if (resumeTransactionId) {
  isResuming = true;
  resumeTransaction(resumeTransactionId);
} else {
  initializePayment();
}
