/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: login_logout.js – Login & Logout Functions                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function performLogin() {
  const id = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-pass').value;
  
  const user = appWorkers.find(w => w.login === id && w.pass === pass && w.login !== '');
  if (user) {
    app.currentUser = user;
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('login-error').style.display = 'none';
    showToast(`Welcome, ${user.name}`);
    if (tableLayout.length > 0) {
      showSection(tableLayout[0].id);
    } else {
      showSection('dashboard');
    }
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

function performLogout() {
  app.currentUser = null;
  document.getElementById('login-modal').classList.add('active');
  document.getElementById('slide-out-menu').classList.remove('active');
  document.getElementById('login-pass').value = '';
  
  if (!app.isReadOnly) {
    document.getElementById('current-table-display').textContent = '--';
    app.currentOrder = [];
    if (typeof renderOrderList === 'function') renderOrderList();
    document.body.classList.add('hide-cart');
  }
  
  showToast('Logged Out Successfully');
}

document.addEventListener('DOMContentLoaded', () => {
  const passInput = document.getElementById('login-pass');
  if (passInput) {
    passInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') performLogin();
    });
  }
  const idInput = document.getElementById('login-id');
  if (idInput) {
    idInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('login-pass').focus();
    });
  }
});