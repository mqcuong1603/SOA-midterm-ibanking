function showModal(msg) {
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content">
      <p>${msg}</p>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.remove(), 2000);
}
