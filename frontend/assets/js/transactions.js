// Transaction History page logic
const auth = requireAuth();
if (!auth) {
  throw new Error("Not authenticated");
}

let currentTransactionToCancel = null;

// Load all transactions
async function loadTransactionHistory(statusFilter = '') {
  try {
    const url = statusFilter
      ? `${API_ENDPOINTS.TRANSACTION_HISTORY}?status=${statusFilter}`
      : API_ENDPOINTS.TRANSACTION_HISTORY;

    const data = await apiCall(url);
    const container = document.getElementById("transactionsContainer");

    if (data.transactions.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-5">
          <i class="bi bi-inbox" style="font-size: 3rem"></i>
          <p class="mt-2">No transactions found</p>
        </div>
      `;
      return;
    }

    // Group transactions by status
    const grouped = {
      pending: [],
      otp_sent: [],
      completed: [],
      failed: []
    };

    data.transactions.forEach(tx => {
      if (grouped[tx.status]) {
        grouped[tx.status].push(tx);
      }
    });

    // Build HTML
    let html = '';

    // Pending/OTP Sent transactions (actionable)
    const actionableTransactions = [...grouped.pending, ...grouped.otp_sent];
    if (actionableTransactions.length > 0 && !statusFilter) {
      html += `
        <div class="mb-4">
          <h6 class="text-warning mb-3">
            <i class="bi bi-exclamation-circle"></i> Pending Transactions
          </h6>
      `;
      actionableTransactions.forEach(tx => {
        html += createTransactionCard(tx, true);
      });
      html += `</div>`;
    } else if (statusFilter === 'pending' || statusFilter === 'otp_sent') {
      actionableTransactions.forEach(tx => {
        html += createTransactionCard(tx, true);
      });
    }

    // Completed transactions
    if (grouped.completed.length > 0 && (!statusFilter || statusFilter === 'completed')) {
      if (!statusFilter) {
        html += `
          <div class="mb-4">
            <h6 class="text-success mb-3">
              <i class="bi bi-check-circle"></i> Completed Transactions
            </h6>
        `;
      }
      grouped.completed.forEach(tx => {
        html += createTransactionCard(tx, false);
      });
      if (!statusFilter) {
        html += `</div>`;
      }
    }

    // Failed transactions
    if (grouped.failed.length > 0 && (!statusFilter || statusFilter === 'failed')) {
      if (!statusFilter) {
        html += `
          <div class="mb-4">
            <h6 class="text-danger mb-3">
              <i class="bi bi-x-circle"></i> Failed/Cancelled Transactions
            </h6>
        `;
      }
      grouped.failed.forEach(tx => {
        html += createTransactionCard(tx, false);
      });
      if (!statusFilter) {
        html += `</div>`;
      }
    }

    container.innerHTML = html;

    // Attach event listeners for cancel buttons
    document.querySelectorAll('.btn-cancel-transaction').forEach(btn => {
      btn.addEventListener('click', handleCancelClick);
    });

  } catch (error) {
    console.error('Failed to load transactions:', error);
    document.getElementById("transactionsContainer").innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Failed to load transactions: ${error.message}
      </div>
    `;
  }
}

// Check for pending transactions and show alert
async function checkPendingTransactions() {
  try {
    const data = await apiCall(API_ENDPOINTS.PENDING_TRANSACTIONS);
    if (data.pending_transactions && data.pending_transactions.length > 0) {
      const alertDiv = document.getElementById('pendingAlert');
      const countSpan = document.getElementById('pendingCount');
      countSpan.textContent = data.count;
      alertDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('Failed to check pending transactions:', error);
  }
}

// Create transaction card HTML
function createTransactionCard(tx, showActions) {
  const statusBadge = getStatusBadge(tx.status);
  const formattedDate = new Date(tx.created_at).toLocaleString('vi-VN');
  const isExpired = tx.is_expired || false;

  let actions = '';
  if (showActions && (tx.status === 'pending' || tx.status === 'otp_sent')) {
    if (isExpired) {
      actions = `
        <span class="badge bg-danger">Expired</span>
        <button class="btn btn-sm btn-danger btn-cancel-transaction ms-2" data-transaction-id="${tx.id}">
          <i class="bi bi-x-circle"></i> Cancel
        </button>
      `;
    } else {
      actions = `
        <a href="payment.html?transaction_id=${tx.id}" class="btn btn-sm btn-primary">
          <i class="bi bi-arrow-right-circle"></i> Resume
        </a>
        <button class="btn btn-sm btn-outline-danger btn-cancel-transaction ms-2" data-transaction-id="${tx.id}">
          <i class="bi bi-x-circle"></i> Cancel
        </button>
      `;
    }
  }

  const failedAttemptsInfo = tx.failed_otp_attempts > 0
    ? `<small class="text-danger d-block">Failed OTP attempts: ${tx.failed_otp_attempts}/3</small>`
    : '';

  const completedInfo = tx.completed_at
    ? `<small class="text-muted d-block">Completed: ${new Date(tx.completed_at).toLocaleString('vi-VN')}</small>`
    : '';

  return `
    <div class="card mb-3 ${isExpired ? 'border-danger' : ''}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-2">
              <h6 class="mb-0 me-2">Transaction #${tx.id}</h6>
              ${statusBadge}
            </div>
            <p class="mb-1">
              <strong>Student:</strong> ${tx.student_name} (${tx.student_id})
            </p>
            <p class="mb-1">
              <strong>Semester:</strong> ${tx.semester} - ${tx.academic_year}
            </p>
            <p class="mb-2">
              <strong>Amount:</strong> <span class="text-danger fw-bold">${formatCurrency(tx.amount)}</span>
            </p>
            <small class="text-muted">Created: ${formattedDate}</small>
            ${completedInfo}
            ${failedAttemptsInfo}
          </div>
          <div class="text-end">
            ${actions}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Get status badge HTML
function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge bg-warning text-dark">Pending</span>',
    'otp_sent': '<span class="badge bg-info">OTP Sent</span>',
    'completed': '<span class="badge bg-success">Completed</span>',
    'failed': '<span class="badge bg-danger">Failed</span>'
  };
  return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

// Handle cancel button click
function handleCancelClick(event) {
  const transactionId = event.currentTarget.getAttribute('data-transaction-id');
  currentTransactionToCancel = transactionId;
  const modal = new bootstrap.Modal(document.getElementById('cancelModal'));
  modal.show();
}

// Confirm cancel transaction
async function cancelTransaction() {
  if (!currentTransactionToCancel) return;

  const confirmBtn = document.getElementById('confirmCancelBtn');
  const originalText = confirmBtn.innerHTML;
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Cancelling...';

  try {
    await apiCall(API_ENDPOINTS.TRANSACTION_CANCEL, {
      method: 'POST',
      body: JSON.stringify({ transaction_id: currentTransactionToCancel })
    });

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('cancelModal'));
    modal.hide();

    // Show success message
    showAlert('Transaction cancelled successfully', 'success');

    // Reload transactions
    const statusFilter = document.getElementById('statusFilter').value;
    await loadTransactionHistory(statusFilter);

    currentTransactionToCancel = null;
  } catch (error) {
    showAlert(`Failed to cancel transaction: ${error.message}`, 'danger');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalText;
  }
}

// Show alert message
function showAlert(message, type) {
  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  const container = document.querySelector('.container');
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = alertHtml;
  container.insertBefore(tempDiv.firstElementChild, container.firstElementChild);
}

// Event listeners
document.getElementById('statusFilter').addEventListener('change', (e) => {
  loadTransactionHistory(e.target.value);
});

document.getElementById('confirmCancelBtn').addEventListener('click', cancelTransaction);

// Initial load
checkPendingTransactions();
loadTransactionHistory();
