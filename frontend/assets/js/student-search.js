// Student search page logic
const auth = requireAuth();
if (!auth) {
    throw new Error('Not authenticated');
}

const searchForm = document.getElementById('searchForm');
const studentIdInput = document.getElementById('studentId');
const searchBtn = document.getElementById('searchBtn');
const studentInfo = document.getElementById('studentInfo');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = studentIdInput.value.trim();

    // Hide previous results
    studentInfo.classList.add('d-none');
    errorState.classList.add('d-none');

    // Show loading
    loadingState.classList.remove('d-none');

    try {
        const data = await apiCall(API_ENDPOINTS.SEMESTERS(studentId));

        // Hide loading
        loadingState.classList.add('d-none');

        // Display student info
        document.getElementById('studentName').textContent = data.student.full_name;
        document.getElementById('studentIdDisplay').textContent = data.student.student_id;
        document.getElementById('studentMajor').textContent = data.student.major || 'N/A';
        document.getElementById('totalUnpaid').textContent = formatCurrency(data.total_unpaid);

        // Display semesters
        const semestersList = document.getElementById('semestersList');
        semestersList.innerHTML = '';

        if (data.semesters.length === 0) {
            semestersList.innerHTML = `
                <div class="list-group-item text-center text-muted py-4">
                    <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                    <p class="mb-0 mt-2">No unpaid semesters</p>
                </div>
            `;
        } else {
            data.semesters.forEach(semester => {
                const isPaid = semester.is_paid;
                const semesterItem = document.createElement('div');
                semesterItem.className = 'list-group-item list-group-item-action';

                semesterItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">
                                ${semester.semester} - ${semester.academic_year}
                                ${isPaid ? '<span class="badge bg-success ms-2">Paid</span>' : ''}
                            </h6>
                            <p class="mb-0 text-success fw-bold">${formatCurrency(semester.tuition_amount)}</p>
                        </div>
                        <div>
                            ${!isPaid ? `
                                <button class="btn btn-primary" onclick="initPayment('${studentId}', ${semester.id}, '${semester.semester}', '${semester.academic_year}', ${semester.tuition_amount})">
                                    <i class="bi bi-credit-card"></i> Pay
                                </button>
                            ` : `
                                <small class="text-muted">Paid on ${new Date(semester.paid_at).toLocaleDateString('vi-VN')}</small>
                            `}
                        </div>
                    </div>
                `;

                semestersList.appendChild(semesterItem);
            });
        }

        // Show student info
        studentInfo.classList.remove('d-none');

    } catch (error) {
        loadingState.classList.add('d-none');
        errorMessage.textContent = error.message;
        errorState.classList.remove('d-none');
    }
});

// Initiate payment
function initPayment(studentId, tuitionId, semester, academicYear, amount) {
    // Store payment details
    const paymentData = {
        studentId,
        tuitionId,
        semester,
        academicYear,
        amount,
        studentName: document.getElementById('studentName').textContent
    };

    localStorage.setItem('paymentData', JSON.stringify(paymentData));

    // Redirect to payment page
    window.location.href = 'payment.html';
}
