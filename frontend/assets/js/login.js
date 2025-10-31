document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!validateRequired(username, "Vui lòng nhập tên đăng nhập!") || 
      !validateRequired(password, "Vui lòng nhập mật khẩu!")) return;

  try {
    const res = await apiPost("/login", { username, password });
    showModal("Đăng nhập thành công!");
    setTimeout(() => (window.location.href = "payment.html"), 1500);
  } catch (err) {
    showModal("Sai thông tin đăng nhập!");
  }
});
