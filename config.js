/* 
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT: SYSTEM CONFIGURATION, ROLES & BACKUP (config.js)                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

const configTabs =[
    'Property Settings', 
    'Preferences (UI)', 
    'Workers Management', 
    'Security Roles', 
    'Bill Configuration', 
    'Payment Methods', 
    'Notification Printer'
];
let activeConfigTab = 'Property Settings';

function renderConfigMenu() {
    const menu = document.getElementById('conf-menu-body');
    menu.innerHTML = '';
    configTabs.forEach(tab => {
        if (tab === 'Security Roles' && !hasPerm('editRoles')) return;

        const btn = document.createElement('button');
        btn.className = `list-item-btn ${activeConfigTab === tab ? 'active' : ''}`;
        btn.textContent = tab;
        btn.onclick = () => { 
            activeConfigTab = tab; 
            renderConfigMenu(); 
            renderConfigContent(); 
        };
        menu.appendChild(btn);
    });
    renderConfigContent();
}

function renderConfigContent() {
    const body = document.getElementById('conf-content-body');
    let h = `<h3 style="margin-bottom:20px; color:var(--col-primary);">${activeConfigTab}</h3>`;

    if (activeConfigTab === 'Property Settings') {
        h += `
            <div class="modern-form-grid" style="max-width:600px;">
                <div class="modern-input-group full-width" style="margin-bottom: 15px;">
                    <label>Restaurant Logo</label>
                    <div class="img-upload-card ${appSettings.property.logo ? 'has-image' : ''}" id="prop-logo-card" onclick="document.getElementById('prop-logo-input').click()">
                        <i class="fas fa-image"></i>
                        <span>Click to upload logo<br>(Max 1MB)</span>
                        <img id="prop-logo-preview" src="${appSettings.property.logo || ''}" style="${appSettings.property.logo ? 'display:block;' : 'display:none;'}">
                        <button class="img-remove-btn" onclick="removePropLogo(event)"><i class="fas fa-trash"></i></button>
                    </div>
                    <input type="file" id="prop-logo-input" accept="image/*" style="display:none;" onchange="previewPropLogo(this)">
                    <input type="hidden" id="prop-logo-base64" value="${appSettings.property.logo || ''}">
                </div>
                <div class="modern-input-group"><label>Restaurant Name</label><input type="text" id="prop-name" class="modern-input" value="${appSettings.property.name}"></div>
                <div class="modern-input-group"><label>Phone Number</label><input type="text" id="prop-phone" class="modern-input" value="${appSettings.property.phone}"></div>
                <div class="modern-input-group full-width"><label>Address</label><input type="text" id="prop-address" class="modern-input" value="${appSettings.property.address}"></div>
                <div class="modern-input-group"><label>Currency</label><input type="text" id="prop-currency" class="modern-input" value="${appSettings.property.currency}"></div>
                <div class="modern-input-group"><label>Branch Code / Name</label><input type="text" id="prop-branch" class="modern-input" value="${appSettings.property.branch}"></div>
                
                <div class="modern-input-group"><label>Opening Time (HH:MM)</label><input type="time" id="prop-open" class="modern-input" value="${appSettings.property.openingTime || '00:00'}"></div>
                <div class="modern-input-group"><label>Closing Time (HH:MM)</label><input type="time" id="prop-close" class="modern-input" value="${appSettings.property.closingTime || '23:59'}"></div>
            </div>
            <button class="btn-modern btn-modern-save" style="margin-top:20px;" onclick="saveConfigProperty()">Save Property Settings</button>
        `;
    } else if (activeConfigTab === 'Preferences (UI)') {
        const p = appSettings.preferences;
        h += `
            <div class="modern-form-grid" style="max-width:600px;">
                <div class="modern-input-group">
                    <label>UI Theme</label>
                    <select id="pref-theme" class="modern-input">
                        <option value="default" ${p.theme==='default'?'selected':''}>Default Light</option>
                        <option value="dark" ${p.theme==='dark'?'selected':''}>Dark Mode</option>
                        <option value="ocean" ${p.theme==='ocean'?'selected':''}>Ocean Blue</option>
                        <option value="sunset" ${p.theme==='sunset'?'selected':''}>Sunset Orange</option>
                        <option value="emerald" ${p.theme==='emerald'?'selected':''}>Emerald Green</option>
                        <option value="minimalist" ${p.theme==='minimalist'?'selected':''}>Minimalist Gray</option>
                        <option value="neon" ${p.theme==='neon'?'selected':''}>Neon Purple</option>
                    </select>
                </div>
                <div class="modern-input-group">
                    <label>Menu Item Language (Bilingual)</label>
                    <select id="pref-menu-lang" class="modern-input">
                        <option value="both" ${p.menuLang==='both'?'selected':''}>Both (English + Urdu)</option>
                        <option value="en" ${p.menuLang==='en'?'selected':''}>English Only</option>
                        <option value="ur" ${p.menuLang==='ur'?'selected':''}>Urdu Only</option>
                    </select>
                </div>
                <div class="modern-input-group">
                    <label>Cart Position</label>
                    <select id="pref-cart-pos" class="modern-input">
                        <option value="right" ${p.cartPosition === 'right' ? 'selected' : ''}>Right Side (Default)</option>
                        <option value="left" ${p.cartPosition === 'left' ? 'selected' : ''}>Left Side</option>
                    </select>
                </div>
                <div class="modern-input-group">
                    <label>Font Family</label>
                    <select id="pref-font" class="modern-input">
                        <option value="Inter" ${p.fontFamily==='Inter'?'selected':''}>Inter (Default)</option>
                        <option value="Roboto" ${p.fontFamily==='Roboto'?'selected':''}>Roboto</option>
                        <option value="Poppins" ${p.fontFamily==='Poppins'?'selected':''}>Poppins</option>
                        <option value="Montserrat" ${p.fontFamily==='Montserrat'?'selected':''}>Montserrat</option>
                    </select>
                </div>
                
                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Granular Typography Sizing</h4>
                
                <div class="modern-input-group">
                    <label>Category Tab Size (e.g. 0.75rem)</label>
                    <input type="text" id="pref-cat" class="modern-input" value="${p.catFontSize || '0.75rem'}">
                </div>
                <div class="modern-input-group">
                    <label>Table Font Size (e.g. 0.85rem)</label>
                    <input type="text" id="pref-table" class="modern-input" value="${p.tableFontSize || '0.85rem'}">
                </div>
                <div class="modern-input-group">
                    <label>Menu Item Name Size (e.g. 0.85rem)</label>
                    <input type="text" id="pref-item" class="modern-input" value="${p.itemFontSize || '0.85rem'}">
                </div>
                <div class="modern-input-group">
                    <label>Menu Item Price Size (e.g. 0.75rem)</label>
                    <input type="text" id="pref-price" class="modern-input" value="${p.priceFontSize || '0.75rem'}">
                </div>
                <div class="modern-input-group">
                    <label>Cart List Header Size (e.g. 0.65rem)</label>
                    <input type="text" id="pref-cart-head" class="modern-input" value="${p.cartHeadFontSize || '0.65rem'}">
                </div>
                <div class="modern-input-group">
                    <label>Cart Items Size (e.g. 0.75rem)</label>
                    <input type="text" id="pref-cart-item" class="modern-input" value="${p.cartItemFontSize || '0.75rem'}">
                </div>
                <div class="modern-input-group">
                    <label>Checkout / Payment Totals Size</label>
                    <input type="text" id="pref-pay" class="modern-input" value="${p.paymentFontSize || '1.2rem'}">
                </div>
                <div class="modern-input-group">
                    <label>Dashboard Numbers Size</label>
                    <input type="text" id="pref-dash-num" class="modern-input" value="${p.dashNumFontSize || '1.2rem'}">
                </div>
            </div>
            <button class="btn-modern btn-modern-save" style="margin-top:20px;" onclick="saveConfigPreferences()">Save & Apply Preferences</button>
        `;
    } else if (activeConfigTab === 'Workers Management') {
        h += `
            <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <h4 style="margin-bottom:10px;">Current Staff</h4>
                    <table class="data-table"><tr><th>Name</th><th>Role</th><th>Login</th><th>Actions</th></tr>`;
        appWorkers.forEach((w, i) => {
            h += `<tr><td>${w.name}</td><td>${w.role}</td><td>${w.login}</td><td><button class="icon-btn-sm" style="color:var(--col-danger);" onclick="deleteWorker(${i})"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        h += `</table></div>
                <div style="flex:1; min-width:300px; background:var(--bg-app); padding:15px; border-radius:15px; box-shadow:var(--neumorph-in);">
                    <h4 style="margin-bottom:15px;">Add New Worker</h4>
                    <div class="modern-input-group" style="margin-bottom:10px;"><input type="text" id="w-name" class="modern-input" placeholder="Full Name" list="dl-workers"></div>
                    <div class="modern-input-group" style="margin-bottom:10px;"><input type="text" id="w-phone" class="modern-input" placeholder="Phone"></div>
                    <div class="modern-input-group" style="margin-bottom:10px;">
                        <select id="w-role" class="modern-input">
                            ${appRoles.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="modern-input-group" style="margin-bottom:10px;"><input type="text" id="w-login" class="modern-input" placeholder="Login ID"></div>
                    <div class="modern-input-group" style="margin-bottom:15px;"><input type="password" id="w-pass" class="modern-input" placeholder="Password"></div>
                    <button class="btn-modern btn-modern-save" style="width:100%;" onclick="saveWorker()">Create Worker</button>
                </div>
            </div>
        `;
    } else if (activeConfigTab === 'Security Roles') {
        h += `<p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:20px;">Define strict permissions for each system role.</p>`;
        h += `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(350px, 1fr)); gap:15px;">`;
        appRoles.forEach((role, i) => {
            h += `
                <div style="background:var(--bg-app); padding:15px; border-radius:15px; box-shadow:var(--neumorph-out-sm);">
                    <h4 style="color:var(--col-primary); margin-bottom:10px;">${role.name}</h4>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-er" ${role.perms.editRoles?'checked':''}> Edit Roles/Admin</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-co" ${role.perms.createOrder?'checked':''}> Create Orders</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-tt" ${role.perms.transferTable?'checked':''}> Transfer Tables</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-tw" ${role.perms.transferWaiter?'checked':''}> Transfer Waiter</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-so" ${role.perms.splitOrder?'checked':''}> Split Orders</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-ad" ${role.perms.applyDiscount?'checked':''}> Apply Discounts</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-at" ${role.perms.applyTax?'checked':''}> Apply Taxes</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-rf" ${role.perms.refund?'checked':''}> Refund</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-dao" ${role.perms.deleteActiveOrder?'checked':''}> Del Active Order</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-wh" ${role.perms.wipeHistory?'checked':''}> Wipe History</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-mc" ${role.perms.manageClients?'checked':''}> Manage Clients</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-ma" ${role.perms.manageAccounts?'checked':''}> Manage Accounts</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-mv" ${role.perms.manageVouchers?'checked':''}> Manage Vouchers</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-vd" ${role.perms.viewDashboard?'checked':''}> View Dashboard</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-vr" ${role.perms.viewReports?'checked':''}> View Reports</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-vh" ${role.perms.viewHistory?'checked':''}> View History</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-ro" ${role.perms.reprintOrder?'checked':''}> Reprint Orders</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-em" ${role.perms.editMenu?'checked':''}> Edit Menu/Tbl</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600; grid-column:span 2;"><input type="checkbox" class="apple-switch" id="role-${i}-mp" ${role.perms.modifyPrinted?'checked':''}> Modify Printed Items (High Sec)</label>
                    </div>
                    <button class="btn-modern" style="width:100%; margin-top:15px; font-size:0.85rem; padding:10px; background:var(--col-primary); color:white;" onclick="saveRolePerms(${i})">Save Perms</button>
                </div>
            `;
        });
        h += `</div>`;
    } else if (activeConfigTab === 'Bill Configuration') {
        const bc = appSettings.billConfig;
        h += `
            <div style="display:flex; flex-direction:column; gap:15px; max-width:600px;">
                <h4 style="color:var(--col-primary); margin-bottom:10px;">Advanced Receipt Content Checklist</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; background:var(--bg-app); padding:20px; border-radius:15px; box-shadow:var(--neumorph-in-sm); margin-bottom:15px;">
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-logo" ${bc.printLogo?'checked':''}> Print Logo</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-prop" ${bc.printPropInfo?'checked':''}> Print Property Info</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-inv" ${bc.printInvoiceNo?'checked':''}> Print Invoice #</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-st" ${bc.printStartTime?'checked':''}> Print Order Start Time</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-pt" ${bc.printPrintTime?'checked':''}> Print Printing Time</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-waiter" ${bc.printWaiter?'checked':''}> Print Waiter Name</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-cashier" ${bc.printCashier?'checked':''}> Print Cashier Name</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-cust" ${bc.printCustomer?'checked':''}> Print Customer Info</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-urdu" ${bc.urduItems?'checked':''}> Print Urdu Names</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-break" ${bc.printBreakdown?'checked':''}> Print Sub/Tax/Disc</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-pay" ${bc.printPayments?'checked':''}> Print Payment Breakdown</label>
                </div>

                <div class="modern-input-group">
                    <label>Custom CSS for Printed Receipt</label>
                    <textarea id="bill-css" class="modern-input" rows="4" style="font-family:monospace; font-size:0.8rem;">${bc.css}</textarea>
                    <small style="color:var(--text-secondary);">Example: .total-box { font-size: 20px; border: none; }</small>
                </div>
                <div class="modern-input-group">
                    <label>Custom Receipt Footer Note (HTML Allowed)</label>
                    <textarea id="bill-footer" class="modern-input" rows="3" style="font-family:monospace; font-size:0.8rem;">${bc.customFooter}</textarea>
                </div>
                <button class="btn-modern btn-modern-save" style="width:200px;" onclick="saveBillConfig()">Save Bill Layout</button>
            </div>
        `;
    } else if (activeConfigTab === 'Payment Methods') {
        h += `
            <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <h4 style="margin-bottom:10px;">Active Methods</h4>
                    <table class="data-table"><tr><th>Method Name</th><th>Action</th></tr>`;
        appSettings.paymentMethods.forEach((m, i) => {
            h += `<tr><td>${m}</td><td><button class="icon-btn-sm" style="color:var(--col-danger);" onclick="deletePayMethod(${i})"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        h += `</table></div>
                <div style="flex:1; min-width:300px; background:var(--bg-app); padding:15px; border-radius:15px; box-shadow:var(--neumorph-in);">
                    <h4 style="margin-bottom:15px;">Add Method</h4>
                    <div class="modern-input-group" style="margin-bottom:10px;"><input type="text" id="pm-name" class="modern-input" placeholder="e.g. Foodpanda"></div>
                    <button class="btn-modern btn-modern-save" style="width:100%;" onclick="savePayMethod()">Add</button>
                </div>
            </div>
        `;
    } else if (activeConfigTab === 'Notification Printer') {
        h += `
            <div style="display:flex; flex-direction:column; gap:15px;">
                <div class="modern-input-group">
                    <label>KOT Print Formatting / Commands</label>
                    <textarea id="kot-format" class="modern-input" rows="8" style="font-family:monospace; font-size:0.8rem;" placeholder="Define structure here...">${appSettings.kotConfig.format || ''}</textarea>
                    <small style="color:var(--text-secondary);">Used for specific thermal printer command sequences (ESC/POS) if handled via backend bridge.</small>
                </div>
                <button class="btn-modern btn-modern-save" style="width:200px;" onclick="saveKotConfig()">Save KOT Config</button>
            </div>
        `;
    }
    body.innerHTML = h;
}

// Config Savers
function previewPropLogo(input) { 
    if (input.files && input.files[0]) { 
        var r = new FileReader(); 
        r.onload = function(e) { 
            const imgCard = document.getElementById('prop-logo-card'); 
            const imgPreview = document.getElementById('prop-logo-preview');
            imgPreview.src = e.target.result; imgPreview.style.display = 'block'; 
            imgCard.classList.add('has-image'); document.getElementById('prop-logo-base64').value = e.target.result; 
        }; r.readAsDataURL(input.files[0]); 
    } 
}

function removePropLogo(event) {
    event.stopPropagation(); 
    document.getElementById('prop-logo-base64').value = ''; 
    document.getElementById('prop-logo-preview').src = '';
    document.getElementById('prop-logo-preview').style.display = 'none'; 
    document.getElementById('prop-logo-input').value = ''; 
    document.getElementById('prop-logo-card').classList.remove('has-image');
}

function saveConfigProperty() {
    appSettings.property.name = document.getElementById('prop-name').value;
    appSettings.property.phone = document.getElementById('prop-phone').value;
    appSettings.property.address = document.getElementById('prop-address').value;
    appSettings.property.currency = document.getElementById('prop-currency').value;
    appSettings.property.branch = document.getElementById('prop-branch').value;
    appSettings.property.openingTime = document.getElementById('prop-open').value;
    appSettings.property.closingTime = document.getElementById('prop-close').value;
    appSettings.property.logo = document.getElementById('prop-logo-base64').value;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    if (typeof applyPreferences === 'function') applyPreferences(); 
    showToast("Properties Saved");
}

function saveConfigPreferences() {
    appSettings.preferences.theme = document.getElementById('pref-theme').value;
    appSettings.preferences.menuLang = document.getElementById('pref-menu-lang').value;
    appSettings.preferences.cartPosition = document.getElementById('pref-cart-pos').value;
    appSettings.preferences.fontFamily = document.getElementById('pref-font').value;
    
    appSettings.preferences.catFontSize = document.getElementById('pref-cat').value;
    appSettings.preferences.tableFontSize = document.getElementById('pref-table').value;
    appSettings.preferences.itemFontSize = document.getElementById('pref-item').value;
    appSettings.preferences.priceFontSize = document.getElementById('pref-price').value;
    appSettings.preferences.cartHeadFontSize = document.getElementById('pref-cart-head').value;
    appSettings.preferences.cartItemFontSize = document.getElementById('pref-cart-item').value;
    appSettings.preferences.paymentFontSize = document.getElementById('pref-pay').value;
    appSettings.preferences.dashNumFontSize = document.getElementById('pref-dash-num').value;
    
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    if (typeof applyPreferences === 'function') applyPreferences(); 
    showToast("Preferences Applied");
}

function saveWorker() {
    const name = document.getElementById('w-name').value.trim();
    const role = document.getElementById('w-role').value;
    const login = document.getElementById('w-login').value.trim();
    const pass = document.getElementById('w-pass').value;
    if(!name) return showCustomAlert("Validation", "Name is required");
    
    const existingName = appWorkers.find(w => w.name.toLowerCase() === name.toLowerCase());
    if (existingName) return showCustomAlert("Duplicate Error", "Employee name already exists.");

    appWorkers.push({ name, role, login, pass, phone: document.getElementById('w-phone').value });
    localStorage.setItem('pos_workers', JSON.stringify(appWorkers));
    if (typeof updateAppWaitersList === 'function') updateAppWaitersList(); 
    renderConfigContent(); showToast("Worker Added");
    if(typeof updateDataLists === 'function') updateDataLists();
}

function deleteWorker(idx) {
    appWorkers.splice(idx, 1);
    localStorage.setItem('pos_workers', JSON.stringify(appWorkers));
    if (typeof updateAppWaitersList === 'function') updateAppWaitersList(); 
    renderConfigContent(); showToast("Worker Removed");
    if(typeof updateDataLists === 'function') updateDataLists();
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

function saveBillConfig() {
    const bc = appSettings.billConfig;
    bc.printLogo = document.getElementById('bc-logo').checked;
    bc.printPropInfo = document.getElementById('bc-prop').checked;
    bc.printInvoiceNo = document.getElementById('bc-inv').checked;
    bc.printStartTime = document.getElementById('bc-st').checked;
    bc.printPrintTime = document.getElementById('bc-pt').checked;
    bc.printWaiter = document.getElementById('bc-waiter').checked;
    bc.printCashier = document.getElementById('bc-cashier').checked;
    bc.printCustomer = document.getElementById('bc-cust').checked;
    bc.urduItems = document.getElementById('bc-urdu').checked;
    bc.printBreakdown = document.getElementById('bc-break').checked;
    bc.printPayments = document.getElementById('bc-pay').checked;
    
    bc.css = document.getElementById('bill-css').value;
    bc.customFooter = document.getElementById('bill-footer').value;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast("Bill Format Saved");
}

function savePayMethod() {
    const m = document.getElementById('pm-name').value.trim();
    if(!m) return;
    appSettings.paymentMethods.push(m);
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    renderConfigContent(); showToast("Method Added");
}

function deletePayMethod(idx) {
    appSettings.paymentMethods.splice(idx, 1);
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    renderConfigContent(); showToast("Method Removed");
}

function saveKotConfig() {
    appSettings.kotConfig.format = document.getElementById('kot-format').value;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast("KOT Config Saved");
}

function openDayEndModal() {
    document.getElementById('day-end-modal').classList.add('active');
    document.getElementById('slide-out-menu').classList.remove('active');
}

function openReconcileModal() {
    document.getElementById('reconcile-modal').classList.add('active');
    document.getElementById('reconcile-body').innerHTML = `
        <p style="text-align:center; font-size:0.9rem; color:var(--text-primary); margin-top:20px;">
            Please ensure you have counted your drawer.
        </p>
    `;
}

// MODIFIED: Non-Destructive Day End with Auto-Backup
function performDayEnd() {
    openConfirm("Perform Day End", "Are you sure? This will finalize the day, save a backup, and start a fresh screen for tomorrow.", () => {
        closeModal('day-end-modal');
        
        // 1. Auto Backup Before Any Changes
        backupSystem(true); // pass true for silent backup

        // 2. Set the Cutoff Timestamp (Leaves memory intact, just hides it from UI)
        app.lastDayEnd = Date.now();
        localStorage.setItem('pos_lastDayEnd', app.lastDayEnd.toString());
        
        // 3. Reset shift tracking
        app.currentShiftStart = Date.now();
        localStorage.setItem('pos_shiftStart', app.currentShiftStart.toString());
        
        if (typeof renderHistory === 'function') renderHistory();
        showToast("Day End Completed! System backed up & refreshed.");
    });
}

function backupSystem(silent = false) {
    const data = { 
        layout: tableLayout, menu: menuItems, cats: menuCategories, 
        history: app.history, clients: app.clients, settings: appSettings, 
        workers: appWorkers, roles: appRoles 
    };
    const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = "pos_backup_" + new Date().toISOString().slice(0,10) + ".json";
    a.click();
    
    if(!silent) document.getElementById('slide-out-menu').classList.remove('active');
}

function restoreSystem(input) {
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if(data.layout) { tableLayout = data.layout; localStorage.setItem('pos_layout_v2', JSON.stringify(tableLayout)); }
            if(data.menu) { menuItems = data.menu; localStorage.setItem('pos_menu_items', JSON.stringify(menuItems)); }
            if(data.cats) { menuCategories = data.cats; localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories)); }
            if(data.history) { app.history = data.history; localStorage.setItem('orderHistory', JSON.stringify(app.history)); }
            if(data.clients) { app.clients = data.clients; localStorage.setItem('pos_clients', JSON.stringify(app.clients)); }
            if(data.settings) { appSettings = data.settings; localStorage.setItem('pos_app_settings', JSON.stringify(appSettings)); }
            if(data.workers) { appWorkers = data.workers; localStorage.setItem('pos_workers', JSON.stringify(appWorkers)); }
            if(data.roles) { appRoles = data.roles; localStorage.setItem('pos_roles', JSON.stringify(appRoles)); }
            
            showCustomAlert("Success", "Restore Successful! Reloading...");
            setTimeout(()=>location.reload(), 1500);
        } catch(err) { 
            showCustomAlert("Error", "Invalid Backup File"); 
        }
    };
    reader.readAsText(file);
    document.getElementById('slide-out-menu').classList.remove('active');
}

// ============================================================================
// NEW: Z-READING / SHIFT REPORT
// ============================================================================
function openZReadingModal() {
    if(!hasPerm('viewReports')) return showCustomAlert("Denied", "You do not have permission to view reports.");
    
    document.getElementById('z-reading-modal').classList.add('active');
    document.getElementById('slide-out-menu').classList.remove('active');
    
    const body = document.getElementById('z-reading-body');
    const shiftStart = app.currentShiftStart;
    
    // Filter history for current shift
    const shiftOrders = app.history.filter(h => new Date(h.startTimeRaw || h.date).getTime() >= shiftStart);
    
    let cashierTotals = {}; // { 'Ali': { cash: 1000, card: 500, total: 1500 } }
    
    shiftOrders.forEach(ord => {
        const cName = ord.cashier || 'Unknown';
        if (!cashierTotals[cName]) cashierTotals[cName] = { total: 0, methods: {} };
        
        ord.payments.forEach(p => {
            cashierTotals[cName].methods[p.method] = (cashierTotals[cName].methods[p.method] || 0) + p.amount;
            cashierTotals[cName].total += p.amount;
        });
    });

    let html = `
        <div style="background:var(--bg-app); padding:10px; border-radius:10px; margin-bottom:15px; font-size:0.8rem; text-align:center;">
            Shift Started: <b>${new Date(shiftStart).toLocaleString()}</b><br>
            Total Orders Processed: <b>${shiftOrders.length}</b>
        </div>
    `;

    if (Object.keys(cashierTotals).length === 0) {
        html += `<p style="text-align:center; color:var(--text-secondary); margin: 30px 0;">No sales recorded in the current shift.</p>`;
    } else {
        for (let cashier in cashierTotals) {
            html += `
                <div style="background:var(--bg-app); border-radius:12px; padding:15px; box-shadow:var(--neumorph-out-sm); margin-bottom:15px;">
                    <h4 style="color:var(--col-primary); margin-bottom:10px; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:5px;">
                        <i class="fas fa-user-circle"></i> Cashier: ${cashier}
                    </h4>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.9rem;">
            `;
            
            for(let method in cashierTotals[cashier].methods) {
                html += `
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-secondary);">${method}:</span>
                        <span style="font-weight:700;">${cashierTotals[cashier].methods[method].toFixed(0)}</span>
                    </div>
                `;
            }

            html += `
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px dashed rgba(0,0,0,0.1); font-size:1.1rem; font-weight:800; color:var(--text-primary);">
                        <span>TOTAL COLLECTED:</span>
                        <span style="color:var(--col-success);">${appSettings.property.currency} ${cashierTotals[cashier].total.toFixed(0)}</span>
                    </div>
                </div>
            `;
        }
    }
    body.innerHTML = html;
}

function printZReading() {
    const content = document.getElementById('z-reading-body').innerHTML;
    const win = window.open('', '', 'width=400,height=600');
    win.document.write(`
        <html><head><title>Z-Reading</title>
        <style>body{font-family:sans-serif; color:#000; padding:20px; font-size:12px;}</style>
        </head><body>
        <h2 style="text-align:center;">Shift Z-Reading</h2>
        ${content}
        <div style="text-align:center; margin-top:20px;">Printed: ${new Date().toLocaleString()}</div>
        <script>setTimeout(() => window.print(), 500);</script>
        </body></html>
    `);
    win.document.close();
}

// ============================================================================
// NEW: MODULAR EXPORT / IMPORT LOGIC
// ============================================================================

// 1. MENU (CSV)
function exportMenuCSV() {
    if(menuItems.length === 0) {
        const template = "id,name,category,price,status,sortOrder\nITEM-001,Sample Item,other,100,available,1";
        downloadFile(template, "menu_template.csv", "text/csv");
        return;
    }
    let csv = "id,name,category,price,status,sortOrder\n";
    menuItems.forEach(i => {
        // Replace internal quotes to avoid CSV breaking
        const safeName = i.name.replace(/"/g, '""'); 
        csv += `"${i.id}","${safeName}","${i.category}",${i.price},"${i.status}",${i.sortOrder || 0}\n`;
    });
    downloadFile(csv, `menu_backup_${new Date().toISOString().slice(0,10)}.csv`, "text/csv");
}

let pendingImportData = null; // Temp storage for the confirm modal

function handleMenuImport(input) {
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        if (rows.length < 2) return showCustomAlert("Error", "CSV is empty or invalid format.");
        
        const headers = rows[0].toLowerCase().split(',');
        let updates = 0, newItems = 0;
        let processedItems =[];

        for(let i=1; i<rows.length; i++) {
            // Regex to handle commas inside quotes correctly
            const cols = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if(!cols) continue;
            
            const clean = (str) => str ? str.replace(/^"|"$/g, '').trim() : '';
            
            let itemObj = {
                id: clean(cols[0]),
                name: clean(cols[1]),
                category: clean(cols[2]),
                price: parseFloat(clean(cols[3])) || 0,
                status: clean(cols[4]) || 'available',
                sortOrder: parseInt(clean(cols[5])) || 0
            };

            const existing = menuItems.find(mi => mi.id === itemObj.id || mi.name.toLowerCase() === itemObj.name.toLowerCase());
            if (existing) updates++; else newItems++;
            processedItems.push(itemObj);
        }

        // Show Summary Modal Before Action
        pendingImportData = { type: 'menu', data: processedItems };
        document.getElementById('import-summary-text').innerHTML = `
            <strong>Menu File Analyzed:</strong><br><br>
            <span style="color:var(--col-success); font-weight:bold;">${updates}</span> existing items will be updated.<br>
            <span style="color:var(--col-primary); font-weight:bold;">${newItems}</span> new items will be added.
        `;
        document.getElementById('import-confirm-btn').onclick = executeSmartImport;
        document.getElementById('import-summary-modal').classList.add('active');
        input.value = ''; // clear
    };
    reader.readAsText(file);
}

// 2. TABLES (JSON)
function exportTablesJSON() {
    const json = JSON.stringify(tableLayout, null, 2);
    downloadFile(json, `tables_backup_${new Date().toISOString().slice(0,10)}.json`, "application/json");
}

function handleTablesImport(input) {
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Format");
            
            pendingImportData = { type: 'tables', data: data };
            document.getElementById('import-summary-text').innerHTML = `
                <strong>Table File Analyzed:</strong><br><br>
                Found ${data.length} Zones in the file.<br>
                System will intelligently merge new sections and tables into your existing layout.
            `;
            document.getElementById('import-confirm-btn').onclick = executeSmartImport;
            document.getElementById('import-summary-modal').classList.add('active');
        } catch(err) {
            showCustomAlert("Error", "Invalid JSON format for Tables.");
        }
        input.value = ''; // clear
    };
    reader.readAsText(file);
}

// THE ACTUAL EXECUTION OF IMPORTS
function executeSmartImport() {
    closeModal('import-summary-modal');
    if (!pendingImportData) return;

    if (pendingImportData.type === 'menu') {
        pendingImportData.data.forEach(newItem => {
            const existingIdx = menuItems.findIndex(mi => mi.id === newItem.id || mi.name.toLowerCase() === newItem.name.toLowerCase());
            if (existingIdx !== -1) {
                // Keep original properties that aren't in CSV (like altName, imgData)
                menuItems[existingIdx] = { ...menuItems[existingIdx], ...newItem };
            } else {
                menuItems.push(newItem);
            }
            
            // Auto-create category if it doesn't exist
            if (!menuCategories.find(c => c.id === newItem.category)) {
                menuCategories.push({ id: newItem.category, name: newItem.category.toUpperCase() });
            }
        });
        localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
        localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
        if(typeof renderManagerList === 'function') renderManagerList('');
        showToast("Menu Import Successful!");

    } else if (pendingImportData.type === 'tables') {
        const newLayout = pendingImportData.data;
        newLayout.forEach(newZone => {
            let exZone = tableLayout.find(z => z.id === newZone.id);
            if (!exZone) {
                tableLayout.push(newZone); // Add whole new zone
            } else {
                newZone.sections.forEach(newSec => {
                    let exSec = exZone.sections.find(s => s.name === newSec.name);
                    if(!exSec) {
                        exZone.sections.push(newSec); // Add whole new section
                    } else {
                        newSec.tables.forEach(newTbl => {
                            const tblName = typeof newTbl === 'string' ? newTbl : newTbl.name;
                            const exists = exSec.tables.find(t => (typeof t === 'string' ? t : t.name) === tblName);
                            if(!exists) exSec.tables.push(newTbl); // Add only new tables
                        });
                    }
                });
            }
        });
        localStorage.setItem('pos_layout_v2', JSON.stringify(tableLayout));
        if(typeof renderTblManagerList === 'function') renderTblManagerList('');
        if(typeof renderAllTables === 'function') renderAllTables();
        showToast("Tables Imported & Merged!");
    }
    
    pendingImportData = null;
    if(typeof updateDataLists === 'function') updateDataLists();
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

document.addEventListener('DOMContentLoaded', () => {
    if(typeof buildDynamicZones === 'function') buildDynamicZones();
    if(typeof renderAllTables === 'function') renderAllTables();
    if(typeof renderCategories === 'function') renderCategories();
    if(typeof updateDataLists === 'function') updateDataLists(); 
    
    setInterval(() => {
        if(typeof updateTableButtons === 'function') updateTableButtons();
    }, 60000);
});