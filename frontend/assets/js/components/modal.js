function showModal(message) {
  const modal = document.createElement("div"); 
  modal.className = "modal"; 
  modal.innerHTML = `<div class='modal-content'><p>${message}</p></div>`; 
  document.body.appendChild(modal); 

  setTimeout(() => {
    modal.style.transition = "opacity 0.3s";
    modal.style.opacity = "0";
    setTimeout(() => modal.remove(), 300);
  }, 1800);
}
