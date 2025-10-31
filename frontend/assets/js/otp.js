document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("otpForm");

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const otp = document.getElementById("otpCode").value;

    // kiểm tra nhập trống
    if (!validateRequired(otp, "Vui lòng nhập mã OTP!")) return;

    try {
      // dùng apiPost từ api.js
      const res = await apiPost("/verify-otp", { otp_code: otp });

      showModal("Giao dịch thành công!");
      setTimeout(() => (window.location.href = "./index.html"), 1500);
    } catch {
      showModal("OTP không hợp lệ hoặc đã hết hạn!");
    }
  });
});
