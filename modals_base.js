// modals_base.js – Basic Modal Functions (Alert, Confirm, Toast)
// Version: 2.1 – Safe toast (no recursion)

function showCustomAlert(title, message) {
    const modal = document.getElementById('custom-alert-modal');
    if (!modal) return;
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    modal.classList.add('active');
}

function openConfirm(title, message, callback) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const btn = document.getElementById('confirm-ok-btn');
    btn.onclick = () => {
        if (callback) callback();
        closeModal('confirm-modal');
    };
    modal.classList.add('active');
    setupEnterKeyOnModal('confirm-modal', '#confirm-ok-btn');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// Simple toast – no chance of recursion
let toastTimer = null;
function showToast(msg, type = 'info') {
    // Use console as fallback if container missing
    const container = document.getElementById('toasts');
    if (!container) {
        console.log(`[${type.toUpperCase()}] ${msg}`);
        return;
    }
    // Clear previous timeout to avoid stacking
    if (toastTimer) clearTimeout(toastTimer);
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast t-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    // Remove after 3 seconds
    toastTimer = setTimeout(() => {
        if (toast.parentNode) toast.remove();
        toastTimer = null;
    }, 3000);
}