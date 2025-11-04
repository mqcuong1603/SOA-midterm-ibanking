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
