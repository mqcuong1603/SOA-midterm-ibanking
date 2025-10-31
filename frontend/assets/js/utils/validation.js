function validateRequired(value, msg) {
  if (!value.trim()) {
    showModal(msg);
    return false;
  }
  return true;
}
