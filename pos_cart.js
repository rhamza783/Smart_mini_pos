/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: pos_cart.js – Cart Rendering, Item Quantity Changes, and Totals      ║
║         (Added order notes, item notes, Urdu waiter name)                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function verifyManagerPIN(callback) {
    openCustomPrompt("Manager Approval", null, null, null, 'password', (result) => {
        if (result.price === null) {
            showToast("Action cancelled.");
            callback(false);
            return;
        }
        const managerPin = result.price.toString();
        const adminUser = appWorkers.find(w => w.role === 'Admin' && w.pass === managerPin);
        if (adminUser) {
            showToast(`Approved by ${adminUser.name}`);
            callback(true);
        } else {
            showCustomAlert("Access Denied", "Incorrect Manager PIN.");
            callback(false);
        }
    });
}

function renderOrderList() {
    const list = document.getElementById('order-items-list');
    const wrapper = document.querySelector('.order-items-wrapper');
    list.innerHTML = '';
    if (app.isReadOnly && document.getElementById('ro-banner')) list.appendChild(document.getElementById('ro-banner'));
    if (app.currentOrder.length === 0) {
        const msg = document.createElement('p');
        msg.style.textAlign = 'center';
        msg.style.color = 'var(--text-secondary)';
        msg.style.marginTop = '30px';
        msg.style.fontSize = '0.85rem';
        msg.style.fontStyle = 'italic';
        msg.textContent = app.isReadOnly ? "No items" : "Select a Table to start";
        list.appendChild(msg);
    } else {
        const cartItemLang = appSettings.preferences.cartItemLang || 'both';

        app.currentOrder.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'order-item';

            if (item.type === 'deal') {
                // Render deal header
                div.innerHTML = `
                    <div class="item-name" style="color: var(--col-primary); font-weight:800;">
                        <span class="item-bullet" style="background:var(--col-primary);"></span> 🔥 ${item.name}
                    </div>
                    <div class="item-unit-price"></div>
                    <div class="item-qty">
                        <button class="qty-btn" onclick="changeQty(${idx}, -1)">-</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                    </div>
                    <div class="item-total">${item.total.toFixed(0)}</div>
                `;
                list.appendChild(div);
                // Render children indented
                item.children.forEach(child => {
                    const childDiv = document.createElement('div');
                    childDiv.className = 'order-item';
                    childDiv.style.paddingLeft = '25px';
                    childDiv.style.opacity = '0.8';
                    childDiv.innerHTML = `
                        <div class="item-name">↳ ${child.name}</div>
                        <div class="item-unit-price">${child.price}</div>
                        <div class="item-qty">x${child.qty}</div>
                        <div class="item-total"></div>
                    `;
                    list.appendChild(childDiv);
                });
            } else {
                // Normal item
                const lockIcon = (item.printedQty > 0 && !app.isReadOnly) ? '<i class="fas fa-lock" title="Printed" style="color:var(--col-danger); font-size:0.7rem; margin-left:4px;"></i>' : '';

                let itemNameDisplay = '';
                if (cartItemLang === 'en') {
                    itemNameDisplay = item.name;
                } else if (cartItemLang === 'ur' && item.altName && item.altName.trim() !== '') {
                    itemNameDisplay = `<br><span style="font-family:'Noto Nastaliq Urdu'; font-weight:normal;">${item.altName}</span>`;
                } else if (cartItemLang === 'both') {
                    itemNameDisplay = item.name;
                    if (item.altName && item.altName.trim() !== '') {
                        itemNameDisplay += `<br><span style="font-family:'Noto Nastaliq Urdu'; font-weight:normal;">${item.altName}</span>`;
                    }
                }
                if (itemNameDisplay.trim() === '') {
                    itemNameDisplay = item.name;
                }

                // Add note icon if there's an item note
                const noteIcon = item.itemNote ? '<i class="fas fa-sticky-note" style="color:var(--col-primary); margin-left:4px;" title="' + item.itemNote + '"></i>' : '';

                div.innerHTML = `
                    <div class="item-name"><span class="item-bullet"></span> ${itemNameDisplay} ${lockIcon} ${noteIcon}</div>
                    <div class="item-unit-price">${item.price}</div>
                    <div class="item-qty">
                        <button class="qty-btn" onclick="changeQty(${idx}, -1)">-</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                        <button class="icon-btn-sm" style="margin-left:5px;" onclick="addItemNote(${idx})"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                    <div class="item-total">${item.total.toFixed(0)}</div>`;

                div.addEventListener('click', (event) => {
                    if (!event.target.closest('.qty-btn') && !event.target.closest('.icon-btn-sm')) {
                        editCartItem(idx);
                    }
                });
                list.appendChild(div);
            }
        });

        // Auto-scroll to the bottom when new items are added
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (wrapper) {
                    wrapper.offsetHeight;
                    wrapper.scrollTop = wrapper.scrollHeight;
                }
            }, 50);
        });
    }
    if (!app.isReadOnly) updateTotals();
}

function changeQty(idx, delta) {
    if (app.isReadOnly) return;
    const item = app.currentOrder[idx];

    if (item.type === 'deal') {
        // Deal quantity change
        item.qty += delta;
        if (item.qty < 1) {
            openConfirm('Remove Deal?', `Remove ${item.name} from order?`, () => {
                app.currentOrder.splice(idx, 1);
                saveToLocal();
                renderOrderList();
            });
            return;
        }
        item.total = item.price * item.qty;
        // Children quantities are not stored separately; they are implied.
        saveToLocal();
        renderOrderList();
        return;
    }

    // Normal item logic
    if (delta < 0 && item.printedQty > 0) {
        if (!hasPerm('modifyPrinted')) {
            verifyManagerPIN((isApproved) => {
                if (isApproved) {
                    if (delta < 0 && item.qty <= 1) {
                        openConfirm('Remove Item?', `Are you sure you want to remove ${item.name} from the order?`, () => {
                            app.currentOrder.splice(idx, 1);
                            saveToLocal();
                            renderOrderList();
                        });
                        return;
                    } else {
                        item.qty += delta;
                    }
                    if (app.currentOrder[idx]) app.currentOrder[idx].total = app.currentOrder[idx].qty * app.currentOrder[idx].price;
                    saveToLocal();
                    renderOrderList();
                }
            });
            return;
        }
    }

    if (delta < 0 && item.qty <= 1) {
        openConfirm('Remove Item?', `Are you sure you want to remove ${item.name} from the order?`, () => {
            app.currentOrder.splice(idx, 1);
            saveToLocal();
            renderOrderList();
        });
        return;
    } else {
        item.qty += delta;
    }
    if (app.currentOrder[idx]) app.currentOrder[idx].total = app.currentOrder[idx].qty * app.currentOrder[idx].price;
    saveToLocal();
    renderOrderList();
}

function editCartItem(idx) {
    if (app.isReadOnly) return;
    const item = app.currentOrder[idx];

    // Prevent editing deal items directly (they are composite)
    if (item.type === 'deal') {
        showCustomAlert("Cannot Edit", "Deal items cannot be edited individually. Please adjust the deal quantity or remove the deal.");
        return;
    }

    openCustomPrompt(
        `Edit ${item.name}`,
        null,
        item.price,
        item.qty,
        'both',
        (result) => {
            if (result.price === null && result.qty === null) return;

            let newPrice = result.price !== null ? result.price : item.price;
            let newQty = result.qty !== null ? result.qty : item.qty;

            if (newPrice < 0) {
                showCustomAlert("Invalid Price", "Price cannot be negative.");
                return;
            }
            if (item.printedQty > 0 && newPrice < item.price) {
                if (!hasPerm('modifyPrinted')) {
                    verifyManagerPIN((isApproved) => {
                        if (isApproved) {
                            item.price = newPrice;
                            item.qty = newQty;
                            item.total = item.price * item.qty;
                            saveToLocal();
                            renderOrderList();
                            showToast(`Updated ${item.name}`);
                        }
                    });
                    return;
                }
            }

            item.price = newPrice;
            item.qty = newQty;
            item.total = item.price * item.qty;
            saveToLocal();
            renderOrderList();
            showToast(`Updated ${item.name}`);
        }
    );
}

function addItemNote(idx) {
    const item = app.currentOrder[idx];
    openCustomPrompt(`Note for ${item.name}`, null, 0, 0, 'text', (result) => {
        if (result.text !== null) {
            item.itemNote = result.text;
            saveToLocal();
            renderOrderList();
        }
    });
}

function addDealToOrder(deal) {
    if (app.isReadOnly) return;

    // Create a structured deal object
    const dealItem = {
        type: 'deal',
        dealId: deal.id,
        name: deal.name,
        price: deal.price,
        qty: 1,
        total: deal.price,
        children: deal.items.map(comp => {
            const menuItem = menuItems.find(m => m.id === comp.id);
            return {
                id: comp.id,
                name: menuItem ? menuItem.name : 'Unknown',
                qty: comp.qty,
                price: menuItem ? menuItem.price : 0,
                originalPrice: menuItem ? menuItem.price : 0,
                itemNote: ''
            };
        })
    };

    app.currentOrder.push(dealItem);
    saveToLocal();
    renderOrderList();
}

function getOrderTotals() {
    const subtotal = app.currentOrder.reduce((a, b) => a + b.total, 0);
    const discVal = parseFloat(app.orders[app.table]?.discount || 0);
    let discountAmt = (app.orders[app.table]?.discType === 'percent') ? subtotal * (discVal / 100) : discVal;
    return { sub: subtotal, disc: discountAmt, total: subtotal - discountAmt };
}

function updateTotals() {
    if (app.isReadOnly) return;
    const totals = getOrderTotals();
    document.getElementById('subtotal-display').textContent = totals.sub.toFixed(0);
    document.getElementById('discount-display-txt').textContent = `Disc: ${totals.disc.toFixed(0)}`;
    document.getElementById('total-display').textContent = `${appSettings.property.currency} ${totals.total.toFixed(0)}`;
    if (app.table && app.orders[app.table]) {
        const currentDiscInput = document.getElementById('input-discount');
        if (currentDiscInput) currentDiscInput.value = app.orders[app.table].discount || 0;
        localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    }
    updateTableButtons();
}

function saveToLocal() {
    if (app.table && !app.isReadOnly) {
        app.orders[app.table].items = app.currentOrder;
        localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    }
}

function formatOrderTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function clearOrder() {
    if (app.isReadOnly) return;
    if (!app.table) return;

    if (!hasPerm('deleteActiveOrder')) return showCustomAlert("Denied", "You do not have permission to delete/clear active orders.");
    openConfirm("Clear Order", "Are you sure you want to completely clear this order? All items will be removed.", () => {
        app.currentOrder = [];
        saveToLocal();
        renderOrderList();
    });
}

// ============================================================================
// LOAD TABLE DATA (with Urdu waiter name)
// ============================================================================
function loadTableData() {
    const data = app.orders[app.table];
    app.currentOrder = data.items;
    app.discountType = data.discType || 'fixed';
    document.getElementById('current-table-display').textContent = app.table;
    document.getElementById('order-id-display').textContent = 'Ord #' + data.id;
    document.getElementById('start-time-display').textContent = formatOrderTime(data.startTime);
    const discInput = document.getElementById('input-discount');
    if (discInput) discInput.value = data.discount || 0;
    document.getElementById('btn-waiter').innerHTML = `<i class="fas fa-user-tie"></i> ${formatWorkerName(data.waiter || "Staff")}`;

    // Load order notes into textarea
    const notesInput = document.getElementById('order-notes');
    if (notesInput) {
        notesInput.value = data.notes || '';
        notesInput.oninput = function() {
            app.orders[app.table].notes = this.value;
            localStorage.setItem('savedOrders', JSON.stringify(app.orders));
        };
    }
    
    const clientDisp = document.getElementById('cart-client-display');
    if (data.clientId) {
        const cl = app.clients.find(c => c.id === data.clientId);
        if (cl) {
            if (cl.isBlocked) {
                clientDisp.innerHTML = `Client: ${cl.name} <span style="color:var(--col-danger); font-weight:900;">[BLOCKED]</span>`;
                document.getElementById('cart-close-btn').disabled = true;
                document.getElementById('cart-close-btn').style.opacity = '0.5';
            } else {
                clientDisp.textContent = `Client: ${cl.name} (${cl.company || cl.phone})`;
                document.getElementById('cart-close-btn').disabled = false;
                document.getElementById('cart-close-btn').style.opacity = '1';
            }
            clientDisp.style.display = 'block';
        }
    } else {
        clientDisp.style.display = 'none';
        document.getElementById('cart-close-btn').disabled = false;
        document.getElementById('cart-close-btn').style.opacity = '1';
    }
}