/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: crm_cart_customer.js – Customer Modal and Order Linking              ║
║         (Added Enter key support)                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function openCustomerModal() {
    if (!app.isReadOnly && app.table) {
        if (typeof populateClientDropdown === 'function') populateClientDropdown();
        document.getElementById('customer-modal').classList.add('active');
        const d = app.orders[app.table];
        
        document.getElementById('cart-client-select').value = "";
        if (d.clientId) {
            document.getElementById('cart-client-select').value = d.clientId;
            const c = app.clients.find(x => x.id === d.clientId);
            if (c) {
                document.getElementById('cust-name').value = c.name;
                document.getElementById('cust-phone').value = c.phone;
                document.getElementById('cust-address').value = c.address || "";
            }
        } else {
            document.getElementById('cust-name').value = d.customer.name || "";
            document.getElementById('cust-phone').value = d.customer.phone || "";
            document.getElementById('cust-address').value = d.customer.address || "";
        }
        initializeCustomSelect('cart-client-select');
        setupEnterKeyOnModal('customer-modal', '.save');
    } else {
        showToast("Select Table First");
    }
}

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
        if (c) {
            document.getElementById('cust-name').value = c.name;
            document.getElementById('cust-phone').value = c.phone;
            document.getElementById('cust-address').value = c.address || "";
        }
    } else {
        document.getElementById('cust-name').value = "";
        document.getElementById('cust-phone').value = "";
        document.getElementById('cust-address').value = "";
    }
}

function saveCustomerDetails() {
    if (!app.table) return;
    let clientId = document.getElementById('cart-client-select').value || null;
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    
    if (!clientId && name && phone) {
        let existing = app.clients.find(c => c.phone === phone);
        if (existing) {
            return showCustomAlert("Action Denied", `A user with the number ${phone} already exists (${existing.name}). Please select them from the list.`);
        }
        
        clientId = 'CL-' + Date.now();
        app.clients.push({
            id: clientId,
            name: name,
            phone: phone,
            company: '',
            address: address,
            limit: 0,
            balance: 0,
            totalOrders: 0,
            totalDiscount: 0,
            totalPurchasing: 0,
            favorites: {},
            ledger: [],
            isBlocked: false,
            rating: 5,
            loyaltyPoints: 0,
            pointsHistory: []
        });
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        if (typeof updateDataLists === 'function') updateDataLists();
        populateClientDropdown();
        document.getElementById('cart-client-select').value = clientId;
        initializeCustomSelect('cart-client-select');
    }
    
    app.orders[app.table].clientId = clientId;
    app.orders[app.table].customer = { name, phone, address };
    
    if (clientId && address) {
        const c = app.clients.find(x => x.id === clientId);
        if (c) {
            c.address = address;
            localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        }
    }
    
    if (typeof saveToLocal === 'function') saveToLocal();
    if (typeof loadTableData === 'function') loadTableData();
    closeModal('customer-modal');
    showToast("Details Saved");
    renderCrmDashboard();
}

function clearCustomerDetails() {
    if (!app.table) return;
    app.orders[app.table].clientId = null;
    app.orders[app.table].customer = { name: '', phone: '', address: '' };
    
    document.getElementById('cart-client-select').value = "";
    document.getElementById('cust-name').value = "";
    document.getElementById('cust-phone').value = "";
    document.getElementById('cust-address').value = "";
    
    initializeCustomSelect('cart-client-select');
    
    if (typeof saveToLocal === 'function') saveToLocal();
    if (typeof loadTableData === 'function') loadTableData();
    showToast("Customer details cleared");
}