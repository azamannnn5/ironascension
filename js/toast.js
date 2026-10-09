/* Iron Ascension - toast notifications
   Small, auto-dismissing notifications used for success/failure feedback
   on the contact form and checkout submission. Call showToast(message,
   type) from anywhere - type is "success" or "error". Multiple toasts
   stack if triggered in quick succession. */

function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon = type === "success"
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9"></polyline></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message"></span>`;
  toast.querySelector(".toast-message").textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-in"));

  const remove = () => {
    toast.classList.remove("toast-in");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  };
  setTimeout(remove, 4500);
}
