/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: config_workers_roles.js – Workers and Roles Management               ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function editWorker(idx) {
  if (!hasPerm('editRoles')) return showCustomAlert('Denied', 'Admin authorization required to edit workers.');
  const worker = appWorkers[idx];
  if (!worker) return;
  
  editingWorkerIndex = idx;
  document.getElementById('worker-form-title').textContent = `Edit Worker: ${worker.name}`;
  document.getElementById('w-name').value = worker.name;
  document.getElementById('w-phone').value = worker.phone;
  document.getElementById('w-role').value = worker.role;
  document.getElementById('w-login').value = worker.login;
  document.getElementById('w-pass').value = worker.pass;
  const saveButton = document.querySelector('#workers-management-form .btn-modern-save');
  if (saveButton) saveButton.textContent = 'Update Worker';
  autoModernizeUI();
}

function saveWorker() {
  const name = document.getElementById('w-name').value.trim();
  const role = document.getElementById('w-role').value;
  const login = document.getElementById('w-login').value.trim();
  const pass = document.getElementById('w-pass').value;
  
  if (!name) return showCustomAlert("Validation", "Name is required");
  
  const existingName = appWorkers.find((w, i) => w.name.toLowerCase() === name.toLowerCase() && i !== editingWorkerIndex);
  if (existingName) return showCustomAlert("Duplicate Error", "Employee name already exists.");
  
  if (editingWorkerIndex !== null) {
    if (!hasPerm('editRoles')) return showCustomAlert('Denied', 'Admin authorization required to edit workers.');
    
    const workerToUpdate = appWorkers[editingWorkerIndex];
    if (workerToUpdate.role === 'Admin' && role !== 'Admin') {
      return showCustomAlert("Denied", "Cannot change the role of the primary Admin user.");
    }
    
    workerToUpdate.name = name;
    workerToUpdate.role = role;
    workerToUpdate.login = login;
    workerToUpdate.pass = pass;
    workerToUpdate.phone = document.getElementById('w-phone').value;
    showToast("Worker Updated");
    editingWorkerIndex = null;
  } else {
    appWorkers.push({ name, role, login, pass, phone: document.getElementById('w-phone').value });
    showToast("Worker Added");
  }
  
  localStorage.setItem('pos_workers', JSON.stringify(appWorkers));
  if (typeof updateAppWaitersList === 'function') updateAppWaitersList();
  renderConfigContent();
  if (typeof updateDataLists === 'function') updateDataLists();
}

function deleteWorker(idx) {
  if (!hasPerm('editRoles')) return showCustomAlert('Denied', 'Admin authorization required to delete workers.');
  
  const adminWorkers = appWorkers.filter(w => w.role === 'Admin');
  if (adminWorkers.length === 1 && appWorkers[idx].role === 'Admin') {
    return showCustomAlert("Denied", "Cannot delete the last Admin worker.");
  }
  
  appWorkers.splice(idx, 1);
  localStorage.setItem('pos_workers', JSON.stringify(appWorkers));
  if (typeof updateAppWaitersList === 'function') updateAppWaitersList();
  renderConfigContent();
  showToast("Worker Removed");
  if (typeof updateDataLists === 'function') updateDataLists();
}

function saveRolePerms(idx) {
  appRoles[idx].perms.editRoles = document.getElementById(`role-${idx}-er`).checked;
  appRoles[idx].perms.createOrder = document.getElementById(`role-${idx}-co`).checked;
  appRoles[idx].perms.transferTable = document.getElementById(`role-${idx}-tt`).checked;
  appRoles[idx].perms.transferWaiter = document.getElementById(`role-${idx}-tw`).checked;
  appRoles[idx].perms.splitOrder = document.getElementById(`role-${idx}-so`).checked;
  appRoles[idx].perms.applyDiscount = document.getElementById(`role-${idx}-ad`).checked;
  appRoles[idx].perms.applyTax = document.getElementById(`role-${idx}-at`).checked;
  appRoles[idx].perms.refund = document.getElementById(`role-${idx}-rf`).checked;
  appRoles[idx].perms.deleteActiveOrder = document.getElementById(`role-${idx}-dao`).checked;
  appRoles[idx].perms.wipeHistory = document.getElementById(`role-${idx}-wh`).checked;
  appRoles[idx].perms.manageClients = document.getElementById(`role-${idx}-mc`).checked;
  appRoles[idx].perms.manageAccounts = document.getElementById(`role-${idx}-ma`).checked;
  appRoles[idx].perms.manageVouchers = document.getElementById(`role-${idx}-mv`).checked;
  appRoles[idx].perms.viewDashboard = document.getElementById(`role-${idx}-vd`).checked;
  appRoles[idx].perms.viewReports = document.getElementById(`role-${idx}-vr`).checked;
  appRoles[idx].perms.viewHistory = document.getElementById(`role-${idx}-vh`).checked;
  appRoles[idx].perms.reprintOrder = document.getElementById(`role-${idx}-ro`).checked;
  appRoles[idx].perms.editMenu = document.getElementById(`role-${idx}-em`).checked;
  appRoles[idx].perms.modifyPrinted = document.getElementById(`role-${idx}-mp`).checked;
  
  localStorage.setItem('pos_roles', JSON.stringify(appRoles));
  showToast(appRoles[idx].name + " permissions saved");
}