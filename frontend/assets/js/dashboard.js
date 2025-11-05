// Dashboard page logic
const auth = requireAuth();
if (!auth) {
  throw new Error("Not authenticated");
}

// Display user information
const { user } = auth;
document.getElementById("userName").textContent = user.full_name;
document.getElementById("userUsername").textContent = `@${user.username}`;
document.getElementById("userBalance").textContent = formatCurrency(
  user.balance
);

// Load transaction history
async function loadTransactionHistory() {
  try {
    const data = await apiCall(API_ENDPOINTS.USER_TRANSACTIONS);
    const historyContainer = document.getElementById("transactionHistory");

    if (data.history.length === 0) {
      historyContainer.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-inbox" style="font-size: 3rem"></i>
          <p class="mt-2">No recent transactions</p>
        </div>
      `;
      return;
    }

    historyContainer.innerHTML = '';
    data.history.forEach(item => {
      const amount = item.balance_before - item.balance_after;
      const transactionItem = document.createElement('div');
      transactionItem.className = 'list-group-item';
      transactionItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">Transaction #${item.transaction_id}</h6>
            <small class="text-muted">${new Date(item.created_at).toLocaleString('vi-VN')}</small>
          </div>
          <div class="text-end">
            <p class="mb-0 text-danger fw-bold">-${formatCurrency(amount)}</p>
            <small class="text-muted">Balance: ${formatCurrency(item.balance_after)}</small>
          </div>
        </div>
      `;
      historyContainer.appendChild(transactionItem);
    });
  } catch (error) {
    console.error('Failed to load transactions:', error);
  }
}

// Load transactions on page load
loadTransactionHistory();
