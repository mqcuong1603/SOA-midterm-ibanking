document.addEventListener("DOMContentLoaded", () => {
  const studentInput = document.getElementById("studentId");
  const infoDiv = document.getElementById("studentInfo");
  const btnFetch = document.getElementById("fetchInfo");

  // Lấy thông tin sinh viên
  btnFetch.addEventListener("click", async () => {
    if (!validateRequired(studentInput.value, "Vui lòng nhập mã sinh viên!")) return;

    try {
      const data = await apiGet(`/student-fee/${studentInput.value}`);

      document.getElementById("studentName").textContent = data.full_name;
      document.getElementById("studentFee").textContent = data.tuition_amount;
      infoDiv.style.display = "block";
    } catch {
      showModal("Không tìm thấy sinh viên!");
    }
  });

  // Nộp học phí
  document.getElementById("paymentForm").addEventListener("submit", async e => {
    e.preventDefault();

    try {
      await apiPost("/create-transaction", { student_id: studentInput.value });

      showModal("OTP đã được gửi về email của bạn!");
      setTimeout(() => (window.location.href = "./otp.html"), 1500);
    } catch {
      showModal("Lỗi khi tạo giao dịch!");
    }
  });
});
