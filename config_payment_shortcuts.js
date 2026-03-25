/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: config_payment_shortcuts.js – Payment Methods and Shortcuts Config   ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function savePayMethod() {
  const m = document.getElementById('pm-name').value.trim();
  if (!m) return;
  if (appSettings.paymentMethods.includes(m)) {
    showCustomAlert("Duplicate", "This payment method already exists.");
    return;
  }
  appSettings.paymentMethods.push(m);
  localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
  renderConfigContent();
  showToast("Method Added");
}

function deletePayMethod(idx) {
  if (appSettings.paymentMethods[idx] === 'Cash' || appSettings.paymentMethods[idx] === 'Udhaar') {
    showCustomAlert("Denied", "Cannot delete 'Cash' or 'Udhaar' payment methods.");
    return;
  }
  appSettings.paymentMethods.splice(idx, 1);
  localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
  renderConfigContent();
  showToast("Method Removed");
}

let currentShortcutBeingAssigned = null;

function assignShortcutKey(idx) {
  if (!hasPerm('editRoles')) return showCustomAlert("Denied", "Admin authorization required to customize shortcuts.");
  
  currentShortcutBeingAssigned = appSettings.shortcuts[idx];
  const inputField = document.getElementById(`shortcut-${idx}-key`);
  inputField.value = "Press new key combination...";
  inputField.classList.add('active');
  inputField.focus();
  
  document.removeEventListener('keydown', performKeyboardShortcut);
  
  const keyListener = function(e) {
    e.preventDefault();
    const newKey = parseKeyEvent(e);
    
    const conflict = appSettings.shortcuts.find(s => s.id !== currentShortcutBeingAssigned.id && s.currentKey === newKey);
    if (conflict) {
      showCustomAlert("Conflict Detected", `This key combination is already assigned to "${conflict.name}". Please choose another.`);
      inputField.value = currentShortcutBeingAssigned.currentKey;
    } else {
      inputField.value = newKey;
      currentShortcutBeingAssigned.currentKey = newKey;
      showToast(`"${currentShortcutBeingAssigned.name}" assigned to ${newKey}`);
    }
    inputField.classList.remove('active');
    
    document.addEventListener('keydown', performKeyboardShortcut);
    document.removeEventListener('keydown', keyListener);
  };
  document.addEventListener('keydown', keyListener);
}

function testShortcut(idx) {
  const shortcut = appSettings.shortcuts[idx];
  showToast(`Testing "${shortcut.name}". Action: ${shortcut.action}`);
  if (shortcut.perm && !hasPerm(shortcut.perm)) {
    showCustomAlert("Permission Test", `User lacks "${shortcut.perm}" for this shortcut.`);
  }
}

function resetShortcutDefault(idx) {
  if (!hasPerm('editRoles')) return showCustomAlert("Denied", "Admin authorization required to reset shortcuts.");
  appSettings.shortcuts[idx].currentKey = appSettings.shortcuts[idx].defaultKey;
  document.getElementById(`shortcut-${idx}-key`).value = appSettings.shortcuts[idx].defaultKey;
  showToast(`"${appSettings.shortcuts[idx].name}" reset to default.`);
  localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
  renderConfigContent();
}

function saveConfigShortcuts() {
  if (!hasPerm('editRoles')) return showCustomAlert("Denied", "Admin authorization required to save shortcuts.");
  localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
  showToast("Shortcuts Saved!");
  document.removeEventListener('keydown', performKeyboardShortcut);
  document.addEventListener('keydown', performKeyboardShortcut);
}