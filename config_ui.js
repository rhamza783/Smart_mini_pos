// config_ui.js – Configuration Menu Rendering and Tab Switching
// Version: 2.0 – Integrated with Inventory Settings

const configTabs = [
    'Property Settings',
    'Preferences (General UI)',
    'Cart Settings',
    'Menu Item Settings',
    'Table Display Settings',
    'Active Orders Display',
    'Reservation Settings',
    'Loyalty Settings',
    'Receipt Designer',
    'Workers Management',
    'Security Roles',
    'Bill Configuration',
    'KOT Print Settings',
    'Payment Methods',
    'Shortcuts',
    'Inventory Settings'
];
let activeConfigTab = 'Property Settings';
let editingWorkerIndex = null;
window.activeTableDisplayZone = 'dinein';
window.activeOrdersDisplayZone = 'dinein';

// ============================================================================
// RENDER CONFIGURATION MENU
// ============================================================================
function renderConfigMenu() {
    const menu = document.getElementById('conf-menu-body');
    menu.innerHTML = '';
    configTabs.forEach(tab => {
        if (tab === 'Security Roles' && !hasPerm('editRoles')) return;
        if (tab === 'Shortcuts' && !hasPerm('editRoles')) return;
        if (tab === 'Inventory Settings' && !hasPerm('manageInventory')) return;

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

// ============================================================================
// RENDER CONFIGURATION CONTENT (DYNAMIC BASED ON TAB)
// ============================================================================
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
                        <img id="prop-logo-preview" src="${appSettings.property.logo || ''}" style="${appSettings.property.logo ? 'display:block;' : 'display:none;'}" alt="Restaurant Logo">
                        <button class="img-remove-btn" onclick="removePropLogo(event)"><i class="fas fa-trash"></i></button>
                    </div>
                    <input type="file" id="prop-logo-input" accept="image/*" style="display:none;" onchange="previewPropLogo(this)">
                    <input type="hidden" id="prop-logo-base64" value="${appSettings.property.logo || ''}">
                </div>
                <div class="modern-input-group"><label>Restaurant Name</label><input type="text" id="prop-name" class="modern-input" value="${appSettings.property.name}" oninput="updatePrintPreviewProperty()"></div>
                <div class="modern-input-group"><label>Phone Number</label><input type="text" id="prop-phone" class="modern-input" value="${appSettings.property.phone}" oninput="updatePrintPreviewProperty()"></div>
                <div class="modern-input-group full-width"><label>Address</label><input type="text" id="prop-address" class="modern-input" value="${appSettings.property.address}" oninput="updatePrintPreviewProperty()"></div>
                <div class="modern-input-group"><label>Currency</label><input type="text" id="prop-currency" class="modern-input" value="${appSettings.property.currency}"></div>
                <div class="modern-input-group"><label>Branch Code / Name</label><input type="text" id="prop-branch" class="modern-input" value="${appSettings.property.branch}" oninput="updatePrintPreviewProperty()"></div>
                <div class="modern-input-group"><label>Opening Time (HH:MM)</label><input type="time" id="prop-open" class="modern-input" value="${appSettings.property.openingTime || '00:00'}"></div>
                <div class="modern-input-group"><label>Closing Time (HH:MM)</label><input type="time" id="prop-close" class="modern-input" value="${appSettings.property.closingTime || '23:59'}"></div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveConfigProperty()">Save Property Settings</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetSettings('property')">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Preferences (General UI)') {
        const p = appSettings.preferences;
        h += `
            <div class="modern-form-grid" style="max-width:600px;">
                <div class="modern-input-group">
                    <label>UI Theme</label>
                    <select id="pref-theme" class="modern-input" onchange="applyPreferences()">
                        <option value="default" ${p.theme === 'default' ? 'selected' : ''}>Default Light</option>
                        <option value="dark" ${p.theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
                        <option value="ocean" ${p.theme === 'ocean' ? 'selected' : ''}>Ocean Blue</option>
                        <option value="sunset" ${p.theme === 'sunset' ? 'selected' : ''}>Sunset Orange</option>
                        <option value="emerald" ${p.theme === 'emerald' ? 'selected' : ''}>Emerald Green</option>
                        <option value="minimalist" ${p.theme === 'minimalist' ? 'selected' : ''}>Minimalist Gray</option>
                        <option value="neon" ${p.theme === 'neon' ? 'selected' : ''}>Neon Purple</option>
                    </select>
                </div>
                <div class="modern-input-group">
                    <label>Cart Position</label>
                    <select id="pref-cart-pos" class="modern-input" onchange="applyPreferences()">
                        <option value="right" ${p.cartPosition === 'right' ? 'selected' : ''}>Right Side (Default)</option>
                        <option value="left" ${p.cartPosition === 'left' ? 'selected' : ''}>Left Side</option>
                    </select>
                </div>
                <div class="modern-input-group">
                    <label>Base Font Family (General UI)</label>
                    <select id="pref-font" class="modern-input" onchange="applyPreferences()">
                        ${fontFamilies.map(f => `<option value="${f.value}" ${p.fontFamily === f.value ? 'selected' : ''}>${f.text}</option>`).join('')}
                    </select>
                </div>
                <div class="modern-input-group">
                    <label>Base Font Style (General UI)</label>
                    <select id="pref-font-style" class="modern-input" onchange="applyPreferences()">
                        ${fontStyles.map(s => `<option value="${s.value}" ${p.fontStyle === s.value ? 'selected' : ''}>${s.text}</option>`).join('')}
                    </select>
                </div>

                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Dashboard / Payment Font Sizing</h4>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Checkout / Payment Totals</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 1.2rem)</label><input type="text" id="pref-pay" class="modern-input" value="${p.paymentFontSize || '1.2rem'}" oninput="applyPreferences()"></div>
                        ${renderFontSelect('pref-pay', p.uiFont?.paymentFamily, p.uiFont?.paymentStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Dashboard Numbers</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 1.2rem)</label><input type="text" id="pref-dash-num" class="modern-input" value="${p.dashNumFontSize || '1.2rem'}" oninput="applyPreferences()"></div>
                        ${renderFontSelect('pref-dash-num', p.uiFont?.dashNumFamily, p.uiFont?.dashNumStyle)}
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveConfigPreferencesGeneral()">Save & Apply Preferences</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetSettings('preferences')">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Cart Settings') {
        const p = appSettings.preferences;
        const uiFont = p.uiFont || {};
        h += `
            <div class="modern-form-grid" style="max-width:800px;">
                <div class="modern-input-group full-width">
                    <label>Cart Item Language (List)</label>
                    <select id="pref-cart-item-lang" class="modern-input" onchange="applyPreferences(); applyAdvancedCSSVariables();">
                        <option value="both" ${p.cartItemLang === 'both' ? 'selected' : ''}>Both (English + Urdu)</option>
                        <option value="en" ${p.cartItemLang === 'en' ? 'selected' : ''}>English Only</option>
                        <option value="ur" ${p.cartItemLang === 'ur' ? 'selected' : ''}>Urdu Only</option>
                    </select>
                </div>

                <div class="modern-input-group full-width" style="background:rgba(103, 80, 164, 0.1); padding:10px; border-radius:10px;">
                    <label style="color:var(--col-primary);">Space between Cart Item & Partition Line (e.g. 2px)</label>
                    <input type="text" id="pref-cart-spacing" class="modern-input" value="${p.cartItemSpacing || '2px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                    <small style="margin-top:5px; display:block;">Increases the padding above and below each cart item.</small>
                </div>

                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Cart Header Typography</h4>
        `;

        const headerCols = ['Name', 'Price', 'Qty', 'Total'];
        headerCols.forEach(col => {
            const lowerCol = col.toLowerCase();
            h += `
                <div class="full-width-group" style="margin-bottom:10px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Header: ${col}</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="pref-cart-head-${lowerCol}-size" class="modern-input" value="${p[`cartHead${col}Size`] || '0.65rem'}" oninput="applyPreferences(); applyAdvancedCSSVariables();"></div>
                        ${renderFontSelect(`pref-cart-head-${lowerCol}`, uiFont[`cartHead${col}Family`], uiFont[`cartHead${col}Style`])}
                    </div>
                </div>
            `;
        });

        h += `<h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Cart Item Typography</h4>`;

        const itemCols = ['Name', 'Price', 'Qty', 'Total'];
        itemCols.forEach(col => {
            const lowerCol = col.toLowerCase();
            h += `
                <div class="full-width-group" style="margin-bottom:10px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Item: ${col}</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="pref-cart-item-${lowerCol}-size" class="modern-input" value="${p[`cartItem${col}Size`] || (col === 'Total' ? '0.8rem' : '0.75rem')}" oninput="applyPreferences(); applyAdvancedCSSVariables();"></div>
                        ${renderFontSelect(`pref-cart-item-${lowerCol}`, uiFont[`cartItem${col}Family`], uiFont[`cartItem${col}Style`])}
                    </div>
                </div>
            `;
        });

        h += `
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveConfigPreferencesCartMenu()">Save & Apply Preferences</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetSettings('preferences')">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Menu Item Settings') {
        const p = appSettings.preferences;
        const uiFont = p.uiFont || {};
        h += `
            <div class="modern-form-grid" style="max-width:600px;">
                <h4 style="grid-column: span 2; margin-top:0px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Menu Button Sizing & Display</h4>
                <div class="modern-input-group">
                    <label>Menu Item Language (Buttons)</label>
                    <select id="pref-menu-lang" class="modern-input" onchange="applyPreferences()">
                        <option value="both" ${p.menuLang === 'both' ? 'selected' : ''}>Both (English + Urdu)</option>
                        <option value="en" ${p.menuLang === 'en' ? 'selected' : ''}>English Only</option>
                        <option value="ur" ${p.menuLang === 'ur' ? 'selected' : ''}>Urdu Only</option>
                    </select>
                </div>
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="pref-btn-auto" class="apple-switch" ${p.menuBtnAutoSize ? 'checked' : ''} onchange="applyPreferences()">
                    <label for="pref-btn-auto" style="margin:0; font-size:0.9rem; cursor:pointer; text-transform:none;">Auto-Size Menu Buttons (flexible width, ignores below)</label>
                </div>
                <div class="modern-input-group">
                    <label>Menu Button Width (e.g., 120px)</label>
                    <input type="text" id="pref-btn-width" class="modern-input" value="${p.menuBtnWidth || '120px'}" oninput="applyPreferences()">
                </div>
                <div class="modern-input-group">
                    <label>Menu Button Height (e.g., 80px)</label>
                    <input type="text" id="pref-btn-height" class="modern-input" value="${p.menuBtnHeight || '80px'}" oninput="applyPreferences()">
                </div>
                <div class="modern-input-group">
                    <label>Menu Button Min-Item-Width (e.g., 100px)</label>
                    <input type="text" id="pref-btn-min-width" class="modern-input" value="${p.menuBtnMinItemWidth || '100px'}" oninput="applyPreferences()">
                </div>
                <div class="modern-input-group">
                    <label>Menu Button Vertical Gap (e.g., 12px)</label>
                    <input type="text" id="pref-btn-gap" class="modern-input" value="${p.menuBtnGap || '12px'}" oninput="applyPreferences()">
                </div>
                <div class="modern-input-group">
                    <label>Menu Button Horizontal Gap (e.g., 12px)</label>
                    <input type="text" id="pref-btn-column-gap" class="modern-input" value="${p.menuBtnColumnGap || '12px'}" oninput="applyPreferences()">
                </div>
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="pref-show-prices" class="apple-switch" ${p.showPricesOnMenu ? 'checked' : ''} onchange="applyPreferences()">
                    <label for="pref-show-prices" style="margin:0; font-size:0.9rem; cursor:pointer; text-transform:none;">Show Prices on Menu Buttons</label>
                </div>
                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Menu Item Typography</h4>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Category Tab</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 0.75rem)</label><input type="text" id="pref-cat" class="modern-input" value="${p.catFontSize || '0.75rem'}" oninput="applyPreferences()"></div>
                        ${renderFontSelect('pref-cat', uiFont.catFamily, uiFont.catStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Menu Item Name</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 0.85rem)</label><input type="text" id="pref-item" class="modern-input" value="${p.itemFontSize || '0.85rem'}" oninput="applyPreferences()"></div>
                        ${renderFontSelect('pref-item', uiFont.itemFamily, uiFont.itemStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Menu Item Price</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 0.75rem)</label><input type="text" id="pref-price" class="modern-input" value="${p.priceFontSize || '0.75rem'}" oninput="applyPreferences()"></div>
                        ${renderFontSelect('pref-price', uiFont.priceFamily, uiFont.priceStyle)}
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveConfigPreferencesMenu()">Save & Apply Preferences</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetSettings('preferences')">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Table Display Settings') {
        const zone = window.activeTableDisplayZone;
        const zoneDisplayNames = { dinein: 'Dine In', takeaway: 'Take Away', delivery: 'Delivery' };
        const zoneSettings = appSettings.tableDisplay?.[zone] || appSettings.tableDisplay?.dinein || {};

        h += `
            <div id="table-display-zone-tabs" style="display:flex; gap:8px; margin-bottom:24px; flex-wrap:wrap;">
                <button onclick="setActiveTableDisplayZone('dinein')" style="padding:10px 22px; border-radius:10px; border:2px solid ${zone === 'dinein' ? 'var(--col-primary)' : 'transparent'}; cursor:pointer; font-weight:700; font-size:0.9rem; background:${zone === 'dinein' ? 'var(--col-primary)' : 'var(--bg-app)'}; color:${zone === 'dinein' ? '#fff' : 'var(--text-primary)'}; box-shadow:var(--neumorph-out-sm);">🍽️ Dine In</button>
                <button onclick="setActiveTableDisplayZone('takeaway')" style="padding:10px 22px; border-radius:10px; border:2px solid ${zone === 'takeaway' ? 'var(--col-primary)' : 'transparent'}; cursor:pointer; font-weight:700; font-size:0.9rem; background:${zone === 'takeaway' ? 'var(--col-primary)' : 'var(--bg-app)'}; color:${zone === 'takeaway' ? '#fff' : 'var(--text-primary)'}; box-shadow:var(--neumorph-out-sm);">🥡 Take Away</button>
                <button onclick="setActiveTableDisplayZone('delivery')" style="padding:10px 22px; border-radius:10px; border:2px solid ${zone === 'delivery' ? 'var(--col-primary)' : 'transparent'}; cursor:pointer; font-weight:700; font-size:0.9rem; background:${zone === 'delivery' ? 'var(--col-primary)' : 'var(--bg-app)'}; color:${zone === 'delivery' ? '#fff' : 'var(--text-primary)'}; box-shadow:var(--neumorph-out-sm);">🛵 Delivery</button>
            </div>
            <div class="modern-form-grid" style="max-width:600px;">
                <h4 style="grid-column: span 2; margin-top:0px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Table Button Sizing (${zoneDisplayNames[zone]})</h4>
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="pref-tbl-btn-auto-${zone}" class="apple-switch" ${zoneSettings.tableBtnAutoSize ? 'checked' : ''} onchange="applyPreferences(); applyAdvancedCSSVariables();">
                    <label for="pref-tbl-btn-auto-${zone}" style="margin:0; font-size:0.9rem; cursor:pointer; text-transform:none;">Auto-Size Table Buttons (flexible width, ignores below)</label>
                </div>
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="pref-ask-client-${zone}" class="apple-switch" ${zoneSettings.askForClient ? 'checked' : ''} onchange="applyPreferences();">
                    <label for="pref-ask-client-${zone}" style="margin:0; font-size:0.9rem; cursor:pointer; text-transform:none;">Ask for Customer Info when opening new order</label>
                </div>
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="pref-ask-waiter-${zone}" class="apple-switch" ${zoneSettings.askForWaiter ? 'checked' : ''} onchange="applyPreferences();">
                    <label for="pref-ask-waiter-${zone}" style="margin:0; font-size:0.9rem; cursor:pointer; text-transform:none;">Ask for Waiter when opening new order (for Dine In)</label>
                </div>
                <div class="modern-input-group">
                    <label>Table Button Width (e.g., 100px)</label>
                    <input type="text" id="pref-tbl-btn-width-${zone}" class="modern-input" value="${zoneSettings.tableBtnWidth || '100px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>
                <div class="modern-input-group">
                    <label>Table Button Height (e.g., 70px)</label>
                    <input type="text" id="pref-tbl-btn-height-${zone}" class="modern-input" value="${zoneSettings.tableBtnHeight || '70px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>
                <div class="modern-input-group">
                    <label>Table Button Min-Item-Width (e.g., 80px)</label>
                    <input type="text" id="pref-tbl-btn-min-width-${zone}" class="modern-input" value="${zoneSettings.tableBtnMinItemWidth || '80px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>
                <div class="modern-input-group">
                    <label>Vertical Gap BETWEEN Buttons (e.g., 15px)</label>
                    <input type="text" id="pref-tbl-btn-gap-${zone}" class="modern-input" value="${zoneSettings.tableBtnGap || '15px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>
                <div class="modern-input-group">
                    <label>Horizontal Gap BETWEEN Buttons (e.g., 15px)</label>
                    <input type="text" id="pref-tbl-btn-column-gap-${zone}" class="modern-input" value="${zoneSettings.tableBtnColumnGap || '15px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>

                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Table Groups Visual Settings</h4>
                <div class="modern-input-group">
                    <label>Group Line Style</label>
                    <select id="pref-tbl-group-line-style-${zone}" class="modern-input" onchange="applyPreferences(); applyAdvancedCSSVariables();">
                        <option value="none" ${zoneSettings.tableGroupLineStyle === 'none' ? 'selected' : ''}>None</option>
                        <option value="solid" ${zoneSettings.tableGroupLineStyle === 'solid' ? 'selected' : ''}>Solid</option>
                        <option value="dashed" ${zoneSettings.tableGroupLineStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                        <option value="dotted" ${zoneSettings.tableGroupLineStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                    </select>
                </div>
                <div class="modern-input-group">
                    <label>Group Line Thickness (e.g., 1px)</label>
                    <input type="text" id="pref-tbl-group-line-thickness-${zone}" class="modern-input" value="${zoneSettings.tableGroupLineThickness || '1px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>
                <div class="modern-input-group">
                    <label>Group Line Color (e.g., rgba(0,0,0,0.1))</label>
                    <input type="text" id="pref-tbl-group-line-color-${zone}" class="modern-input" value="${zoneSettings.tableGroupLineColor || 'rgba(0,0,0,0.1)'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>
                <div class="modern-input-group">
                    <label>Button Border Radius (e.g., 8px)</label>
                    <input type="text" id="pref-tbl-btn-border-radius-${zone}" class="modern-input" value="${zoneSettings.tableButtonBorderRadius || '8px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>

                <div class="modern-input-group full-width" style="background:var(--col-primary-light); padding:10px; border-radius:10px;">
                    <label style="color:var(--col-primary);">Space ABOVE buttons to Partition Line (e.g., 15px)</label>
                    <input type="text" id="pref-tbl-partition-gap-top-${zone}" class="modern-input" value="${zoneSettings.tablePartitionGapTop || '15px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>
                <div class="modern-input-group full-width" style="background:rgba(229, 62, 62, 0.1); padding:10px; border-radius:10px;">
                    <label style="color:var(--col-danger);">Space BELOW buttons to Partition Line (e.g., 25px)</label>
                    <input type="text" id="pref-tbl-partition-gap-bottom-${zone}" class="modern-input" value="${zoneSettings.tablePartitionGapBottom || '25px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>
                <div class="modern-input-group full-width">
                    <label>Group Horizontal Padding (e.g., 15px)</label>
                    <input type="text" id="pref-tbl-group-h-padding-${zone}" class="modern-input" value="${zoneSettings.tableGroupHPadding || '15px'}" oninput="applyPreferences(); applyAdvancedCSSVariables();">
                </div>

                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Table Buttons Typography</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 0.85rem)</label><input type="text" id="pref-table-${zone}" class="modern-input" value="${zoneSettings.tableFontSize || '0.85rem'}" oninput="applyPreferences(); applyAdvancedCSSVariables();"></div>
                        ${renderFontSelectWithZone(`pref-table-${zone}`, zoneSettings.uiFont?.tableFamily, zoneSettings.uiFont?.tableStyle)}
                    </div>
                </div>

                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Table Heading Typography</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 0.85rem)</label><input type="text" id="pref-tbl-head-font-size-${zone}" class="modern-input" value="${zoneSettings.tableGroupHeaderFontSize || '0.85rem'}" oninput="applyPreferences(); applyAdvancedCSSVariables();"></div>
                        ${renderFontSelectWithZone(`pref-tbl-head-${zone}`, zoneSettings.uiFont?.tableHeaderFamily, zoneSettings.uiFont?.tableHeaderStyle)}
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveConfigPreferencesTableForZone('${zone}')">Save & Apply Preferences for ${zoneDisplayNames[zone]}</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetTableDisplayZone('${zone}')">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Active Orders Display') {
        const zone = window.activeOrdersDisplayZone;
        const zoneDisplayNames = { dinein: 'Dine In', takeaway: 'Take Away', delivery: 'Delivery' };
        const zoneSettings = appSettings.activeOrdersDisplay?.[zone] || appSettings.activeOrdersDisplay?.dinein || {};
        const globalSettings = appSettings.activeOrdersDisplay || { groupByZone: true };

        h += `
            <div id="active-orders-zone-tabs" style="display:flex; gap:8px; margin-bottom:24px; flex-wrap:wrap;">
                <button onclick="setActiveOrdersDisplayZone('dinein')" style="padding:10px 22px; border-radius:10px; border:2px solid ${zone === 'dinein' ? 'var(--col-primary)' : 'transparent'}; cursor:pointer; font-weight:700; font-size:0.9rem; background:${zone === 'dinein' ? 'var(--col-primary)' : 'var(--bg-app)'}; color:${zone === 'dinein' ? '#fff' : 'var(--text-primary)'}; box-shadow:var(--neumorph-out-sm);">🍽️ Dine In</button>
                <button onclick="setActiveOrdersDisplayZone('takeaway')" style="padding:10px 22px; border-radius:10px; border:2px solid ${zone === 'takeaway' ? 'var(--col-primary)' : 'transparent'}; cursor:pointer; font-weight:700; font-size:0.9rem; background:${zone === 'takeaway' ? 'var(--col-primary)' : 'var(--bg-app)'}; color:${zone === 'takeaway' ? '#fff' : 'var(--text-primary)'}; box-shadow:var(--neumorph-out-sm);">🥡 Take Away</button>
                <button onclick="setActiveOrdersDisplayZone('delivery')" style="padding:10px 22px; border-radius:10px; border:2px solid ${zone === 'delivery' ? 'var(--col-primary)' : 'transparent'}; cursor:pointer; font-weight:700; font-size:0.9rem; background:${zone === 'delivery' ? 'var(--col-primary)' : 'var(--bg-app)'}; color:${zone === 'delivery' ? '#fff' : 'var(--text-primary)'}; box-shadow:var(--neumorph-out-sm);">🛵 Delivery</button>
            </div>
            <div class="modern-form-grid" style="max-width:600px;">
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="ao-group-by-zone" class="apple-switch" ${globalSettings.groupByZone ? 'checked' : ''} onchange="saveActiveOrdersGlobalSetting()">
                    <label for="ao-group-by-zone" style="margin:0; font-size:0.9rem; cursor:pointer; text-transform:none;">Group by Zone</label>
                </div>

                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Tile Sizing (${zoneDisplayNames[zone]})</h4>
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="ao-tile-auto-${zone}" class="apple-switch" ${zoneSettings.tileAutoSize ? 'checked' : ''} onchange="applyActiveOrdersPreview();">
                    <label for="ao-tile-auto-${zone}" style="margin:0; font-size:0.9rem; cursor:pointer; text-transform:none;">Auto-Size Tiles (flexible width, ignores below)</label>
                </div>
                <div class="modern-input-group">
                    <label>Tile Width (e.g., 100px)</label>
                    <input type="text" id="ao-tile-width-${zone}" class="modern-input" value="${zoneSettings.tileWidth || '100px'}" oninput="applyActiveOrdersPreview();">
                </div>
                <div class="modern-input-group">
                    <label>Tile Height (e.g., 70px)</label>
                    <input type="text" id="ao-tile-height-${zone}" class="modern-input" value="${zoneSettings.tileHeight || '70px'}" oninput="applyActiveOrdersPreview();">
                </div>
                <div class="modern-input-group">
                    <label>Tile Min-Item-Width (e.g., 80px)</label>
                    <input type="text" id="ao-tile-min-width-${zone}" class="modern-input" value="${zoneSettings.tileMinItemWidth || '80px'}" oninput="applyActiveOrdersPreview();">
                </div>
                <div class="modern-input-group">
                    <label>Vertical Gap BETWEEN Tiles (e.g., 15px)</label>
                    <input type="text" id="ao-tile-gap-${zone}" class="modern-input" value="${zoneSettings.tileGap || '15px'}" oninput="applyActiveOrdersPreview();">
                </div>
                <div class="modern-input-group">
                    <label>Horizontal Gap BETWEEN Tiles (e.g., 15px)</label>
                    <input type="text" id="ao-tile-column-gap-${zone}" class="modern-input" value="${zoneSettings.tileColumnGap || '15px'}" oninput="applyActiveOrdersPreview();">
                </div>

                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Group Visual Settings</h4>
                <div class="modern-input-group">
                    <label>Group Line Style</label>
                    <select id="ao-group-line-style-${zone}" class="modern-input" onchange="applyActiveOrdersPreview();">
                        <option value="none" ${zoneSettings.groupLineStyle === 'none' ? 'selected' : ''}>None</option>
                        <option value="solid" ${zoneSettings.groupLineStyle === 'solid' ? 'selected' : ''}>Solid</option>
                        <option value="dashed" ${zoneSettings.groupLineStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                        <option value="dotted" ${zoneSettings.groupLineStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                    </select>
                </div>
                <div class="modern-input-group">
                    <label>Group Line Thickness (e.g., 1px)</label>
                    <input type="text" id="ao-group-line-thickness-${zone}" class="modern-input" value="${zoneSettings.groupLineThickness || '1px'}" oninput="applyActiveOrdersPreview();">
                </div>
                <div class="modern-input-group">
                    <label>Group Line Color (e.g., rgba(0,0,0,0.1))</label>
                    <input type="text" id="ao-group-line-color-${zone}" class="modern-input" value="${zoneSettings.groupLineColor || 'rgba(0,0,0,0.1)'}" oninput="applyActiveOrdersPreview();">
                </div>
                <div class="modern-input-group">
                    <label>Tile Border Radius (e.g., 8px)</label>
                    <input type="text" id="ao-tile-border-radius-${zone}" class="modern-input" value="${zoneSettings.tileBorderRadius || '8px'}" oninput="applyActiveOrdersPreview();">
                </div>

                <div class="modern-input-group full-width" style="background:var(--col-primary-light); padding:10px; border-radius:10px;">
                    <label style="color:var(--col-primary);">Space ABOVE tiles to Partition Line (e.g., 15px)</label>
                    <input type="text" id="ao-partition-gap-top-${zone}" class="modern-input" value="${zoneSettings.partitionGapTop || '15px'}" oninput="applyActiveOrdersPreview();">
                </div>
                <div class="modern-input-group full-width" style="background:rgba(229, 62, 62, 0.1); padding:10px; border-radius:10px;">
                    <label style="color:var(--col-danger);">Space BELOW tiles to Partition Line (e.g., 25px)</label>
                    <input type="text" id="ao-partition-gap-bottom-${zone}" class="modern-input" value="${zoneSettings.partitionGapBottom || '25px'}" oninput="applyActiveOrdersPreview();">
                </div>
                <div class="modern-input-group full-width">
                    <label>Group Horizontal Padding (e.g., 15px)</label>
                    <input type="text" id="ao-group-h-padding-${zone}" class="modern-input" value="${zoneSettings.groupHPadding || '15px'}" oninput="applyActiveOrdersPreview();">
                </div>

                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Table Name Typography</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 0.9rem)</label><input type="text" id="ao-table-name-size-${zone}" class="modern-input" value="${zoneSettings.tableNameFontSize || '0.9rem'}" oninput="applyActiveOrdersPreview();"></div>
                        ${renderFontSelectWithZone(`ao-table-name-${zone}`, zoneSettings.uiFont?.tableNameFamily, zoneSettings.uiFont?.tableNameStyle)}
                    </div>
                </div>

                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Timer Typography</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 0.8rem)</label><input type="text" id="ao-timer-size-${zone}" class="modern-input" value="${zoneSettings.timerFontSize || '0.8rem'}" oninput="applyActiveOrdersPreview();"></div>
                        ${renderFontSelectWithZone(`ao-timer-${zone}`, zoneSettings.uiFont?.timerFamily, zoneSettings.uiFont?.timerStyle)}
                    </div>
                </div>

                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Group Header Typography</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 0.85rem)</label><input type="text" id="ao-group-header-size-${zone}" class="modern-input" value="${zoneSettings.groupHeaderFontSize || '0.85rem'}" oninput="applyActiveOrdersPreview();"></div>
                        ${renderFontSelectWithZone(`ao-group-header-${zone}`, zoneSettings.uiFont?.groupHeaderFamily, zoneSettings.uiFont?.groupHeaderStyle)}
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveActiveOrdersDisplayForZone('${zone}')">Save & Apply Preferences for ${zoneDisplayNames[zone]}</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetActiveOrdersDisplayZone('${zone}')">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Reservation Settings') {
        const rs = appSettings.reservation || { defaultDuration: 90, beforeMargin: 30, afterMargin: 30, allowOverbooking: false };
        h += `
            <div class="modern-form-grid" style="max-width:400px;">
                <div class="modern-input-group full-width">
                    <label>Default Duration (minutes)</label>
                    <input type="number" id="res-default-duration" class="modern-input" value="${rs.defaultDuration}" min="1">
                </div>
                <div class="modern-input-group full-width">
                    <label>Before Margin (minutes)</label>
                    <input type="number" id="res-before-margin" class="modern-input" value="${rs.beforeMargin}" min="0">
                    <small>How many minutes before start time the table is blocked.</small>
                </div>
                <div class="modern-input-group full-width">
                    <label>After Margin (minutes)</label>
                    <input type="number" id="res-after-margin" class="modern-input" value="${rs.afterMargin}" min="0">
                    <small>How many minutes after end time the table remains blocked.</small>
                </div>
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="res-allow-overbooking" class="apple-switch" ${rs.allowOverbooking ? 'checked' : ''}>
                    <label for="res-allow-overbooking" style="margin:0; font-size:0.9rem; cursor:pointer; text-transform:none;">Allow Overbooking (orders on reserved tables)</label>
                </div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveReservationSettings()">Save Settings</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetReservationSettings()">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Loyalty Settings') {
        const ls = appSettings.loyalty || { pointsPerCurrency: 10, redeemRate: 100, minRedeem: 500 };
        h += `
            <div class="modern-form-grid" style="max-width:400px;">
                <div class="modern-input-group full-width">
                    <label>Points per Currency (e.g., 10)</label>
                    <input type="number" id="loyalty-points-per-currency" class="modern-input" value="${ls.pointsPerCurrency}" min="1">
                </div>
                <div class="modern-input-group full-width">
                    <label>Redeem Rate (points per currency)</label>
                    <input type="number" id="loyalty-redeem-rate" class="modern-input" value="${ls.redeemRate}" min="1">
                </div>
                <div class="modern-input-group full-width">
                    <label>Minimum Points to Redeem</label>
                    <input type="number" id="loyalty-min-redeem" class="modern-input" value="${ls.minRedeem}" min="0">
                </div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveLoyaltySettings()">Save Settings</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetLoyaltySettings()">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Receipt Designer') {
        const template = appSettings.receiptTemplate || {
            header: "{{logo}}\n{{restaurant_name}}\n{{address}}\n{{phone}}",
            items: "{{item_name}} x{{qty}}   {{item_total}}\n",
            footer: "{{subtotal}}\n{{discount}}\nTOTAL: {{total}}\n{{thanks}}"
        };
        h += `
            <div style="margin-bottom:20px;">
                <label>Header Template</label>
                <textarea id="receipt-header" class="modern-input" rows="5">${template.header}</textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label>Item Line Template</label>
                <textarea id="receipt-items" class="modern-input" rows="3">${template.items}</textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label>Footer Template</label>
                <textarea id="receipt-footer" class="modern-input" rows="5">${template.footer}</textarea>
            </div>
            <div>
                <p>Available placeholders: {{logo}}, {{restaurant_name}}, {{address}}, {{phone}}, {{date}}, {{time}}, {{order_id}}, {{item_name}}, {{item_price}}, {{item_qty}}, {{item_total}}, {{subtotal}}, {{discount}}, {{tax}}, {{total}}, {{payments}}, {{thanks}}</p>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveReceiptTemplate()">Save Template</button>
            </div>
        `;
    } else if (activeConfigTab === 'Workers Management') {
        h += `
            <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <h4 style="margin-bottom:10px;">Current Staff</h4>
                    <table class="data-table"> <thead> <tr><th>Name</th><th>Role</th><th>Login</th><th>Actions</th></tr> </thead> <tbody>`;
        appWorkers.forEach((w, i) => {
            h += `<tr><td>${w.name}</td><td>${w.role}</td><td>${w.login}</td><td>
                    <button class="icon-btn-sm" style="color:var(--col-primary); margin-right: 5px;" onclick="editWorker(${i})"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn-sm" style="color:var(--col-danger);" onclick="deleteWorker(${i})"><i class="fas fa-trash"></i></button>
                </td></tr>`;
        });
        h += `</tbody></table></div>
                <div id="workers-management-form" style="flex:1; min-width:300px; background:var(--bg-app); padding:15px; border-radius:15px; box-shadow:var(--neumorph-in);">
                    <h4 id="worker-form-title" style="margin-bottom:15px;">Add New Worker</h4>
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
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-er" ${role.perms.editRoles ? 'checked' : ''}> Edit Roles/Admin</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-co" ${role.perms.createOrder ? 'checked' : ''}> Create Orders</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-tt" ${role.perms.transferTable ? 'checked' : ''}> Transfer Tables</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-tw" ${role.perms.transferWaiter ? 'checked' : ''}> Transfer Waiter</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-so" ${role.perms.splitOrder ? 'checked' : ''}> Split Orders</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-ad" ${role.perms.applyDiscount ? 'checked' : ''}> Apply Discounts</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-at" ${role.perms.applyTax ? 'checked' : ''}> Apply Taxes</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-rf" ${role.perms.refund ? 'checked' : ''}> Refund</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-dao" ${role.perms.deleteActiveOrder ? 'checked' : ''}> Del Active Order</label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-wh" ${role.perms.wipeHistory ? 'checked' : ''}> Wipe History</label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-mc" ${role.perms.manageClients ? 'checked' : ''}> Manage Clients</label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-ma" ${role.perms.manageAccounts ? 'checked' : ''}> Manage Accounts</label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-mv" ${role.perms.manageVouchers ? 'checked' : ''}> Manage Vouchers</label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-vd" ${role.perms.viewDashboard ? 'checked' : ''}> View Dashboard</label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-vr" ${role.perms.viewReports ? 'checked' : ''}> View Reports</label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-vh" ${role.perms.viewHistory ? 'checked' : ''}> View History</label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:600;"><input type="checkbox" class="apple-switch" id="role-${i}-ro" ${role.perms.reprintOrder ? 'checked' : ''}> Reprint Orders</label>
                        <label style="display:flex; align-items:center; gap:8px; font-weight:600; grid-column:span 2;"><input type="checkbox" class="apple-switch" id="role-${i}-mp" ${role.perms.modifyPrinted ? 'checked' : ''}> Modify Printed Items (High Sec)</label>
                    </div>
                    <button class="btn-modern" style="width:100%; margin-top:15px; font-size:0.85rem; padding:10px; background:var(--col-primary); color:white;" onclick="saveRolePerms(${i})">Save Perms</button>
                </div>
            `;
        });
        h += `</div>`;
    } else if (activeConfigTab === 'Bill Configuration') {
        const bc = appSettings.billConfig;
        const bs = bc.printStyles;
        h += `
            <div id="bill-configuration-form" style="display:flex; flex-direction:column; gap:15px; max-width:600px;">
                <h4 style="color:var(--col-primary); margin-bottom:10px;">Advanced Receipt Content Checklist (Customer Bill)</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; background:var(--bg-app); padding:20px; border-radius:15px; box-shadow:var(--neumorph-in-sm); margin-bottom:15px;">
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-logo" ${bc.printLogo ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Logo</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-prop" ${bc.printPropInfo ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Property Info</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-inv" ${bc.printInvoiceNo ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Invoice #</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-st" ${bc.printStartTime ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Order Start Time</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-pt" ${bc.printPrintTime ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Printing Time</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-waiter" ${bc.printWaiter ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Waiter Name</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-cashier" ${bc.printCashier ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Cashier Name</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-cust" ${bc.printCustomer ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Customer Info</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-break" ${bc.printBreakdown ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Sub/Tax/Disc</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="bc-pay" ${bc.printPayments ? 'checked' : ''} onchange="updatePrintPreview('bill')"> Print Payment Breakdown</label>
                </div>

                <div class="modern-input-group">
                    <label>Item Name Language</label>
                    <select id="bc-item-lang" class="modern-input" onchange="updatePrintPreview('bill')">
                        <option value="both" ${bc.printNameLang === 'both' ? 'selected' : ''}>Both (English + Urdu)</option>
                        <option value="en" ${bc.printNameLang === 'en' ? 'selected' : ''}>English Only</option>
                        <option value="ur" ${bc.printNameLang === 'ur' ? 'selected' : ''}>Urdu Only</option>
                    </select>
                </div>

                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Granular Print Styles (Customer Bill)</h4>

                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Header Text (Name, Address, Phone)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 16px)</label><input type="text" id="bc-header-size" class="modern-input" value="${bs.headerFontSize || '16px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-header', bs.headerFontFamily, bs.headerFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Item Name</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 12px)</label><input type="text" id="bc-item-name-size" class="modern-input" value="${bs.itemNameFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-item-name', bs.itemNameFontFamily, bs.itemNameFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Item Price / Total</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 12px)</label><input type="text" id="bc-item-price-size" class="modern-input" value="${bs.itemPriceFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-item-price', bs.itemPriceFontFamily, bs.itemPriceFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Total Box (Final Amount)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 16px)</label><input type="text" id="bc-total-box-size" class="modern-input" value="${bs.totalBoxFontSize || '16px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-total-box', bs.totalBoxFontFamily, bs.totalBoxFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Footer Note</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 12px)</label><input type="text" id="bc-footer-size" class="modern-input" value="${bs.footerFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-footer', bs.footerFontFamily, bs.footerFontStyle)}
                    </div>
                </div>

                <!-- NEW granular controls for bill -->
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">📅 Date (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="bc-date-head-size" class="modern-input" value="${bs.dateHeadingFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-date-head', bs.dateHeadingFontFamily, bs.dateHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="bc-date-value-size" class="modern-input" value="${bs.dateValueFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-date-value', bs.dateValueFontFamily, bs.dateValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">⏰ Time (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="bc-time-head-size" class="modern-input" value="${bs.timeHeadingFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-time-head', bs.timeHeadingFontFamily, bs.timeHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="bc-time-value-size" class="modern-input" value="${bs.timeValueFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-time-value', bs.timeValueFontFamily, bs.timeValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🔢 Order # (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="bc-order-head-size" class="modern-input" value="${bs.orderHeadingFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-order-head', bs.orderHeadingFontFamily, bs.orderHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="bc-order-value-size" class="modern-input" value="${bs.orderValueFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-order-value', bs.orderValueFontFamily, bs.orderValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🪑 Table (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="bc-table-head-size" class="modern-input" value="${bs.tableHeadingFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-table-head', bs.tableHeadingFontFamily, bs.tableHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="bc-table-value-size" class="modern-input" value="${bs.tableValueFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-table-value', bs.tableValueFontFamily, bs.tableValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🧑‍💼 Cashier (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="bc-cashier-head-size" class="modern-input" value="${bs.cashierHeadingFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-cashier-head', bs.cashierHeadingFontFamily, bs.cashierHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="bc-cashier-value-size" class="modern-input" value="${bs.cashierValueFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-cashier-value', bs.cashierValueFontFamily, bs.cashierValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">👤 Server (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="bc-server-head-size" class="modern-input" value="${bs.serverHeadingFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-server-head', bs.serverHeadingFontFamily, bs.serverHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="bc-server-value-size" class="modern-input" value="${bs.serverValueFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-server-value', bs.serverValueFontFamily, bs.serverValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🔢 Quantity Number</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="bc-qty-size" class="modern-input" value="${bs.qtyNumberFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-qty', bs.qtyNumberFontFamily, bs.qtyNumberFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">💰 Discount Amount</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="bc-discount-size" class="modern-input" value="${bs.discountFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-discount', bs.discountFontFamily, bs.discountFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🧾 Tax Amount</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="bc-tax-size" class="modern-input" value="${bs.taxFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-tax', bs.taxFontFamily, bs.taxFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">📊 Subtotal Amount</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="bc-subtotal-size" class="modern-input" value="${bs.subtotalFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-subtotal', bs.subtotalFontFamily, bs.subtotalFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🙏 Thanks / Credit Note</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="bc-thanks-size" class="modern-input" value="${bs.thanksFontSize || '12px'}" oninput="updatePrintPreview('bill')"></div>
                        ${renderFontSelect('bc-thanks', bs.thanksFontFamily, bs.thanksFontStyle)}
                    </div>
                </div>

                <div class="modern-input-group full-width">
                    <label>Custom Receipt Footer Note (HTML Allowed)</label>
                    <textarea id="bill-footer" class="modern-input" rows="3" style="font-family:monospace; font-size:0.8rem;" oninput="updatePrintPreview('bill')">${bc.customFooter}</textarea>
                </div>
            </div>
            <h4 style="grid-column: span 2; margin-top:25px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Live Print Preview (Textual)</h4>
            <div id="bill-preview-area" style="background: var(--bg-app); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 15px; margin-top: 15px; font-family: monospace; font-size: 12px; white-space: pre-wrap; min-height: 200px; color: black; overflow-y: auto;">
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveBillConfig()">Save Customer Bill Layout</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetSettings('billConfig')">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'KOT Print Settings') {
        const kotC = appSettings.kotConfig;
        const ks = kotC.printStyles;
        h += `
            <div id="kot-print-settings-form" style="display:flex; flex-direction:column; gap:15px; max-width:600px;">
                <h4 style="color:var(--col-primary); margin-bottom:10px;">Advanced KOT Content Checklist (Kitchen Order Ticket)</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; background:var(--bg-app); padding:20px; border-radius:15px; box-shadow:var(--neumorph-in-sm); margin-bottom:15px;">
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-logo" ${kotC.printLogo ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Logo</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-prop" ${kotC.printPropInfo ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Property Info</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-inv" ${kotC.printInvoiceNo ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Order #</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-st" ${kotC.printStartTime ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Order Start Time</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-pt" ${kotC.printPrintTime ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Printing Time</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-waiter" ${kotC.printWaiter ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Waiter Name</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-cashier" ${kotC.printCashier ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Cashier Name</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-cust" ${kotC.printCustomer ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Customer Info</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-break" ${kotC.printBreakdown ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Sub/Tax/Disc</label>
                    <label style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:0.85rem;"><input type="checkbox" class="apple-switch" id="kot-pay" ${kotC.printPayments ? 'checked' : ''} onchange="updatePrintPreview('kot')"> Print Payment Breakdown</label>
                </div>

                <div class="modern-input-group">
                    <label>Item Name Language</label>
                    <select id="kot-item-lang" class="modern-input" onchange="updatePrintPreview('kot')">
                        <option value="both" ${kotC.printNameLang === 'both' ? 'selected' : ''}>Both (English + Urdu)</option>
                        <option value="en" ${kotC.printNameLang === 'en' ? 'selected' : ''}>English Only</option>
                        <option value="ur" ${kotC.printNameLang === 'ur' ? 'selected' : ''}>Urdu Only</option>
                    </select>
                </div>

                <h4 style="grid-column: span 2; margin-top:15px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Granular Print Styles (KOT)</h4>

                <!-- KOT granular fields (same as bill but with kot- prefix) -->
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Header Text (Name, Address, Phone)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 16px)</label><input type="text" id="kot-header-size" class="modern-input" value="${ks.headerFontSize || '16px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-header', ks.headerFontFamily, ks.headerFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Item Name</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 12px)</label><input type="text" id="kot-item-name-size" class="modern-input" value="${ks.itemNameFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-item-name', ks.itemNameFontFamily, ks.itemNameFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Item Price / Total</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 12px)</label><input type="text" id="kot-item-price-size" class="modern-input" value="${ks.itemPriceFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-item-price', ks.itemPriceFontFamily, ks.itemPriceFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Total Box (Final Amount)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 16px)</label><input type="text" id="kot-total-box-size" class="modern-input" value="${ks.totalBoxFontSize || '16px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-total-box', ks.totalBoxFontFamily, ks.totalBoxFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">Footer Note</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size (e.g. 12px)</label><input type="text" id="kot-footer-size" class="modern-input" value="${ks.footerFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-footer', ks.footerFontFamily, ks.footerFontStyle)}
                    </div>
                </div>

                <!-- KOT granular fields (same as bill) -->
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">📅 Date (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="kot-date-head-size" class="modern-input" value="${ks.dateHeadingFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-date-head', ks.dateHeadingFontFamily, ks.dateHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="kot-date-value-size" class="modern-input" value="${ks.dateValueFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-date-value', ks.dateValueFontFamily, ks.dateValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">⏰ Time (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="kot-time-head-size" class="modern-input" value="${ks.timeHeadingFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-time-head', ks.timeHeadingFontFamily, ks.timeHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="kot-time-value-size" class="modern-input" value="${ks.timeValueFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-time-value', ks.timeValueFontFamily, ks.timeValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🔢 Order # (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="kot-order-head-size" class="modern-input" value="${ks.orderHeadingFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-order-head', ks.orderHeadingFontFamily, ks.orderHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="kot-order-value-size" class="modern-input" value="${ks.orderValueFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-order-value', ks.orderValueFontFamily, ks.orderValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🪑 Table (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="kot-table-head-size" class="modern-input" value="${ks.tableHeadingFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-table-head', ks.tableHeadingFontFamily, ks.tableHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="kot-table-value-size" class="modern-input" value="${ks.tableValueFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-table-value', ks.tableValueFontFamily, ks.tableValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🧑‍💼 Cashier (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="kot-cashier-head-size" class="modern-input" value="${ks.cashierHeadingFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-cashier-head', ks.cashierHeadingFontFamily, ks.cashierHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="kot-cashier-value-size" class="modern-input" value="${ks.cashierValueFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-cashier-value', ks.cashierValueFontFamily, ks.cashierValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">👤 Server (Heading & Value)</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Heading Size</label><input type="text" id="kot-server-head-size" class="modern-input" value="${ks.serverHeadingFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-server-head', ks.serverHeadingFontFamily, ks.serverHeadingFontStyle)}
                        <div class="modern-input-group"><label>Value Size</label><input type="text" id="kot-server-value-size" class="modern-input" value="${ks.serverValueFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-server-value', ks.serverValueFontFamily, ks.serverValueFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🔢 Quantity Number</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="kot-qty-size" class="modern-input" value="${ks.qtyNumberFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-qty', ks.qtyNumberFontFamily, ks.qtyNumberFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">💰 Discount Amount</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="kot-discount-size" class="modern-input" value="${ks.discountFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-discount', ks.discountFontFamily, ks.discountFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🧾 Tax Amount</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="kot-tax-size" class="modern-input" value="${ks.taxFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-tax', ks.taxFontFamily, ks.taxFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">📊 Subtotal Amount</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="kot-subtotal-size" class="modern-input" value="${ks.subtotalFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-subtotal', ks.subtotalFontFamily, ks.subtotalFontStyle)}
                    </div>
                </div>
                <div class="full-width-group" style="margin-bottom:15px; border:1px solid rgba(0,0,0,0.05); border-radius:12px; padding:15px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">🙏 Thanks / Credit Note</label>
                    <div class="modern-form-grid">
                        <div class="modern-input-group"><label>Size</label><input type="text" id="kot-thanks-size" class="modern-input" value="${ks.thanksFontSize || '12px'}" oninput="updatePrintPreview('kot')"></div>
                        ${renderFontSelect('kot-thanks', ks.thanksFontFamily, ks.thanksFontStyle)}
                    </div>
                </div>

                <div class="modern-input-group full-width">
                    <label>Custom KOT Footer Note (HTML Allowed)</label>
                    <textarea id="kot-footer" class="modern-input" rows="3" style="font-family:monospace; font-size:0.8rem;" oninput="updatePrintPreview('kot')">${kotC.customFooter}</textarea>
                </div>
            </div>
            <h4 style="grid-column: span 2; margin-top:25px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-primary);">Live Print Preview (Textual)</h4>
            <div id="kot-preview-area" style="background: var(--bg-app); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 15px; margin-top: 15px; font-family: monospace; font-size: 12px; white-space: pre-wrap; min-height: 200px; color: black; overflow-y: auto;">
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="saveKotConfig()">Save KOT Layout</button>
                <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none;" onclick="resetSettings('kotConfig')">Reset to Default</button>
            </div>
        `;
    } else if (activeConfigTab === 'Payment Methods') {
        h += `
            <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">
                <div style="flex:1; min-width:300px;">
                    <h4 style="margin-bottom:10px;">Active Methods</h4>
                    <table class="data-table"><thead><tr><th>Method Name</th><th>Action</th></tr></thead><tbody>`;
        if (appSettings.paymentMethods && Array.isArray(appSettings.paymentMethods)) {
            appSettings.paymentMethods.forEach((m, i) => {
                h += `<tr><td>${m}</td><td><button class="icon-btn-sm" style="color:var(--col-danger);" onclick="deletePayMethod(${i})"><i class="fas fa-trash"></i></button></td></tr>`;
            });
        } else {
            h += `<tr><td colspan="2" style="text-align:center;">No payment methods configured.</td></tr>`;
        }
        h += `</tbody></table></div>
                <div style="flex:1; min-width:300px; background:var(--bg-app); padding:15px; border-radius:15px; box-shadow:var(--neumorph-in);">
                    <h4 style="margin-bottom:15px;">Add Method</h4>
                    <div class="modern-input-group" style="margin-bottom:10px;"><input type="text" id="pm-name" class="modern-input" placeholder="e.g. Foodpanda"></div>
                    <button class="btn-modern btn-modern-save" style="width:100%;" onclick="savePayMethod()">Add</button>
                </div>
            </div>
        `;
    } else if (activeConfigTab === 'Shortcuts') {
        h += `<p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:20px;">Customize global keyboard shortcuts. Admin permission required for changes.</p>`;
        h += `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(350px, 1fr)); gap:15px;">`;
        appSettings.shortcuts.forEach((shortcut, i) => {
            h += `
                <div style="background:var(--bg-app); padding:15px; border-radius:15px; box-shadow:var(--neumorph-out-sm);">
                    <h4 style="color:var(--col-primary); margin-bottom:10px;">${shortcut.name}</h4>
                    <div class="modern-input-group">
                        <label>Current Key Combination</label>
                        <input type="text" id="shortcut-${i}-key" class="modern-input" value="${shortcut.currentKey}" readonly style="cursor:pointer;">
                        <small style="color:var(--text-secondary); margin-top:5px; display:block;">Default: ${shortcut.defaultKey}</small>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:15px;">
                        <button class="btn-modern" style="flex:1; background:var(--col-primary-light); color:var(--col-primary); font-size:0.85rem; padding:10px;" onclick="assignShortcutKey(${i})">Assign New Key</button>
                        <button class="btn-modern" style="flex:1; background:var(--col-secondary); color:white; font-size:0.85rem; padding:10px;" onclick="testShortcut(${i})">Test</button>
                        <button class="btn-modern" style="flex:1; background:var(--col-danger); color:white; font-size:0.85rem; padding:10px;" onclick="resetShortcutDefault(${i})">Reset</button>
                    </div>
                </div>
            `;
        });
        h += `</div>
            <button class="btn-modern btn-modern-save" style="margin-top:20px;" onclick="saveConfigShortcuts()">Save All Custom Shortcuts</button>
            <button class="btn-modern btn-modern-cancel" style="background:var(--col-danger); color:white; border:none; margin-left:10px;" onclick="resetSettings('shortcuts')">Reset All Shortcuts to Default</button>
        `;
    } else if (activeConfigTab === 'Inventory Settings') {
        const invSettings = appSettings.inventory || {
            lowStockThreshold: 5,
            varianceWarningPct: 3,
            varianceCriticalPct: 10,
            priceAnomalyPct: 10,
            autoReorder: false
        };
        h += `
            <div class="modern-form-grid" style="max-width:600px;">
                <div class="modern-input-group full-width">
                    <label>Low Stock Threshold (quantity)</label>
                    <input type="number" id="inv-low-threshold" class="modern-input" value="${invSettings.lowStockThreshold}" min="0" step="0.1">
                </div>
                <div class="modern-input-group full-width">
                    <label>Variance Warning Percentage (%)</label>
                    <input type="number" id="inv-var-warn" class="modern-input" value="${invSettings.varianceWarningPct}" step="0.1" min="0">
                </div>
                <div class="modern-input-group full-width">
                    <label>Variance Critical Percentage (%)</label>
                    <input type="number" id="inv-var-crit" class="modern-input" value="${invSettings.varianceCriticalPct}" step="0.1" min="0">
                </div>
                <div class="modern-input-group full-width">
                    <label>Price Anomaly Threshold (%)</label>
                    <input type="number" id="inv-price-anomaly" class="modern-input" value="${invSettings.priceAnomalyPct}" step="1" min="0">
                </div>
                <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                    <input type="checkbox" id="inv-auto-reorder" class="apple-switch" ${invSettings.autoReorder ? 'checked' : ''}>
                    <label for="inv-auto-reorder" style="margin:0; font-size:0.9rem; cursor:pointer;">Auto-create purchase orders for critical stock</label>
                </div>
                
                <div class="modern-input-group full-width" style="border-top: 1px solid var(--border-color); padding-top: 20px; margin-top: 10px;">
                    <h4 style="margin-bottom: 15px;">Data Management</h4>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn-modern" onclick="inv_exportInventoryData()"><i class="fas fa-download"></i> Export Inventory Data</button>
                        <button class="btn-modern" onclick="document.getElementById('inv-import-input').click()"><i class="fas fa-upload"></i> Import Inventory Data</button>
                        <input type="file" id="inv-import-input" accept=".json" style="display: none;" onchange="inv_importInventoryData(this)">
                    </div>
                </div>
                
                <div class="modern-input-group full-width" style="margin-top: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="inv-debug-mode" class="apple-switch" ${localStorage.getItem('inv_debug_mode') === 'true' ? 'checked' : ''} onchange="inv_toggleDebugMode()">
                        <label for="inv-debug-mode">Enable Debug Mode (Console logging)</label>
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn-modern btn-modern-save" style="flex:1;" onclick="inv_saveInventorySettings()">Save Settings</button>
                <button class="btn-modern" onclick="inv_resetInventorySettings()">Reset to Default</button>
            </div>
        `;
    }

    if (activeConfigTab === 'Property Settings' && hasPerm('editRoles')) {
        h += `
            <h4 style="margin-top:40px; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:5px; color:var(--col-danger);">DANGER ZONE</h4>
            <button class="btn-modern" style="width:100%; margin-top:15px; font-size:0.9rem; padding:15px; background:var(--col-danger); color:white;" onclick="resetSettings('all')">RESET ALL APP DATA (Admin Only)</button>
            <p style="font-size:0.75rem; color:var(--text-secondary); text-align:center; margin-top:10px;">This will clear all settings, orders, history, clients, menu, etc. and reload the application.</p>
        `;
    }

    body.innerHTML = h;
    autoModernizeUI();
    editingWorkerIndex = null;

    if (activeConfigTab === 'Bill Configuration') {
        updatePrintPreview('bill');
    } else if (activeConfigTab === 'KOT Print Settings') {
        updatePrintPreview('kot');
    }

    if (['Preferences (General UI)', 'Cart Settings', 'Menu Item Settings', 'Table Display Settings'].includes(activeConfigTab)) {
        document.querySelectorAll(`#conf-content-body select.modern-input, #conf-content-body input.modern-input[type='text'], #conf-content-body input.modern-input[type='number'], #conf-content-body input.apple-switch`).forEach(el => {
            if (!el.dataset.prefListenerAdded) {
                el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
                    if (typeof applyPreferences === 'function') applyPreferences();
                    if (typeof applyAdvancedCSSVariables === 'function') applyAdvancedCSSVariables();
                });
                el.dataset.prefListenerAdded = 'true';
            }
        });
    }
}

// ===== Helper functions for Table Display =====
function setActiveTableDisplayZone(zone) {
    window.activeTableDisplayZone = zone;
    renderConfigContent();
}

function renderFontSelectWithZone(idPrefix, currentFamily, currentStyle) {
    let familyOptions = fontFamilies.map(f => `<option value="${f.value}" ${currentFamily === f.value ? 'selected' : ''}>${f.text}</option>`).join('');
    let styleOptions = fontStyles.map(s => `<option value="${s.value}" ${currentStyle === s.value ? 'selected' : ''}>${s.text}</option>`).join('');
    return `
        <div class="modern-input-group">
            <label>Font Family</label>
            <select id="${idPrefix}-font-family" class="modern-input">${familyOptions}</select>
        </div>
        <div class="modern-input-group">
            <label>Font Style</label>
            <select id="${idPrefix}-font-style" class="modern-input">${styleOptions}</select>
        </div>
    `;
}

function saveConfigPreferencesTableForZone(zone) {
    const zoneSettings = appSettings.tableDisplay[zone] || {};
    zoneSettings.tableBtnAutoSize = document.getElementById(`pref-tbl-btn-auto-${zone}`).checked;
    zoneSettings.tableBtnWidth = document.getElementById(`pref-tbl-btn-width-${zone}`).value;
    zoneSettings.tableBtnHeight = document.getElementById(`pref-tbl-btn-height-${zone}`).value;
    zoneSettings.tableBtnMinItemWidth = document.getElementById(`pref-tbl-btn-min-width-${zone}`).value;
    zoneSettings.tableBtnGap = document.getElementById(`pref-tbl-btn-gap-${zone}`).value;
    zoneSettings.tableBtnColumnGap = document.getElementById(`pref-tbl-btn-column-gap-${zone}`).value;
    zoneSettings.tableGroupLineStyle = document.getElementById(`pref-tbl-group-line-style-${zone}`).value;
    zoneSettings.tableGroupLineThickness = document.getElementById(`pref-tbl-group-line-thickness-${zone}`).value;
    zoneSettings.tableGroupLineColor = document.getElementById(`pref-tbl-group-line-color-${zone}`).value;
    zoneSettings.tableButtonBorderRadius = document.getElementById(`pref-tbl-btn-border-radius-${zone}`).value;
    zoneSettings.tablePartitionGapTop = document.getElementById(`pref-tbl-partition-gap-top-${zone}`).value;
    zoneSettings.tablePartitionGapBottom = document.getElementById(`pref-tbl-partition-gap-bottom-${zone}`).value;
    zoneSettings.tableGroupHPadding = document.getElementById(`pref-tbl-group-h-padding-${zone}`).value;
    zoneSettings.tableFontSize = document.getElementById(`pref-table-${zone}`).value;
    zoneSettings.tableGroupHeaderFontSize = document.getElementById(`pref-tbl-head-font-size-${zone}`).value;
    zoneSettings.askForClient = document.getElementById(`pref-ask-client-${zone}`).checked;
    zoneSettings.askForWaiter = document.getElementById(`pref-ask-waiter-${zone}`).checked;

    if (!zoneSettings.uiFont) zoneSettings.uiFont = {};
    zoneSettings.uiFont.tableFamily = document.getElementById(`pref-table-${zone}-font-family`).value;
    zoneSettings.uiFont.tableStyle = document.getElementById(`pref-table-${zone}-font-style`).value;
    zoneSettings.uiFont.tableHeaderFamily = document.getElementById(`pref-tbl-head-${zone}-font-family`).value;
    zoneSettings.uiFont.tableHeaderStyle = document.getElementById(`pref-tbl-head-${zone}-font-style`).value;

    appSettings.tableDisplay[zone] = zoneSettings;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    if (typeof applyPreferences === 'function') applyPreferences();
    if (typeof applyAdvancedCSSVariables === 'function') applyAdvancedCSSVariables();
    showToast(`Table Display Settings for ${zone} saved`);
    if (typeof renderAllTables === 'function') renderAllTables();
}

function resetTableDisplayZone(zone) {
    const defaultSettings = {
        tableBtnAutoSize: false,
        tableBtnWidth: '100px',
        tableBtnHeight: '70px',
        tableBtnMinItemWidth: '80px',
        tableBtnGap: '15px',
        tableBtnColumnGap: '15px',
        tableGroupLineStyle: 'solid',
        tableGroupLineThickness: '1px',
        tableGroupLineColor: 'rgba(0,0,0,0.1)',
        tableGroupHGap: '15px',
        tableGroupVGap: '15px',
        tableButtonBorderRadius: '8px',
        tableGroupContentPadding: '15px',
        tableButtonPartitionLineSpacing: '15px',
        tableGroupHeaderFontSize: '0.85rem',
        tableFontSize: '0.85rem',
        askForClient: true,
        askForWaiter: true,
        uiFont: {
            tableFamily: 'Inter', tableStyle: 'normal',
            tableHeaderFamily: 'Inter', tableHeaderStyle: 'normal'
        }
    };
    appSettings.tableDisplay[zone] = JSON.parse(JSON.stringify(defaultSettings));
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast(`Table Display Settings for ${zone} reset to default`);
    renderConfigContent();
    if (typeof renderAllTables === 'function') renderAllTables();
}

function setActiveOrdersDisplayZone(zone) {
    window.activeOrdersDisplayZone = zone;
    renderConfigContent();
}

function saveActiveOrdersGlobalSetting() {
    if (!appSettings.activeOrdersDisplay) appSettings.activeOrdersDisplay = {};
    appSettings.activeOrdersDisplay.groupByZone = document.getElementById('ao-group-by-zone').checked;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Global setting saved');
    if (typeof renderActiveOrders === 'function') renderActiveOrders();
}

function saveActiveOrdersDisplayForZone(zone) {
    const zoneSettings = appSettings.activeOrdersDisplay[zone] || {};
    zoneSettings.tileAutoSize = document.getElementById(`ao-tile-auto-${zone}`).checked;
    zoneSettings.tileWidth = document.getElementById(`ao-tile-width-${zone}`).value;
    zoneSettings.tileHeight = document.getElementById(`ao-tile-height-${zone}`).value;
    zoneSettings.tileMinItemWidth = document.getElementById(`ao-tile-min-width-${zone}`).value;
    zoneSettings.tileGap = document.getElementById(`ao-tile-gap-${zone}`).value;
    zoneSettings.tileColumnGap = document.getElementById(`ao-tile-column-gap-${zone}`).value;
    zoneSettings.groupLineStyle = document.getElementById(`ao-group-line-style-${zone}`).value;
    zoneSettings.groupLineThickness = document.getElementById(`ao-group-line-thickness-${zone}`).value;
    zoneSettings.groupLineColor = document.getElementById(`ao-group-line-color-${zone}`).value;
    zoneSettings.tileBorderRadius = document.getElementById(`ao-tile-border-radius-${zone}`).value;
    zoneSettings.partitionGapTop = document.getElementById(`ao-partition-gap-top-${zone}`).value;
    zoneSettings.partitionGapBottom = document.getElementById(`ao-partition-gap-bottom-${zone}`).value;
    zoneSettings.groupHPadding = document.getElementById(`ao-group-h-padding-${zone}`).value;
    zoneSettings.tableNameFontSize = document.getElementById(`ao-table-name-size-${zone}`).value;
    zoneSettings.timerFontSize = document.getElementById(`ao-timer-size-${zone}`).value;
    zoneSettings.groupHeaderFontSize = document.getElementById(`ao-group-header-size-${zone}`).value;

    if (!zoneSettings.uiFont) zoneSettings.uiFont = {};
    zoneSettings.uiFont.tableNameFamily = document.getElementById(`ao-table-name-${zone}-font-family`).value;
    zoneSettings.uiFont.tableNameStyle = document.getElementById(`ao-table-name-${zone}-font-style`).value;
    zoneSettings.uiFont.timerFamily = document.getElementById(`ao-timer-${zone}-font-family`).value;
    zoneSettings.uiFont.timerStyle = document.getElementById(`ao-timer-${zone}-font-style`).value;
    zoneSettings.uiFont.groupHeaderFamily = document.getElementById(`ao-group-header-${zone}-font-family`).value;
    zoneSettings.uiFont.groupHeaderStyle = document.getElementById(`ao-group-header-${zone}-font-style`).value;

    appSettings.activeOrdersDisplay[zone] = zoneSettings;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast(`Active Orders Display settings for ${zone} saved`);
    if (typeof renderActiveOrders === 'function') renderActiveOrders();
}

function resetActiveOrdersDisplayZone(zone) {
    const defaultSettings = {
        tileAutoSize: false,
        tileWidth: '100px',
        tileHeight: '70px',
        tileMinItemWidth: '80px',
        tileGap: '15px',
        tileColumnGap: '15px',
        groupLineStyle: 'solid',
        groupLineThickness: '1px',
        groupLineColor: 'rgba(0,0,0,0.1)',
        tileBorderRadius: '8px',
        partitionGapTop: '15px',
        partitionGapBottom: '25px',
        groupHPadding: '15px',
        tableNameFontSize: '0.9rem',
        timerFontSize: '0.8rem',
        groupHeaderFontSize: '0.85rem',
        uiFont: {
            tableNameFamily: 'Inter', tableNameStyle: 'normal',
            timerFamily: 'Inter', timerStyle: 'normal',
            groupHeaderFamily: 'Inter', groupHeaderStyle: 'normal'
        }
    };
    appSettings.activeOrdersDisplay[zone] = JSON.parse(JSON.stringify(defaultSettings));
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast(`Active Orders Display settings for ${zone} reset to default`);
    renderConfigContent();
    if (typeof renderActiveOrders === 'function') renderActiveOrders();
}

function saveReservationSettings() {
    if (!appSettings.reservation) appSettings.reservation = {};
    appSettings.reservation.defaultDuration = parseInt(document.getElementById('res-default-duration').value) || 90;
    appSettings.reservation.beforeMargin = parseInt(document.getElementById('res-before-margin').value) || 30;
    appSettings.reservation.afterMargin = parseInt(document.getElementById('res-after-margin').value) || 30;
    appSettings.reservation.allowOverbooking = document.getElementById('res-allow-overbooking').checked;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Reservation settings saved');
}

function resetReservationSettings() {
    appSettings.reservation = { defaultDuration: 90, beforeMargin: 30, afterMargin: 30, allowOverbooking: false };
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Reservation settings reset to default');
}

function saveLoyaltySettings() {
    appSettings.loyalty = {
        pointsPerCurrency: parseInt(document.getElementById('loyalty-points-per-currency').value) || 10,
        redeemRate: parseInt(document.getElementById('loyalty-redeem-rate').value) || 100,
        minRedeem: parseInt(document.getElementById('loyalty-min-redeem').value) || 500
    };
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Loyalty settings saved');
}

function resetLoyaltySettings() {
    appSettings.loyalty = { pointsPerCurrency: 10, redeemRate: 100, minRedeem: 500 };
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Loyalty settings reset to default');
}

function saveReceiptTemplate() {
    appSettings.receiptTemplate = {
        header: document.getElementById('receipt-header').value,
        items: document.getElementById('receipt-items').value,
        footer: document.getElementById('receipt-footer').value
    };
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Receipt template saved');
}

function saveActiveOrdersConfig() {
    if (!appSettings.activeOrdersDisplay) appSettings.activeOrdersDisplay = {};
    appSettings.activeOrdersDisplay.groupByZone = document.getElementById('ao-group-by-zone')?.value === 'yes';
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Active Orders settings saved (global)');
    if (typeof renderActiveOrders === 'function') renderActiveOrders();
}

function resetActiveOrdersConfig() {
    appSettings.activeOrdersDisplay = { groupByZone: true };
    const defaultSettings = {
        tileAutoSize: false,
        tileWidth: '100px',
        tileHeight: '70px',
        tileMinItemWidth: '80px',
        tileGap: '15px',
        tileColumnGap: '15px',
        groupLineStyle: 'solid',
        groupLineThickness: '1px',
        groupLineColor: 'rgba(0,0,0,0.1)',
        tileBorderRadius: '8px',
        partitionGapTop: '15px',
        partitionGapBottom: '25px',
        groupHPadding: '15px',
        tableNameFontSize: '0.9rem',
        timerFontSize: '0.8rem',
        groupHeaderFontSize: '0.85rem',
        uiFont: {
            tableNameFamily: 'Inter', tableNameStyle: 'normal',
            timerFamily: 'Inter', timerStyle: 'normal',
            groupHeaderFamily: 'Inter', groupHeaderStyle: 'normal'
        }
    };
    appSettings.activeOrdersDisplay.dinein = { ...defaultSettings };
    appSettings.activeOrdersDisplay.takeaway = { ...defaultSettings };
    appSettings.activeOrdersDisplay.delivery = { ...defaultSettings };
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Active Orders settings reset to default');
    if (typeof renderActiveOrders === 'function') renderActiveOrders();
}

// ============================================================================
// INVENTORY SETTINGS HELPERS (must be globally accessible)
// ============================================================================
function inv_saveInventorySettings() {
    if (!appSettings.inventory) appSettings.inventory = {};
    appSettings.inventory.lowStockThreshold = parseFloat(document.getElementById('inv-low-threshold')?.value) || 5;
    appSettings.inventory.varianceWarningPct = parseFloat(document.getElementById('inv-var-warn')?.value) || 3;
    appSettings.inventory.varianceCriticalPct = parseFloat(document.getElementById('inv-var-crit')?.value) || 10;
    appSettings.inventory.priceAnomalyPct = parseFloat(document.getElementById('inv-price-anomaly')?.value) || 10;
    appSettings.inventory.autoReorder = document.getElementById('inv-auto-reorder')?.checked || false;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Inventory settings saved');
}

function inv_resetInventorySettings() {
    if (!appSettings.inventory) appSettings.inventory = {};
    appSettings.inventory.lowStockThreshold = 5;
    appSettings.inventory.varianceWarningPct = 3;
    appSettings.inventory.varianceCriticalPct = 10;
    appSettings.inventory.priceAnomalyPct = 10;
    appSettings.inventory.autoReorder = false;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Inventory settings reset to default');
    renderConfigContent(); // refresh the form
}

function inv_toggleDebugMode() {
    const isEnabled = localStorage.getItem('inv_debug_mode') === 'true';
    localStorage.setItem('inv_debug_mode', !isEnabled);
    showToast(`Inventory Debug Mode: ${!isEnabled ? 'ON' : 'OFF'}`);
    if (!isEnabled) {
        console.log('Inventory Debug Mode Enabled');
    }
}

// Expose needed functions globally
window.setActiveTableDisplayZone = setActiveTableDisplayZone;
window.setActiveOrdersDisplayZone = setActiveOrdersDisplayZone;
window.saveConfigPreferencesTableForZone = saveConfigPreferencesTableForZone;
window.resetTableDisplayZone = resetTableDisplayZone;
window.saveActiveOrdersGlobalSetting = saveActiveOrdersGlobalSetting;
window.saveActiveOrdersDisplayForZone = saveActiveOrdersDisplayForZone;
window.resetActiveOrdersDisplayZone = resetActiveOrdersDisplayZone;
window.saveReservationSettings = saveReservationSettings;
window.resetReservationSettings = resetReservationSettings;
window.saveLoyaltySettings = saveLoyaltySettings;
window.resetLoyaltySettings = resetLoyaltySettings;
window.saveReceiptTemplate = saveReceiptTemplate;
window.saveActiveOrdersConfig = saveActiveOrdersConfig;
window.resetActiveOrdersConfig = resetActiveOrdersConfig;
window.inv_saveInventorySettings = inv_saveInventorySettings;
window.inv_resetInventorySettings = inv_resetInventorySettings;
window.inv_toggleDebugMode = inv_toggleDebugMode;