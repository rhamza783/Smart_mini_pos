/* 
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT: USER INTERFACE, MODALS, THEMES & NAVIGATION (ui.js)                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function applyPreferences() {
    // Apply Theme
    document.body.setAttribute('data-theme', appSettings.preferences.theme || 'default');
    
    // Apply Cart Layout Position (Left or Right)
    if (appSettings.preferences.cartPosition === 'left') {
        document.body.classList.add('cart-left');
    } else {
        document.body.classList.remove('cart-left');
    }
    
    // Apply Typography & Sizes Granularly
    let styleTag = document.getElementById('dynamic-preferences');
    if (styleTag) {
        styleTag.innerHTML = `
            body { 
                font-family: '${appSettings.preferences.fontFamily || 'Inter'}', sans-serif !important; 
                font-style: ${appSettings.preferences.fontStyle || 'normal'} !important; 
            }
            .table-btn { font-size: ${appSettings.preferences.tableFontSize || '0.85rem'} !important; }
            .pos-item-name { font-size: ${appSettings.preferences.itemFontSize || '0.85rem'} !important; }
            .pos-item-price { font-size: ${appSettings.preferences.priceFontSize || '0.75rem'} !important; }
            .pos-cat-btn { font-size: ${appSettings.preferences.catFontSize || '0.75rem'} !important; }
            .order-list-header { font-size: ${appSettings.preferences.cartHeadFontSize || '0.65rem'} !important; }
            .order-item { font-size: ${appSettings.preferences.cartItemFontSize || '0.75rem'} !important; }
            .pay-info-val { font-size: ${appSettings.preferences.paymentFontSize || '1.2rem'} !important; }
        `;
        // Dashboard dynamic elements are usually styled inline or via ChartJS, but we handle the numerical values here
        if(appSettings.preferences.dashNumFontSize) {
            styleTag.innerHTML += `.pay-info-val { font-size: ${appSettings.preferences.dashNumFontSize} !important; }`;
        }
    }
    document.getElementById('app-header-title').textContent = appSettings.property.name + ' POS';
}
applyPreferences();

// --- SYSTEM LOGIN & LOGOUT ---
function performLogin() {
    const id = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value;
    
    const user = appWorkers.find(w => w.login === id && w.pass === pass && w.login !== '');
    if(user) {
        app.currentUser = user; 
        document.getElementById('login-modal').classList.remove('active');
        document.getElementById('login-error').style.display = 'none';
        showToast(`Welcome, ${user.name}`);
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function performLogout() {
    app.currentUser = null;
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('slide-out-menu').classList.remove('active');
    document.getElementById('login-pass').value = '';
    
    // Clear the cart if active
    if (!app.isReadOnly) {
        document.getElementById('current-table-display').textContent = '--';
        app.currentOrder =[];
        if(typeof renderOrderList === 'function') renderOrderList();
        document.body.classList.add('hide-cart');
    }
    
    showToast('Logged Out Successfully');
}

document.addEventListener('DOMContentLoaded', () => {
    const passInput = document.getElementById('login-pass');
    if(passInput) {
        passInput.addEventListener('keydown', function(e) {
            if(e.key === 'Enter') performLogin();
        });
    }
    const idInput = document.getElementById('login-id');
    if(idInput) {
        idInput.addEventListener('keydown', function(e) {
            if(e.key === 'Enter') document.getElementById('login-pass').focus();
        });
    }
});

// --- CUSTOM UI MODALS (Alerts & Confirms) ---
function showCustomAlert(title, message) {
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    document.getElementById('custom-alert-modal').classList.add('active');
}

function openConfirm(title, message, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const btn = document.getElementById('confirm-ok-btn');
    btn.onclick = () => {
        if(callback) callback();
        closeModal('confirm-modal');
    };
    
    document.getElementById('confirm-modal').classList.add('active');
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('active'); 
}

function showToast(msg) { 
    const t = document.getElementById('toast'); 
    t.textContent = msg; 
    t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 2000); 
}

// --- CUSTOM PRICE PROMPT LOGIC ---
let pendingPromptCallback = null;
function openCustomPrompt(title, defaultValue, callback) {
    document.getElementById('prompt-title').textContent = title;
    const input = document.getElementById('prompt-input');
    input.value = defaultValue || '';
    pendingPromptCallback = callback;
    document.getElementById('custom-prompt-modal').classList.add('active');
    setTimeout(() => input.focus(), 100);
    
    input.onkeydown = function(e) {
        if(e.key === 'Enter') { document.getElementById('prompt-confirm-btn').click(); }
    };
}

function closePrompt() {
    document.getElementById('custom-prompt-modal').classList.remove('active');
    pendingPromptCallback = null;
}

document.getElementById('prompt-confirm-btn').onclick = () => {
    if(pendingPromptCallback) {
        const val = document.getElementById('prompt-input').value;
        pendingPromptCallback(val);
    }
    closePrompt();
};

// --- DYNAMIC UI BUILDER & NAVIGATION ---
function buildDynamicZones() {
    const navContainer = document.getElementById('main-nav-buttons');
    navContainer.innerHTML = '';
    const wrapper = document.getElementById('dynamic-zones-wrapper');
    wrapper.innerHTML = '';

    tableLayout.forEach((zone, index) => {
        const btn = document.createElement('button');
        btn.className = `nav-btn ${index === 0 ? 'active' : ''}`;
        btn.onclick = () => showSection(zone.id);
        
        let icon = 'fa-chair';
        if(zone.name.toLowerCase().includes('take')) icon = 'fa-hotdog';
        else if(zone.name.toLowerCase().includes('del')) icon = 'fa-motorcycle';
        else if(zone.name.toLowerCase().includes('roof') || zone.name.toLowerCase().includes('out')) icon = 'fa-cloud-sun';
        
        btn.innerHTML = `<i class="fas ${icon}"></i> ${zone.name}`;
        navContainer.appendChild(btn);

        const sec = document.createElement('div');
        sec.className = `section ${index === 0 ? 'active' : ''}`;
        sec.id = `${zone.id}-section`;
        
        if(zone.name.toLowerCase() !== 'dine in') {
            const h2 = document.createElement('h2');
            h2.style.marginBottom = '20px'; h2.textContent = zone.name;
            sec.appendChild(h2);
        }

        const container = document.createElement('div');
        container.className = 'tables-scroll-container';
        container.id = `${zone.id}-container`;
        sec.appendChild(container);
        wrapper.appendChild(sec);
    });

    const menuBtn = document.createElement('button');
    menuBtn.className = 'nav-btn'; menuBtn.onclick = () => showSection('items');
    menuBtn.innerHTML = `<i class="fas fa-utensils"></i> Menu`;
    navContainer.appendChild(menuBtn);

    const hamBtn = document.createElement('button');
    hamBtn.className = 'nav-btn icon-only'; hamBtn.id = 'hamburger-btn';
    hamBtn.title = 'Settings & Menu'; hamBtn.innerHTML = `<i class="fas fa-bars"></i>`;
    hamBtn.onclick = () => document.getElementById('slide-out-menu').classList.add('active');
    navContainer.appendChild(hamBtn);
}

function showSection(id) {
    if(!app.currentUser && (id === 'dashboard' || id === 'reports' || id === 'config' || id === 'history' || id === 'clients')) {
        showToast("Please login first"); return;
    }
    if(id === 'dashboard' && !hasPerm('viewDashboard')) return showCustomAlert("Denied", "You don't have permission to view Dashboard.");
    if(id === 'reports' && !hasPerm('viewReports')) return showCustomAlert("Denied", "You don't have permission to view Reports.");
    if(id === 'history' && !hasPerm('viewHistory')) return showCustomAlert("Denied", "You don't have permission to view History.");
    if(id === 'clients' && !hasPerm('manageClients')) return showCustomAlert("Denied", "You don't have permission to view Clients.");

    if (id !== 'history' && id !== 'reports' && id !== 'clients' && id !== 'config' && id !== 'dashboard') exitReadOnlyMode();
    
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const target = document.getElementById(id + '-section');
    if(target) target.classList.add('active');
    
    if ((id === 'items' && app.table)) { 
        document.body.classList.remove('hide-cart');
    } else {
        document.body.classList.add('hide-cart');
    }

    if(id === 'items' && !app.table && !app.isReadOnly) { showToast("Select a Table First!"); showSection(tableLayout[0].id); return; }
    if(id === 'items') { renderCategories(); renderMenu(); }
    if(id === 'history') { if(typeof renderHistory === 'function') renderHistory(); }
    if(id === 'clients') { if(typeof renderClientsList === 'function') renderClientsList(); } 
    if(id === 'dashboard') { if(typeof renderDashboard === 'function') renderDashboard(); }
    if(id === 'reports') { if(typeof renderReportMenu === 'function') { renderReportMenu(); runReport(); } }
    if(id === 'config') { if(typeof renderConfigMenu === 'function') renderConfigMenu(); }
    
    document.getElementById('slide-out-menu').classList.remove('active');
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => { if(btn.onclick && btn.onclick.toString().includes(`'${id}'`)) btn.classList.add('active'); });
}

// ============================================================================
// MODERN CUSTOM SELECT / DROPDOWN ENGINE (RADIO BUTTONS)
// ============================================================================
function initializeCustomSelect(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;

    const existingWrapper = selectElement.nextElementSibling;
    if (existingWrapper && existingWrapper.classList.contains('custom-select-wrapper')) existingWrapper.remove();

    selectElement.style.display = 'none';
    selectElement.classList.add('modernized');

    const wrapper = document.createElement('div'); 
    wrapper.className = 'custom-select-wrapper';
    
    const display = document.createElement('div'); 
    display.className = 'custom-select-display';
    
    const updateDisplay = () => {
        const selectedText = selectElement.options[selectElement.selectedIndex]?.text || 'Select...';
        display.innerHTML = `<span>${selectedText}</span> <i class="fas fa-chevron-down" style="font-size:0.8rem;color:var(--text-secondary);"></i>`;
    };
    updateDisplay();
    
    const list = document.createElement('div'); 
    list.className = 'custom-select-list';

    const renderOptions = () => {
        list.innerHTML = '';
        Array.from(selectElement.options).forEach(option => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-select-option' + (option.selected ? ' selected' : '');
            
            // Modern Radio Circle UI inside Dropdowns
            optDiv.innerHTML = `
                <span style="font-weight: ${option.selected ? '800' : '500'};">${option.text}</span> 
                <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${option.selected ? 'var(--col-primary)' : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; transition: 0.2s; flex-shrink: 0;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${option.selected ? 'var(--col-primary)' : 'transparent'}; transition: 0.2s;"></div>
                </div>
            `;

            optDiv.onclick = (e) => {
                e.stopPropagation(); 
                selectElement.value = option.value;
                
                updateDisplay();
                renderOptions(); 
                
                list.classList.remove('show'); 
                display.classList.remove('active');
                
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            };
            list.appendChild(optDiv);
        });
    };
    renderOptions();

    selectElement.addEventListener('change', () => {
        updateDisplay();
        renderOptions();
    });

    display.onclick = (e) => {
        e.stopPropagation(); 
        const isShowing = list.classList.contains('show');
        document.querySelectorAll('.custom-select-list').forEach(l => l.classList.remove('show'));
        document.querySelectorAll('.custom-select-display').forEach(d => d.classList.remove('active'));
        
        if (!isShowing) { 
            list.classList.add('show'); 
            display.classList.add('active'); 
        }
    };
    
    wrapper.appendChild(display); 
    wrapper.appendChild(list);
    selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);
}

// ============================================================================
// UNIVERSAL SMART AUTOCOMPLETE ENGINE (Kills ugly native keyboard suggestions)
// ============================================================================

// Override HTML inline suggestClients to prevent conflict
window.suggestClients = function() {}; 

function initSmartAutocompletes() {
    // List of input IDs that should receive beautiful smart autocompletion
    const fields =[
        { id: 'nc-name', field: 'name', type: 'clients' },
        { id: 'nc-phone', field: 'phone', type: 'clients' },
        { id: 'nc-address', field: 'address', type: 'clients' },
        { id: 'cust-name', field: 'name', type: 'clients' },
        { id: 'cust-phone', field: 'phone', type: 'clients' },
        { id: 'cust-address', field: 'address', type: 'clients' },
        { id: 'adv-tbl-name', field: 'tableName', type: 'tables' },
        { id: 'adv-cat-name', field: 'name', type: 'categories' },
        { id: 'adv-item-name', field: 'name', type: 'items' }
    ];

    fields.forEach(config => {
        const inputEl = document.getElementById(config.id);
        if (!inputEl) return;
        
        // 1. Permanently remove the native list to stop the ugly Android Popup
        inputEl.removeAttribute('list');
        inputEl.setAttribute('autocomplete', 'off');

        if (inputEl.hasAttribute('data-ac-bound')) return;
        inputEl.setAttribute('data-ac-bound', 'true');

        // 2. Wrap the input to anchor the suggestion box perfectly
        if (!inputEl.parentNode.classList.contains('ac-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'ac-wrapper';
            wrapper.style.position = 'relative';
            inputEl.parentNode.insertBefore(wrapper, inputEl);
            wrapper.appendChild(inputEl);
        }

        // 3. Create the Beautiful Floating Suggestion Box
        const sugBox = document.createElement('div');
        sugBox.className = 'custom-select-list'; 
        sugBox.style.width = '100%';
        sugBox.style.top = 'calc(100% + 5px)';
        sugBox.style.zIndex = '3500'; // Make sure it floats above modals
        inputEl.parentNode.appendChild(sugBox);

        inputEl.addEventListener('input', () => {
            const val = inputEl.value.trim().toLowerCase();
            if (!val) { sugBox.classList.remove('show'); return; }

            let matches =[];
            let seen = new Set();
            let sourceArray =[];

            if (config.type === 'clients') sourceArray = app.clients;
            else if (config.type === 'tables' && typeof getFlattenedTables === 'function') sourceArray = getFlattenedTables();
            else if (config.type === 'categories') sourceArray = menuCategories;
            else if (config.type === 'items') sourceArray = menuItems;

            // Search logic
            for (let item of sourceArray) {
                let textVal = item[config.field];
                if (textVal && textVal.toString().toLowerCase().includes(val)) {
                    if (!seen.has(textVal)) {
                        seen.add(textVal);
                        matches.push(item);
                        // HARD LIMIT to 4 Results max!
                        if (matches.length >= 4) break; 
                    }
                }
            }

            if (matches.length === 0) { sugBox.classList.remove('show'); return; }

            sugBox.innerHTML = '';
            matches.forEach(item => {
                const opt = document.createElement('div');
                opt.className = 'custom-select-option';
                opt.style.display = 'flex';
                opt.style.flexDirection = 'column';
                opt.style.alignItems = 'flex-start';
                opt.style.padding = '10px 15px';

                let mainText = item[config.field];
                let subText = '';

                // Show related info dynamically (Phone underneath Name)
                if (config.type === 'clients') {
                    subText = config.field === 'name' ? item.phone : (config.field === 'phone' ? item.name : (item.name + ' - ' + item.phone));
                }

                opt.innerHTML = `<span style="font-weight:800; font-size:0.95rem;">${mainText}</span>`;
                if (subText) opt.innerHTML += `<span style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px;">${subText}</span>`;

                opt.onclick = (e) => {
                    e.stopPropagation();
                    inputEl.value = mainText;
                    
                    // Smart Auto-Fill for the rest of the client form
                    if (config.type === 'clients') {
                        const prefix = config.id.startsWith('nc-') ? 'nc-' : 'cust-';
                        const nameEl = document.getElementById(prefix + 'name');
                        const phoneEl = document.getElementById(prefix + 'phone');
                        const addrEl = document.getElementById(prefix + 'address');
                        
                        if (nameEl && !nameEl.value) nameEl.value = item.name || '';
                        if (phoneEl && !phoneEl.value) phoneEl.value = item.phone || '';
                        if (addrEl && !addrEl.value) addrEl.value = item.address || '';
                        
                        if (prefix === 'cust-' && document.getElementById('cart-client-select')) {
                            document.getElementById('cart-client-select').value = item.id;
                            initializeCustomSelect('cart-client-select'); 
                        }
                    }
                    
                    sugBox.classList.remove('show');
                };
                sugBox.appendChild(opt);
            });
            sugBox.classList.add('show');
        });
    });
}

// Globals to close custom menus
document.addEventListener('click', (e) => {
    // Close Dropdowns
    document.querySelectorAll('.custom-select-list:not(.ac-wrapper .custom-select-list)').forEach(l => l.classList.remove('show'));
    document.querySelectorAll('.custom-select-display').forEach(d => d.classList.remove('active'));
    // Close Autocompletes
    if (!e.target.closest('.ac-wrapper')) {
        document.querySelectorAll('.ac-wrapper .custom-select-list').forEach(box => box.classList.remove('show'));
    }
});

// --- DYNAMIC DATALISTS UPDATER ---
function updateDataLists() {
    let htmlClients = app.clients.map(c => `<option value="${c.name}">`).join('');
    let dlClients = document.getElementById('dl-clients');
    if (dlClients) dlClients.innerHTML = htmlClients;
    
    let htmlWorkers = appWorkers.map(w => `<option value="${w.name}">`).join('');
    let dlWorkers = document.getElementById('dl-workers');
    if (dlWorkers) dlWorkers.innerHTML = htmlWorkers;
    
    if(typeof getFlattenedTables === 'function') {
        let listTables = getFlattenedTables();
        let htmlTables = listTables.map(t => `<option value="${t.tableName}">`).join('');
        let dlTables = document.getElementById('dl-tables');
        if (dlTables) dlTables.innerHTML = htmlTables;
    }
    
    let htmlCats = menuCategories.map(c => `<option value="${c.name}">`).join('');
    let dlCats = document.getElementById('dl-categories');
    if (dlCats) dlCats.innerHTML = htmlCats;
    
    let htmlItems = menuItems.map(i => `<option value="${i.name}">`).join('');
    let dlItems = document.getElementById('dl-items');
    if (dlItems) dlItems.innerHTML = htmlItems;
}

// ============================================================================
// AUTO-OBSERVER ENGINE & MODERN DATE PICKERS
// ============================================================================

function initModernDatePickers() {
    if (typeof flatpickr !== 'undefined') {
        
        // Custom Header Builder for Beautiful Month/Year scrolling
        const buildCustomHeader = function(selectedDates, dateStr, instance) {
            const headerContainer = instance.monthNav;
            headerContainer.style.position = 'relative'; // Give an absolute anchor baseline for the dropdowns
            
            const monthSpan = headerContainer.querySelector('.cur-month');
            const yearInput = instance.currentYearElement;

            // 1. Disable keyboard input on the year
            yearInput.setAttribute('readonly', 'readonly');
            yearInput.style.cursor = 'pointer';
            
            // Hide the default ugly arrows
            const yearWrapper = yearInput.parentNode;
            yearWrapper.querySelectorAll('.arrowUp, .arrowDown').forEach(a => a.style.display = 'none');

            // Add Chevron to Month
            const updateMonthChevron = () => {
                if(!monthSpan.querySelector('.fa-chevron-down')) {
                    monthSpan.innerHTML += ` <i class="fas fa-chevron-down" style="font-size:0.7rem; margin-left:3px; color:var(--col-primary);"></i>`;
                }
            };
            updateMonthChevron();
            instance.config.onMonthChange.push(updateMonthChevron);

            // 2. Create Beautiful Month Dropdown (Position gets applied dynamically onClick)
            const monthList = document.createElement('div');
            monthList.className = 'custom-select-list fp-custom-dropdown';
            monthList.style.cssText = 'position:absolute; width:140px; z-index:9999; text-align:left; box-shadow:0 10px 25px rgba(0,0,0,0.2);';
            
            instance.l10n.months.longhand.forEach((m, idx) => {
                let opt = document.createElement('div');
                opt.className = 'custom-select-option';
                opt.textContent = m;
                opt.onclick = function(e) {
                    e.stopPropagation();
                    instance.changeMonth(idx, false);
                    monthList.classList.remove('show');
                    updateMonthChevron();
                };
                monthList.appendChild(opt);
            });

            // 3. Create Beautiful Scrollable Year Dropdown (Position gets applied dynamically onClick)
            const yearList = document.createElement('div');
            yearList.className = 'custom-select-list fp-custom-dropdown';
            yearList.style.cssText = 'position:absolute; width:100px; max-height:220px; z-index:9999; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); overflow-y:auto;';
            
            // Generate Years from 2020 to 2050
            for(let i = 2020; i <= 2050; i++) {
                let opt = document.createElement('div');
                opt.className = 'custom-select-option';
                opt.textContent = i;
                opt.onclick = function(e) {
                    e.stopPropagation();
                    instance.changeYear(i);
                    yearList.classList.remove('show');
                };
                yearList.appendChild(opt);
            }

            headerContainer.appendChild(monthList);
            headerContainer.appendChild(yearList);

            // 4. Click Listeners to Open the Lists (Perfect alignment calculation)
            monthSpan.onclick = function(e) {
                e.stopPropagation();
                document.querySelectorAll('.fp-custom-dropdown').forEach(d => d.classList.remove('show'));
                
                // Dynamically align EXACTLY below the month name regardless of the month's width
                const spanRect = monthSpan.getBoundingClientRect();
                const headerRect = headerContainer.getBoundingClientRect();
                monthList.style.left = (spanRect.left - headerRect.left + (spanRect.width / 2)) + 'px';
                monthList.style.transform = 'translateX(-50%)';
                monthList.style.top = (spanRect.bottom - headerRect.top + 5) + 'px';
                
                monthList.classList.add('show');
                
                // Highlight active month
                Array.from(monthList.children).forEach(c => {
                    c.style.background = c.textContent === instance.l10n.months.longhand[instance.currentMonth] ? 'var(--col-primary-light)' : '';
                    c.style.color = c.textContent === instance.l10n.months.longhand[instance.currentMonth] ? 'var(--col-primary)' : 'var(--text-primary)';
                    c.style.fontWeight = c.textContent === instance.l10n.months.longhand[instance.currentMonth] ? '800' : '500';
                });
            };

            yearInput.onclick = function(e) {
                e.stopPropagation();
                document.querySelectorAll('.fp-custom-dropdown').forEach(d => d.classList.remove('show'));
                
                // Dynamically align EXACTLY below the year
                const yearRect = yearWrapper.getBoundingClientRect();
                const headerRect = headerContainer.getBoundingClientRect();
                yearList.style.left = (yearRect.left - headerRect.left + (yearRect.width / 2)) + 'px';
                yearList.style.transform = 'translateX(-50%)';
                yearList.style.top = (yearRect.bottom - headerRect.top + 5) + 'px';
                
                yearList.classList.add('show');
                
                // Highlight active year and scroll exactly to it
                let activeOpt = Array.from(yearList.children).find(c => c.textContent == instance.currentYear);
                if(activeOpt) {
                    Array.from(yearList.children).forEach(c => { c.style.background = ''; c.style.color = 'var(--text-primary)'; c.style.fontWeight = '500'; });
                    activeOpt.style.background = 'var(--col-primary-light)';
                    activeOpt.style.color = 'var(--col-primary)';
                    activeOpt.style.fontWeight = '800';
                    
                    // Smoothly scroll the list so the selected year is in the middle
                    setTimeout(() => {
                        yearList.scrollTop = activeOpt.offsetTop - (yearList.clientHeight / 2) + (activeOpt.clientHeight / 2);
                    }, 10);
                }
            };
        };

        // 1. Upgrade Date inputs (Dashboard/History)
        flatpickr("input[type='date']:not(.flatpickr-input)", {
            dateFormat: "Y-m-d",
            disableMobile: true,
            monthSelectorType: "static", // Forces month into text so we can attach our custom menu
            onReady: buildCustomHeader
        });
        
        // 2. Upgrade Time inputs
        flatpickr("input[type='time']:not(.flatpickr-input)", {
            enableTime: true, noCalendar: true, dateFormat: "h:i K", time_24hr: false, disableMobile: true
        });
        
        // 3. Upgrade Combined Date/Time (Reports)
        flatpickr("input[type='datetime-local']:not(.flatpickr-input)", {
            enableTime: true, dateFormat: "Y-m-d h:i K", time_24hr: false, disableMobile: true, monthSelectorType: "static",
            onReady: buildCustomHeader
        });
    }
}

function autoModernizeUI() {
    document.querySelectorAll('select:not(.modernized)').forEach(sel => {
        if(!sel.id) sel.id = 'temp-sel-' + Math.random().toString(36).substr(2, 9);
        initializeCustomSelect(sel.id);
    });
    initSmartAutocompletes();
    initModernDatePickers();
}

document.addEventListener('DOMContentLoaded', autoModernizeUI);

// Universal Global Click listener (closes ALL custom dropdowns when clicking outside)
document.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-select-list:not(.ac-wrapper .custom-select-list)').forEach(l => l.classList.remove('show'));
    document.querySelectorAll('.custom-select-display').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.fp-custom-dropdown').forEach(d => d.classList.remove('show')); // Closes flatpickr menus
    if (!e.target.closest('.ac-wrapper')) {
        document.querySelectorAll('.ac-wrapper .custom-select-list').forEach(box => box.classList.remove('show'));
    }
});

const uiObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) autoModernizeUI();
    });
});
uiObserver.observe(document.body, { childList: true, subtree: true });