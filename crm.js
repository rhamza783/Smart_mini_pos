/* 
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT: CLIENTS MANAGEMENT & CRM LOGIC (crm.js)                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function renderClientsList() {
    const searchInput = document.getElementById('cl-search');
    if(!searchInput) return;
    const term = searchInput.value.toLowerCase();
    const body = document.getElementById('cl-list-body');
    body.innerHTML = '';
    
    const filtered = app.clients.filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term) || (c.company && c.company.toLowerCase().includes(term)));
    
    if(filtered.length === 0) {
        body.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:0.8rem;">No clients found</div>';
        return;
    }
    
    filtered.forEach(c => {
        const isDebt = c.balance > 0;
        let alertTag = c.isBlocked ? `<span style="color:var(--col-danger); font-size:0.7rem; font-weight:800; margin-left:5px;">[BLOCKED]</span>` : '';
        body.innerHTML += `
            <button class="list-item-btn" onclick="viewClientLedger('${c.id}', this)">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${c.name} ${alertTag}</strong>
                    <span style="font-size:0.75rem; color:${isDebt ? 'var(--col-danger)' : 'var(--col-success)'}">Bal: PKR ${c.balance.toFixed(0)}</span>
                </div>
                <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:4px;">${c.phone} ${c.company ? ' | ' + c.company : ''}</div>
            </button>
        `;
    });
}

function newClientForm() {
    document.querySelectorAll('#cl-list-body .list-item-btn').forEach(btn => btn.classList.remove('active'));
    const b = document.getElementById('cl-detail-body');
    b.innerHTML = `
        <h3 id="nc-form-title" style="margin-bottom:15px; color:var(--col-primary);">Add New Client</h3>
        <div class="input-group"><label>Name *</label><input type="text" id="nc-name" placeholder="John Doe" class="modern-input" list="dl-clients" data-edit-id=""></div>
        <div class="input-group"><label>Phone Number *</label><input type="text" id="nc-phone" placeholder="0300..." class="modern-input"></div>
        <div class="input-group"><label>Company / Surname</label><input type="text" id="nc-company" placeholder="Optional" class="modern-input"></div>
        <div class="input-group"><label>Address / Note</label><input type="text" id="nc-address" placeholder="Default delivery address" class="modern-input"></div>
        <div class="input-group"><label>Monthly Credit Limit (PKR)</label><input type="number" id="nc-limit" placeholder="0" value="0" class="modern-input"></div>
        <button id="nc-submit-btn" class="btn-modern btn-modern-save" style="background:var(--col-success); width:100%;" onclick="saveNewClient()">Save Client Profile</button>
    `;
}

function saveNewClient() {
    const name = document.getElementById('nc-name').value.trim();
    const phone = document.getElementById('nc-phone').value.trim();
    const editId = document.getElementById('nc-name').dataset.editId;

    if(!name || !phone) return showCustomAlert("Validation", "Name and Phone are required.");
    
    // Smart Validation
    const duplicate = app.clients.find(c => c.phone === phone);
    if(duplicate && duplicate.id !== editId) return showCustomAlert("Duplicate Entry", "A user with this phone number already exists.");

    if (editId) {
        // Edit Mode
        const c = app.clients.find(x => x.id === editId);
        if(c) {
            c.name = name;
            c.phone = phone;
            c.company = document.getElementById('nc-company').value.trim();
            c.address = document.getElementById('nc-address').value.trim();
            c.limit = parseFloat(document.getElementById('nc-limit').value) || 0;
            localStorage.setItem('pos_clients', JSON.stringify(app.clients));
            showToast("Profile Updated!");
            renderClientsList();
            viewClientLedger(editId);
        }
    } else {
        // Create Mode
        const newId = 'CL-' + Date.now();
        app.clients.push({
            id: newId, name: name, phone: phone, company: document.getElementById('nc-company').value.trim(), address: document.getElementById('nc-address').value.trim(),
            limit: parseFloat(document.getElementById('nc-limit').value) || 0,
            balance: 0, totalOrders: 0, totalDiscount: 0, totalPurchasing: 0, favorites: {}, ledger:[], isBlocked: false, rating: 5
        });
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        showToast("Client Created!");
        renderClientsList();
        viewClientLedger(newId);
    }
    if(typeof updateDataLists === 'function') updateDataLists();
}

function editClientProfile(id) {
    if(!hasPerm('manageClients')) return showCustomAlert('Denied', 'No permission to manage clients.');
    const c = app.clients.find(x => x.id === id);
    if(!c) return;
    
    newClientForm();
    document.getElementById('nc-name').value = c.name;
    document.getElementById('nc-phone').value = c.phone;
    document.getElementById('nc-company').value = c.company || '';
    document.getElementById('nc-address').value = c.address || '';
    document.getElementById('nc-limit').value = c.limit || 0;
    
    document.getElementById('nc-name').dataset.editId = id;
    document.getElementById('nc-form-title').innerText = "Edit Client Profile";
    document.getElementById('nc-submit-btn').innerText = "Update Profile";
}

function viewClientLedger(id, elem) {
    if(elem) {
        document.querySelectorAll('#cl-list-body .list-item-btn').forEach(btn => btn.classList.remove('active'));
        elem.classList.add('active');
    }
    const c = app.clients.find(x => x.id === id);
    if(!c) return;

    // Ensure new metrics exist for older saves
    if(c.totalPurchasing === undefined) c.totalPurchasing = 0;
    if(!c.favorites) c.favorites = {};
    if(c.isBlocked === undefined) c.isBlocked = false;
    if(c.rating === undefined) c.rating = 5;

    const favs = Object.keys(c.favorites).sort((a,b) => c.favorites[b] - c.favorites[a]).slice(0,3);
    let favsText = favs.length > 0 ? favs.map(f => `${f} (x${c.favorites[f]})`).join(', ') : 'None yet';

    let starsHtml = '';
    for(let i=1; i<=5; i++) {
        starsHtml += `<i class="fas fa-star" style="color:${i <= c.rating ? '#FFD700' : '#CBD5E1'}; cursor:pointer;" onclick="updateClientRating('${c.id}', ${i})"></i>`;
    }

    const b = document.getElementById('cl-detail-body');
    let h = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
            <div>
                <h3 style="margin:0; color:var(--col-primary);">${c.name} ${c.isBlocked ? '<span style="color:var(--col-danger); font-size:0.8rem; vertical-align:middle;">[BLOCKED]</span>' : ''}</h3>
                <p style="margin:5px 0 0; font-size:0.8rem; color:var(--text-secondary);">${c.phone} ${c.company ? '| ' + c.company : ''}</p>
                <p style="margin:2px 0 0; font-size:0.75rem; color:var(--text-secondary);"><i class="fas fa-map-marker-alt"></i> ${c.address || 'No Address'}</p>
                <div style="margin-top:5px; font-size:0.9rem;">${starsHtml}</div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="icon-btn-sm" style="background:var(--col-success); color:white; width:40px; height:40px;" title="Receive Payment" onclick="receiveClientPayment('${c.id}')">
                    <i class="fas fa-hand-holding-usd"></i>
                </button>
            </div>
        </div>

        <!-- Admin CRM Controls -->
        <div style="display:flex; gap:10px; margin-bottom: 20px;">
            <button class="btn-modern" style="flex:1; padding:8px; font-size:0.75rem; background: var(--bg-app); color: var(--text-primary); box-shadow:var(--neumorph-out-sm);" onclick="editClientProfile('${c.id}')">
                <i class="fas fa-pen"></i> Edit Profile
            </button>
            <button class="btn-modern" style="flex:1; padding:8px; font-size:0.75rem; background: ${c.isBlocked ? 'var(--col-success)' : 'rgba(229, 62, 62, 0.1)'}; color: ${c.isBlocked ? 'white' : 'var(--col-danger)'};" onclick="toggleClientBlock('${c.id}')">
                <i class="fas ${c.isBlocked ? 'fa-check-circle' : 'fa-ban'}"></i> ${c.isBlocked ? 'Unblock' : 'Block'}
            </button>
            <button class="btn-modern" style="flex:1; padding:8px; font-size:0.75rem; background: var(--bg-app); color: var(--col-danger); box-shadow:var(--neumorph-out-sm);" onclick="deleteClientCRM('${c.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <div style="background:var(--bg-app); padding:10px; border-radius:12px; box-shadow:var(--neumorph-in); text-align:center;">
                <div style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase; font-weight:800;">Balance Due</div>
                <div style="font-size:1.1rem; font-weight:800; color:${c.balance > 0 ? 'var(--col-danger)' : 'var(--col-success)'}">${c.balance.toFixed(0)}</div>
            </div>
            <div style="background:var(--bg-app); padding:10px; border-radius:12px; box-shadow:var(--neumorph-in); text-align:center;">
                <div style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase; font-weight:800;">Total Purchased</div>
                <div style="font-size:1.1rem; font-weight:800; color:var(--col-primary);">${appSettings.property.currency} ${c.totalPurchasing.toFixed(0)}</div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px;">
            <div style="background:var(--bg-app); padding:10px; border-radius:12px; box-shadow:var(--neumorph-out-sm); text-align:center;">
                <div style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase; font-weight:800;">Orders</div>
                <div style="font-size:1rem; font-weight:800; color:var(--text-primary);">${c.totalOrders}</div>
            </div>
            <div style="background:var(--bg-app); padding:10px; border-radius:12px; box-shadow:var(--neumorph-out-sm); text-align:center;">
                <div style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase; font-weight:800;">Discount</div>
                <div style="font-size:1rem; font-weight:800; color:var(--col-danger);">${c.totalDiscount}</div>
            </div>
            <div style="background:var(--bg-app); padding:10px; border-radius:12px; box-shadow:var(--neumorph-out-sm); text-align:center;">
                <div style="font-size:0.65rem; color:var(--text-secondary); text-transform:uppercase; font-weight:800;">Limit</div>
                <div style="font-size:1rem; font-weight:800; color:var(--text-primary);">${c.limit > 0 ? c.limit : 'None'}</div>
            </div>
        </div>
        
        <div style="background:var(--bg-app); padding:10px; border-radius:12px; box-shadow:var(--neumorph-in-sm); margin-bottom:20px;">
            <strong style="font-size:0.75rem; color:var(--col-primary);">Customer Favorites:</strong> 
            <span style="font-size:0.8rem; color:var(--text-secondary);">${favsText}</span>
        </div>

        <h4 style="font-size:0.85rem; color:var(--col-secondary); margin-bottom:10px; text-transform:uppercase;">Account Ledger</h4>
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead><tr><th>Date</th><th>Action</th><th>Folio/Ord #</th><th style="text-align:right;">Amount</th></tr></thead>
                <tbody>
    `;

    if(c.ledger.length === 0) {
        h += `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); font-style:italic;">No transactions yet</td></tr>`;
    } else {
        c.ledger.slice().reverse().forEach(l => {
            const isCredit = l.amt > 0; 
            
            // NEW: Clickable Folio Link for Orders
            let folioHtml = l.folio || '--';
            if (l.folio && l.folio !== '--' && l.action.includes('Purchase')) {
                // Find order index
                const histIdx = app.history.findIndex(x => x.id === l.folio);
                if (histIdx !== -1) {
                    folioHtml = `<a href="#" onclick="viewHistoryOrder('${histIdx}', false, null); showSection('history');" style="color:var(--col-primary); text-decoration:underline; font-weight:bold;">${l.folio}</a>`;
                }
            }

            h += `
                <tr>
                    <td style="font-size:0.75rem; white-space:nowrap;">${l.date}</td>
                    <td>${l.action}</td>
                    <td>${folioHtml}</td>
                    <td style="text-align:right; font-weight:700; color:${isCredit ? 'var(--col-danger)' : 'var(--col-success)'}">${isCredit ? '+' : ''}${l.amt.toFixed(0)}</td>
                </tr>
            `;
        });
    }

    h += `</tbody></table></div>`;
    b.innerHTML = h;
}

function toggleClientBlock(id) {
    if(!hasPerm('manageClients')) return showCustomAlert('Denied', 'No permission to manage clients.');
    const c = app.clients.find(x => x.id === id);
    if(c) {
        c.isBlocked = !c.isBlocked;
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        showToast(c.isBlocked ? "Client Blocked" : "Client Unblocked");
        renderClientsList();
        viewClientLedger(id);
    }
}

function deleteClientCRM(id) {
    if(!hasPerm('manageClients')) return showCustomAlert('Denied', 'No permission to manage clients.');
    openConfirm("Delete Client", "Are you sure you want to permanently delete this client? Ledger data will be lost.", () => {
        app.clients = app.clients.filter(c => c.id !== id);
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        showToast("Client Deleted");
        document.getElementById('cl-detail-body').innerHTML = '<h2 style="color:var(--text-secondary); text-align:center; margin-top:50px;">Select a client to view CRM & Ledger</h2>';
        renderClientsList();
        if(typeof updateDataLists === 'function') updateDataLists();
    });
}

function updateClientRating(id, rating) {
    if(!hasPerm('manageClients')) return showCustomAlert('Denied', 'No permission to manage clients.');
    const c = app.clients.find(x => x.id === id);
    if(c) {
        c.rating = rating;
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        showToast(`Rating set to ${rating} stars`);
        viewClientLedger(id);
    }
}

function receiveClientPayment(id) {
    if(!hasPerm('manageAccounts')) return showCustomAlert('Denied', 'No permission to manage account payments.');
    const c = app.clients.find(x => x.id === id);
    openCustomPrompt(`Receive Payment from ${c.name}`, c.balance > 0 ? c.balance : '', (val) => {
        if(val === null || val === '') return;
        let amt = parseFloat(val);
        if(isNaN(amt) || amt <= 0) return showCustomAlert("Invalid", "Enter a valid amount.");
        
        c.balance -= amt; 
        c.ledger.push({
            date: new Date().toLocaleString(),
            action: 'Payment Received',
            amt: -amt, 
            folio: 'REC-' + Date.now().toString().slice(-4)
        });
        
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        showToast(`Received PKR ${amt}`);
        renderClientsList();
        viewClientLedger(id);
    });
}

// --- CUSTOMER CART MODAL LOGIC ---
function openCustomerModal() { 
    if(!app.isReadOnly && app.table) {
        if(typeof populateClientDropdown === 'function') populateClientDropdown();
        document.getElementById('customer-modal').classList.add('active');
        const d = app.orders[app.table];
        if(d.clientId) document.getElementById('cart-client-select').value = d.clientId;
        document.getElementById('cust-name').value = d.customer.name || "";
        document.getElementById('cust-phone').value = d.customer.phone || "";
        document.getElementById('cust-address').value = d.customer.address || "";
    } else {
        showToast("Select Table First"); 
    }
}

function suggestClients(val, field) {
    const sugDiv = document.getElementById(`cust-${field}-sug`);
    if(!val) { sugDiv.style.display = 'none'; return; }
    
    // SMART CRM: Limit to top 3
    const matches = app.clients.filter(c => c[field] && c[field].toLowerCase().includes(val.toLowerCase())).slice(0,3);
    
    if(matches.length === 0) { sugDiv.style.display = 'none'; return; }
    
    sugDiv.innerHTML = '';
    matches.forEach(c => {
        const div = document.createElement('div');
        div.className = 'modern-client-sug';
        let alertTag = c.isBlocked ? `<span style="color:red; font-size:0.7rem; font-weight:bold; margin-left:10px;">[BLOCKED]</span>` : '';
        div.innerHTML = `
            <div class="avatar">${c.name.charAt(0).toUpperCase()}</div>
            <div class="info">
                <span class="name">${c.name} ${alertTag}</span>
                <span class="phone">${c.phone} ${c.company ? '| ' + c.company : ''}</span>
            </div>
        `;
        div.onclick = () => {
            document.getElementById('cust-name').value = c.name;
            document.getElementById('cust-phone').value = c.phone;
            document.getElementById('cust-address').value = c.address || '';
            document.getElementById('cart-client-select').value = c.id;
            document.getElementById('cust-name-sug').style.display = 'none';
            document.getElementById('cust-phone-sug').style.display = 'none';
        };
        sugDiv.appendChild(div);
    });
    sugDiv.style.display = 'block';
}

// Close suggestions on outside click
document.addEventListener('click', (e) => {
    if(e.target.id !== 'cust-name' && document.getElementById('cust-name-sug')) document.getElementById('cust-name-sug').style.display = 'none';
    if(e.target.id !== 'cust-phone' && document.getElementById('cust-phone-sug')) document.getElementById('cust-phone-sug').style.display = 'none';
});

function populateClientDropdown() {
    const select = document.getElementById('cart-client-select');
    select.innerHTML = '<option value="">-- New / Guest --</option>';
    app.clients.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name} (${c.phone})</option>`;
    });
}

function autoFillClient() {
    const id = document.getElementById('cart-client-select').value;
    if (id) {
        const c = app.clients.find(x => x.id === id);
        document.getElementById('cust-name').value = c.name;
        document.getElementById('cust-phone').value = c.phone;
        document.getElementById('cust-address').value = c.address || "";
    }
}

function saveCustomerDetails() {
    if(!app.table) return;
    let clientId = document.getElementById('cart-client-select').value || null;
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    
    if(!clientId && name && phone) {
        // Strict validation: phone uniqueness
        let existing = app.clients.find(c => c.phone === phone);
        if(existing) {
            return showCustomAlert("Action Denied", `A user with the number ${phone} already exists (${existing.name}). Please select them from the list.`);
        }

        clientId = 'CL-' + Date.now();
        app.clients.push({
            id: clientId, name: name, phone: phone, company: '', address: address, limit: 0, balance: 0, totalOrders: 0, totalDiscount: 0, totalPurchasing: 0, favorites: {}, ledger:[], isBlocked: false, rating: 5
        });
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        if(typeof updateDataLists === 'function') updateDataLists();
        populateClientDropdown();
        document.getElementById('cart-client-select').value = clientId;
    }

    app.orders[app.table].clientId = clientId;
    app.orders[app.table].customer = { name, phone, address };
    
    if (clientId && address) {
        const c = app.clients.find(x => x.id === clientId);
        if(c) { c.address = address; localStorage.setItem('pos_clients', JSON.stringify(app.clients)); }
    }

    if(typeof saveToLocal === 'function') saveToLocal(); 
    if(typeof loadTableData === 'function') loadTableData(); 
    closeModal('customer-modal'); 
    showToast("Details Saved");
}