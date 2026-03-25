// inventory_ui.js
// Complete UI for inventory management
// Version: 2.0 - Fully integrated with all features

// ============================================================================
// GLOBAL STATE
// ============================================================================
let inv_activeTab = 'dashboard';
let inv_currentCountSessionId = null;
let inv_editingIngredientId = null;

// ============================================================================
// MAIN RENDERING FUNCTIONS
// ============================================================================
function renderInventorySection() {
    const container = document.getElementById('inventory-content');
    if (!container) {
        console.error('Inventory container not found');
        return;
    }

    let html = `
        <div class="inventory-tabs" style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; padding-bottom: 8px;">
            <button class="inv-tab ${inv_activeTab === 'dashboard' ? 'active' : ''}" onclick="inv_switchTab('dashboard')">
                <i class="fas fa-chart-line"></i> Dashboard
            </button>
            <button class="inv-tab ${inv_activeTab === 'stock' ? 'active' : ''}" onclick="inv_switchTab('stock')">
                <i class="fas fa-boxes"></i> Stock Register
            </button>
            <button class="inv-tab ${inv_activeTab === 'recipes' ? 'active' : ''}" onclick="inv_switchTab('recipes')">
                <i class="fas fa-utensils"></i> Recipes (BOM)
            </button>
            <button class="inv-tab ${inv_activeTab === 'purchases' ? 'active' : ''}" onclick="inv_switchTab('purchases')">
                <i class="fas fa-shopping-cart"></i> Purchases
            </button>
            <button class="inv-tab ${inv_activeTab === 'wastage' ? 'active' : ''}" onclick="inv_switchTab('wastage')">
                <i class="fas fa-trash-alt"></i> Wastage
            </button>
            <button class="inv-tab ${inv_activeTab === 'suppliers' ? 'active' : ''}" onclick="inv_switchTab('suppliers')">
                <i class="fas fa-truck"></i> Suppliers
            </button>
            <button class="inv-tab ${inv_activeTab === 'count' ? 'active' : ''}" onclick="inv_switchTab('count')">
                <i class="fas fa-clipboard-list"></i> Physical Count
            </button>
            <button class="inv-tab ${inv_activeTab === 'variance' ? 'active' : ''}" onclick="inv_switchTab('variance')">
                <i class="fas fa-chart-bar"></i> Variance Reports
            </button>
            <button class="inv-tab ${inv_activeTab === 'reorder' ? 'active' : ''}" onclick="inv_switchTab('reorder')">
                <i class="fas fa-shopping-basket"></i> Reorder Suggestions
            </button>
            <button class="inv-tab ${inv_activeTab === 'audit' ? 'active' : ''}" onclick="inv_switchTab('audit')">
                <i class="fas fa-history"></i> Audit Log
            </button>
            <button class="inv-tab ${inv_activeTab === 'settings' ? 'active' : ''}" onclick="inv_switchTab('settings')">
                <i class="fas fa-cog"></i> Settings
            </button>
        </div>
        <div id="inv-tab-content" style="min-height: 500px;"></div>
    `;
    
    container.innerHTML = html;
    inv_renderActiveTab();
}

function inv_switchTab(tab) {
    inv_activeTab = tab;
    renderInventorySection();
}

function inv_renderActiveTab() {
    const content = document.getElementById('inv-tab-content');
    if (!content) return;

    switch (inv_activeTab) {
        case 'dashboard':
            inv_renderInventoryDashboard(content);
            break;
        case 'stock':
            inv_renderStockRegister(content);
            break;
        case 'recipes':
            inv_renderRecipeManager(content);
            break;
        case 'purchases':
            inv_renderPurchases(content);
            break;
        case 'wastage':
            inv_renderWastage(content);
            break;
        case 'suppliers':
            inv_renderSuppliers(content);
            break;
        case 'count':
            inv_renderPhysicalCount(content);
            break;
        case 'variance':
            inv_renderVarianceReports(content);
            break;
        case 'reorder':
            inv_renderReorderSuggestions(content);
            break;
        case 'audit':
            inv_renderAuditLog(content);
            break;
        case 'settings':
            inv_renderInventorySettings(content);
            break;
        default:
            content.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Coming soon...</div>';
    }
}

// ============================================================================
// DASHBOARD
// ============================================================================
function inv_renderInventoryDashboard(container) {
    const totalValue = inv_getTotalStockValue();
    const lowItems = inv_getLowStockItems();
    const criticalItems = inv_getCriticalStockItems();
    const suggestions = inv_getReorderSuggestions().slice(0, 5);
    const recentVariance = inv_getVarianceReports().slice(0, 3);
    const pendingPurchases = inv_getPurchases().filter(p => p.status === 'pending').length;
    const pendingWastage = inv_getWastage().filter(w => w.status === 'pending').length;

    let html = `
        <style>
            .inv-dashboard-card {
                background: var(--bg-app);
                border-radius: 16px;
                padding: 20px;
                box-shadow: var(--neumorph-out-sm);
                transition: transform 0.2s;
            }
            .inv-dashboard-card:hover {
                transform: translateY(-2px);
            }
            .inv-stat-value {
                font-size: 28px;
                font-weight: 800;
                color: var(--col-primary);
            }
            .inv-stat-label {
                font-size: 12px;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .inv-alert-critical {
                background: rgba(229, 62, 62, 0.1);
                border-left: 4px solid var(--col-danger);
            }
            .inv-alert-warning {
                background: rgba(243, 156, 18, 0.1);
                border-left: 4px solid #e67e22;
            }
        </style>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
            <div class="inv-dashboard-card">
                <div class="inv-stat-label">Total Stock Value</div>
                <div class="inv-stat-value">${appSettings.property.currency} ${totalValue.toFixed(0)}</div>
            </div>
            <div class="inv-dashboard-card">
                <div class="inv-stat-label">Low Stock Items</div>
                <div class="inv-stat-value" style="color: ${lowItems.length > 0 ? '#e67e22' : 'var(--col-success)'}">${lowItems.length}</div>
            </div>
            <div class="inv-dashboard-card">
                <div class="inv-stat-label">Critical (Zero)</div>
                <div class="inv-stat-value" style="color: ${criticalItems.length > 0 ? 'var(--col-danger)' : 'var(--col-success)'}">${criticalItems.length}</div>
            </div>
            <div class="inv-dashboard-card">
                <div class="inv-stat-label">Pending Approvals</div>
                <div class="inv-stat-value" style="color: #e67e22">${pendingPurchases + pendingWastage}</div>
                <div style="font-size: 11px;">${pendingPurchases} PO · ${pendingWastage} Waste</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <div>
                <h4 style="margin-bottom: 12px;">⚠️ Low Stock Alerts</h4>
                ${lowItems.length === 0 ? '<p class="inv-empty-row">No low stock items.</p>' : `
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${lowItems.map(i => `
                            <div class="inv-alert-warning" style="padding: 12px; margin-bottom: 8px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${i.name}</strong>
                                    <span style="color: #e67e22;">${i.currentQty} / ${i.minThreshold} ${i.unit}</span>
                                </div>
                                <button class="btn-modern" style="margin-top: 8px; padding: 4px 12px; font-size: 11px;" onclick="inv_switchTab('stock'); setTimeout(() => inv_adjustStockPrompt('${i.id}'), 100);">Restock</button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            <div>
                <h4 style="margin-bottom: 12px;">📋 Reorder Suggestions</h4>
                ${suggestions.length === 0 ? '<p class="inv-empty-row">No reorder suggestions at this time.</p>' : `
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${suggestions.map(s => `
                            <div class="inv-alert-${s.urgency === 'critical' ? 'critical' : 'warning'}" style="padding: 12px; margin-bottom: 8px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${s.ingredientName}</strong>
                                    <span>${s.suggestedQty} ${s.unit}</span>
                                </div>
                                <div style="font-size: 11px; color: var(--text-secondary);">Days left: ${s.daysRemaining}</div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn-modern" style="margin-top: 10px; width: 100%;" onclick="inv_switchTab('reorder')">View All →</button>
                `}
            </div>
        </div>
        
        <div style="margin-bottom: 25px;">
            <h4 style="margin-bottom: 12px;">📊 Recent Variance Reports</h4>
            ${recentVariance.length === 0 ? '<p class="inv-empty-row">No variance reports yet. Run a physical count to generate variance reports.</p>' : `
                <div style="overflow-x: auto;">
                    <table class="data-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Session ID</th>
                                <th>Items Counted</th>
                                <th>Critical Variances</th>
                                <th>Total Gap</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentVariance.map(v => {
                                const flagged = v.results ? v.results.filter(r => r.severity === 'CRITICAL').length : 0;
                                return `
                                    <tr>
                                        <td>${new Date(v.createdAt).toLocaleDateString()}</td>
                                        <td>${v.countSessionId}</td>
                                        <td>${v.results ? v.results.length : 0}</td>
                                        <td style="color: var(--col-danger);">${flagged}</td>
                                        <td>${appSettings.property.currency} ${(v.totalGap || 0).toFixed(0)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
        
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn-modern" style="background: var(--col-primary); color: white;" onclick="inv_startPhysicalCountSession()">
                <i class="fas fa-clipboard-list"></i> Start Physical Count
            </button>
            <button class="btn-modern" onclick="inv_switchTab('stock')">
                <i class="fas fa-boxes"></i> View Stock Register
            </button>
            <button class="btn-modern" onclick="inv_showAddIngredientForm()">
                <i class="fas fa-plus"></i> Add Ingredient
            </button>
            <button class="btn-modern" onclick="inv_exportStockToCSV()">
                <i class="fas fa-file-excel"></i> Export Stock Report
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================================================
// STOCK REGISTER
// ============================================================================
function inv_renderStockRegister(container) {
    const ingredients = inv_getEnrichedIngredients();
    const totalValue = inv_getTotalStockValue();
    const lowCount = inv_getLowStockItems().length;

    let html = `
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn-modern" onclick="inv_showAddIngredientForm()">
                    <i class="fas fa-plus"></i> Add Ingredient
                </button>
                <button class="btn-modern" onclick="inv_refreshStockRegister()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <button class="btn-modern" onclick="inv_exportStockToCSV()">
                    <i class="fas fa-file-excel"></i> Export CSV
                </button>
                <button class="btn-modern" onclick="inv_scanBarcodeForAdjustment()">
                    <i class="fas fa-qrcode"></i> Scan Barcode
                </button>
            </div>
            <div style="display: flex; gap: 15px;">
                <div><strong>Total Value:</strong> ${appSettings.property.currency} ${totalValue.toFixed(0)}</div>
                <div><strong>Low Stock Items:</strong> ${lowCount}</div>
            </div>
        </div>
        
        <div class="input-group" style="margin-bottom: 15px;">
            <input type="text" id="inv-stock-search" class="modern-input" placeholder="Search by name, category, or barcode..." oninput="inv_filterStockTable()">
        </div>
        
        <div style="overflow-x: auto;">
            <table class="data-table" id="inv-stock-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Unit</th>
                        <th>Current Qty</th>
                        <th>Min Threshold</th>
                        <th>Cost/Unit</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="inv-stock-tbody">
    `;

    if (ingredients.length === 0) {
        html += '<tr><td colspan="8" style="text-align: center;">No ingredients found. Add one to start.</td></tr>';
    } else {
        for (const ing of ingredients) {
            const statusClass = ing.status === 'low' ? 'inv-status-low' : (ing.status === 'critical' ? 'inv-status-critical' : 'inv-status-ok');
            const statusText = ing.status === 'low' ? '⚠️ Low' : (ing.status === 'critical' ? '🚨 Critical' : '✅ OK');
            const statusColor = ing.status === 'low' ? '#e67e22' : (ing.status === 'critical' ? 'var(--col-danger)' : 'var(--col-success)');
            
            html += `
                <tr data-ingredient-id="${ing.id}" data-name="${ing.name.toLowerCase()}" data-category="${(ing.category || '').toLowerCase()}">
                    <td><strong>${ing.name}</strong>${ing.barcode ? `<br><span style="font-size: 10px; color: var(--text-secondary);">${ing.barcode}</span>` : ''}</td>
                    <td>${ing.unit}</td>
                    <td id="stock-qty-${ing.id}" style="font-weight: bold; cursor: pointer;" onclick="inv_adjustStockPrompt('${ing.id}')">${ing.currentQty}</td>
                    <td>${ing.minThreshold}</td>
                    <td>${appSettings.property.currency} ${ing.costPerUnit.toFixed(2)}</td>
                    <td>${appSettings.property.currency} ${ing.value.toFixed(0)}</td>
                    <td><span class="badge ${statusClass}" style="background: ${statusColor}20; color: ${statusColor};">${statusText}</span></td>
                    <td>
                        <button class="icon-btn-sm" onclick="inv_editIngredient('${ing.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn-sm" onclick="inv_adjustStockPrompt('${ing.id}')" title="Adjust Stock"><i class="fas fa-exchange-alt"></i></button>
                        <button class="icon-btn-sm" onclick="inv_archiveIngredient('${ing.id}')" title="Archive"><i class="fas fa-archive"></i></button>
                        ${ing.barcode ? '' : `<button class="icon-btn-sm" onclick="inv_addBarcodeToIngredient('${ing.id}')" title="Add Barcode"><i class="fas fa-qrcode"></i></button>`}
                    </td>
                </tr>
            `;
        }
    }

    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

function inv_filterStockTable() {
    const searchTerm = document.getElementById('inv-stock-search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#inv-stock-tbody tr');
    
    rows.forEach(row => {
        const name = row.dataset.name || '';
        const category = row.dataset.category || '';
        const matches = name.includes(searchTerm) || category.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
    });
}

function inv_refreshStockRegister() {
    if (inv_activeTab === 'stock') {
        inv_renderStockRegister(document.getElementById('inv-tab-content'));
    }
}

// ============================================================================
// INGREDIENT FORM (ADD/EDIT)
// ============================================================================
function inv_showAddIngredientForm(editId = null) {
    const ing = editId ? inv_getIngredientById(editId) : null;
    const title = ing ? 'Edit Ingredient' : 'Add New Ingredient';
    
    const modalHtml = `
        <div id="inv-ingredient-modal" class="modal" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="max-width: 550px;">
                <h3>${title}</h3>
                <div class="input-group"><label>Name *</label><input type="text" id="inv-ing-name" class="modern-input" value="${ing ? ing.name : ''}"></div>
                <div class="input-group"><label>Urdu / Alt Name</label><input type="text" id="inv-ing-alt" class="modern-input" value="${ing ? ing.altName || '' : ''}"></div>
                <div class="input-group"><label>Unit *</label>
                    <select id="inv-ing-unit" class="modern-input">
                        <option value="kg" ${ing && ing.unit === 'kg' ? 'selected' : ''}>kg</option>
                        <option value="g" ${ing && ing.unit === 'g' ? 'selected' : ''}>g</option>
                        <option value="litre" ${ing && ing.unit === 'litre' ? 'selected' : ''}>litre</option>
                        <option value="ml" ${ing && ing.unit === 'ml' ? 'selected' : ''}>ml</option>
                        <option value="piece" ${ing && ing.unit === 'piece' ? 'selected' : ''}>piece</option>
                        <option value="crate" ${ing && ing.unit === 'crate' ? 'selected' : ''}>crate</option>
                        <option value="case" ${ing && ing.unit === 'case' ? 'selected' : ''}>case</option>
                        <option value="packet" ${ing && ing.unit === 'packet' ? 'selected' : ''}>packet</option>
                    </select>
                </div>
                <div class="input-group"><label>Category</label><input type="text" id="inv-ing-cat" class="modern-input" value="${ing ? ing.category || '' : ''}" placeholder="e.g., Meat, Vegetables"></div>
                <div class="input-group"><label>Min Threshold (below this = low stock)</label><input type="number" id="inv-ing-min" class="modern-input" value="${ing ? ing.minThreshold : 0}" step="0.001"></div>
                <div class="input-group"><label>Cost Per Unit (${appSettings.property.currency})</label><input type="number" id="inv-ing-cost" class="modern-input" value="${ing ? ing.costPerUnit : 0}" step="0.01"></div>
                <div class="input-group"><label>Barcode / SKU</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="inv-ing-barcode" class="modern-input" value="${ing ? ing.barcode || '' : ''}" placeholder="Optional">
                        <button class="icon-btn-sm" onclick="inv_scanBarcodeForIngredient()" title="Scan Barcode"><i class="fas fa-qrcode"></i></button>
                    </div>
                </div>
                ${!ing ? `<div class="input-group"><label>Opening Stock Qty</label><input type="number" id="inv-ing-opening" class="modern-input" value="0" step="0.001"></div>` : ''}
                <div class="input-group"><label>Notes</label><textarea id="inv-ing-notes" class="modern-input" rows="2">${ing ? ing.notes || '' : ''}</textarea></div>
                <div class="modal-buttons">
                    <button onclick="inv_closeIngredientModal()">Cancel</button>
                    <button class="save" onclick="inv_saveIngredientFromModal('${editId || ''}')">Save</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('inv-ingredient-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('inv-ingredient-modal');
    modal.classList.add('active');
}

function inv_closeIngredientModal() {
    const modal = document.getElementById('inv-ingredient-modal');
    if (modal) modal.remove();
}

function inv_saveIngredientFromModal(editId) {
    const name = document.getElementById('inv-ing-name').value.trim();
    if (!name) {
        showCustomAlert('Validation', 'Ingredient name is required.');
        return;
    }
    
    const unit = document.getElementById('inv-ing-unit').value;
    const altName = document.getElementById('inv-ing-alt').value;
    const category = document.getElementById('inv-ing-cat').value;
    const minThreshold = parseFloat(document.getElementById('inv-ing-min').value) || 0;
    const costPerUnit = parseFloat(document.getElementById('inv-ing-cost').value) || 0;
    const barcode = document.getElementById('inv-ing-barcode').value.trim();
    const notes = document.getElementById('inv-ing-notes').value;
    
    try {
        if (editId) {
            inv_updateIngredient(editId, { name, altName, unit, category, minThreshold, costPerUnit, barcode, notes });
            showToast('Ingredient updated successfully');
        } else {
            const openingStock = parseFloat(document.getElementById('inv-ing-opening').value) || 0;
            const newIngredient = inv_addIngredient({ name, altName, unit, category, minThreshold, costPerUnit, barcode, notes });
            if (openingStock > 0) {
                inv_adjustStockWithSafety(newIngredient.id, openingStock, 'MANUAL', 'Opening stock', inv_getCurrentUser());
            }
            showToast('Ingredient added successfully');
        }
        inv_closeIngredientModal();
        inv_refreshStockRegister();
    } catch (error) {
        showCustomAlert('Error', error.message);
    }
}

function inv_editIngredient(id) {
    inv_showAddIngredientForm(id);
}

function inv_archiveIngredient(id) {
    openConfirm('Archive Ingredient', 'Are you sure you want to archive this ingredient? It will no longer appear in stock lists.', () => {
        try {
            inv_archiveIngredient(id, 'Archived by user');
            showToast('Ingredient archived');
            inv_refreshStockRegister();
        } catch (error) {
            showCustomAlert('Error', error.message);
        }
    });
}

function inv_adjustStockPrompt(ingredientId) {
    const ing = inv_getIngredientById(ingredientId);
    if (!ing) return;
    
    openCustomPrompt(
        `Adjust stock for ${ing.name}`, 
        null, 
        null, 
        null, 
        'both', 
        (result) => {
            if (result.price === null && result.qty === null) return;
            
            const delta = parseFloat(result.qty) || 0;
            const reason = result.text || 'Manual adjustment';
            
            if (delta === 0) {
                showToast('No change');
                return;
            }
            
            const isNegative = delta < 0;
            
            const executeAdjustment = () => {
                try {
                    inv_adjustStockWithSafety(ingredientId, delta, 'MANUAL', reason, inv_getCurrentUser());
                    showToast(`Stock adjusted by ${delta} ${ing.unit}`);
                    inv_refreshStockRegister();
                } catch (error) {
                    showCustomAlert('Stock Adjustment Failed', error.message);
                }
            };
            
            if (isNegative) {
                verifyManagerPIN((approved) => {
                    if (approved) executeAdjustment();
                });
            } else {
                executeAdjustment();
            }
        }
    );
}

function inv_addBarcodeToIngredient(ingredientId) {
    inv_scanBarcodeForIngredient((barcode) => {
        if (barcode) {
            try {
                inv_updateIngredient(ingredientId, { barcode });
                showToast(`Barcode ${barcode} assigned`);
                inv_refreshStockRegister();
            } catch (error) {
                showCustomAlert('Error', error.message);
            }
        }
    });
}

function inv_scanBarcodeForIngredient(callback) {
    if (typeof initBarcodeScanner === 'function') {
        initBarcodeScanner((barcode) => {
            const input = document.getElementById('inv-ing-barcode');
            if (input) input.value = barcode;
            if (callback) callback(barcode);
        });
    } else {
        openCustomPrompt('Enter Barcode', null, null, null, 'text', (result) => {
            if (result.text && callback) callback(result.text);
            else if (result.text) {
                const input = document.getElementById('inv-ing-barcode');
                if (input) input.value = result.text;
            }
        });
    }
}

function inv_scanBarcodeForAdjustment() {
    if (typeof initBarcodeScanner === 'function') {
        initBarcodeScanner((barcode) => {
            const ingredient = inv_findIngredientByBarcode(barcode);
            if (ingredient) {
                inv_adjustStockPrompt(ingredient.id);
            } else {
                showCustomAlert('Not Found', `No ingredient found with barcode: ${barcode}`);
            }
        });
    } else {
        openCustomPrompt('Enter Barcode', null, null, null, 'text', (result) => {
            if (result.text) {
                const ingredient = inv_findIngredientByBarcode(result.text);
                if (ingredient) {
                    inv_adjustStockPrompt(ingredient.id);
                } else {
                    showCustomAlert('Not Found', `No ingredient found with barcode: ${result.text}`);
                }
            }
        });
    }
}

// ============================================================================
// RECIPE MANAGER
// ============================================================================
function inv_renderRecipeManager(container) {
    const activeMenuItems = window.menuItems ? window.menuItems.filter(m => m.status !== 'disabled') : [];
    
    let html = `
        <div style="margin-bottom: 20px;">
            <label>Select Menu Item:</label>
            <select id="inv-recipe-item-select" class="modern-input" style="margin-top: 8px;" onchange="inv_loadRecipeForMenuItem(this.value)">
                <option value="">-- Choose a menu item --</option>
                ${activeMenuItems.map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
            </select>
        </div>
        <div id="inv-recipe-editor" style="margin-top: 20px; display: none;">
            <h4>Recipe for <span id="inv-recipe-item-name"></span></h4>
            <div id="inv-recipe-ingredients-list" style="margin-bottom: 15px;"></div>
            <button class="btn-modern" onclick="inv_addRecipeIngredientRow()">+ Add Ingredient</button>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="btn-modern btn-modern-save" onclick="inv_saveCurrentRecipe()">Save Recipe</button>
                <button class="btn-modern" onclick="inv_deleteCurrentRecipe()" style="background: var(--col-danger); color: white;">Delete Recipe</button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function inv_loadRecipeForMenuItem(menuItemId) {
    const editor = document.getElementById('inv-recipe-editor');
    const itemNameSpan = document.getElementById('inv-recipe-item-name');
    const ingredientsList = document.getElementById('inv-recipe-ingredients-list');
    
    if (!menuItemId) {
        editor.style.display = 'none';
        return;
    }
    
    const menuItem = window.menuItems ? window.menuItems.find(m => m.id === menuItemId) : null;
    if (!menuItem) return;
    
    itemNameSpan.textContent = menuItem.name;
    const recipe = inv_getRecipeForMenuItem(menuItemId);
    const ingredients = recipe ? recipe.ingredients : [];
    
    inv_renderRecipeIngredientsList(ingredients);
    editor.style.display = 'block';
    editor.dataset.currentMenuItemId = menuItemId;
}

function inv_renderRecipeIngredientsList(ingredients) {
    const container = document.getElementById('inv-recipe-ingredients-list');
    if (!container) return;
    
    const allIngredients = inv_getIngredients().filter(i => !i.archived);
    
    let html = `
        <table class="data-table" style="width: 100%;">
            <thead>
                <tr>
                    <th>Ingredient</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="inv-recipe-rows">
    `;
    
    if (ingredients.length === 0) {
        html += '<tr><td colspan="4" style="text-align: center;">No ingredients added yet.</td></tr>';
    } else {
        ingredients.forEach((ing, idx) => {
            const ingObj = allIngredients.find(i => i.id === ing.ingredientId);
            const ingName = ingObj ? ingObj.name : 'Unknown';
            html += `
                <tr data-ing-id="${ing.ingredientId}" data-idx="${idx}">
                    <td>
                        <select class="modern-input inv-recipe-ing-select" data-idx="${idx}" style="width: 100%;">
                            <option value="">-- Select --</option>
                            ${allIngredients.map(i => `<option value="${i.id}" ${i.id === ing.ingredientId ? 'selected' : ''}>${i.name}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" class="modern-input inv-recipe-qty" data-idx="${idx}" value="${ing.quantity}" step="0.001" style="width: 100px;"></td>
                    <td><input type="text" class="modern-input inv-recipe-unit" data-idx="${idx}" value="${ing.unit}" placeholder="unit" style="width: 100px;"></td>
                    <td><button class="icon-btn-sm" onclick="inv_removeRecipeIngredientRow(${idx})">🗑️</button></td>
                </tr>
            `;
        });
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function inv_addRecipeIngredientRow() {
    const tbody = document.getElementById('inv-recipe-rows');
    if (!tbody) return;
    
    const allIngredients = inv_getIngredients().filter(i => !i.archived);
    const idx = tbody.querySelectorAll('tr').length;
    
    const rowHtml = `
        <tr data-ing-id="" data-idx="${idx}">
            <td>
                <select class="modern-input inv-recipe-ing-select" data-idx="${idx}" style="width: 100%;">
                    <option value="">-- Select --</option>
                    ${allIngredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
                </select>
            </td>
            <td><input type="number" class="modern-input inv-recipe-qty" data-idx="${idx}" value="1" step="0.001" style="width: 100px;"></td>
            <td><input type="text" class="modern-input inv-recipe-unit" data-idx="${idx}" value="" placeholder="unit" style="width: 100px;"></td>
            <td><button class="icon-btn-sm" onclick="inv_removeRecipeIngredientRow(${idx})">🗑️</button></td>
        </tr>
    `;
    
    tbody.insertAdjacentHTML('beforeend', rowHtml);
}

function inv_removeRecipeIngredientRow(idx) {
    const tbody = document.getElementById('inv-recipe-rows');
    if (!tbody) return;
    
    const row = tbody.querySelector(`tr[data-idx="${idx}"]`);
    if (row) row.remove();
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, newIdx) => {
        row.setAttribute('data-idx', newIdx);
        const select = row.querySelector('.inv-recipe-ing-select');
        const qty = row.querySelector('.inv-recipe-qty');
        const unit = row.querySelector('.inv-recipe-unit');
        if (select) select.setAttribute('data-idx', newIdx);
        if (qty) qty.setAttribute('data-idx', newIdx);
        if (unit) unit.setAttribute('data-idx', newIdx);
    });
}

function inv_saveCurrentRecipe() {
    const editor = document.getElementById('inv-recipe-editor');
    const menuItemId = editor?.dataset.currentMenuItemId;
    if (!menuItemId) {
        showToast('No menu item selected');
        return;
    }
    
    const rows = document.querySelectorAll('#inv-recipe-rows tr');
    const ingredients = [];
    
    for (const row of rows) {
        const ingSelect = row.querySelector('.inv-recipe-ing-select');
        const ingId = ingSelect ? ingSelect.value : '';
        const qtyInput = row.querySelector('.inv-recipe-qty');
        const qty = qtyInput ? parseFloat(qtyInput.value) : 0;
        const unitInput = row.querySelector('.inv-recipe-unit');
        const unit = unitInput ? unitInput.value : '';
        
        if (ingId && qty > 0) {
            ingredients.push({ ingredientId: ingId, quantity: qty, unit });
        }
    }
    
    inv_saveRecipe(menuItemId, ingredients);
    showToast('Recipe saved');
    inv_loadRecipeForMenuItem(menuItemId);
}

function inv_deleteCurrentRecipe() {
    const editor = document.getElementById('inv-recipe-editor');
    const menuItemId = editor?.dataset.currentMenuItemId;
    if (!menuItemId) return;
    
    openConfirm('Delete Recipe', 'Are you sure you want to delete this recipe?', () => {
        inv_deleteRecipe(menuItemId);
        showToast('Recipe deleted');
        inv_loadRecipeForMenuItem(menuItemId);
    });
}

// ============================================================================
// PURCHASES
// ============================================================================
function inv_renderPurchases(container) {
    const purchases = inv_getPurchases();
    const pendingCount = purchases.filter(p => p.status === 'pending').length;
    
    let html = `
        <div style="margin-bottom: 20px;">
            <button class="btn-modern" onclick="inv_showCreatePurchaseForm()">
                <i class="fas fa-plus"></i> New Purchase Order
            </button>
            <span style="margin-left: 15px;">Pending approvals: <strong style="color: #e67e22;">${pendingCount}</strong></span>
        </div>
        <div class="input-group" style="margin-bottom: 15px;">
            <input type="text" id="inv-po-search" class="modern-input" placeholder="Search by supplier, ID, or status..." oninput="inv_filterPurchases()">
        </div>
        <div id="purchases-list">
    `;
    
    if (purchases.length === 0) {
        html += '<p class="inv-empty-row">No purchase orders yet.</p>';
    } else {
        html += `
            <div style="overflow-x: auto;">
                <table class="data-table" id="inv-po-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Supplier</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </thead>
                        <tbody id="inv-po-tbody">
        `;
        
        for (const po of purchases) {
            const statusClass = po.status === 'pending' ? 'badge-warning' : (po.status === 'approved' ? 'badge-success' : 'badge-danger');
            const statusText = po.status === 'pending' ? '⏳ Pending' : (po.status === 'approved' ? '✅ Approved' : '❌ Rejected');
            
            html += `
                <tr data-po-id="${po.id}" data-supplier="${po.supplierName.toLowerCase()}" data-status="${po.status}">
                    <td>${po.id}</td>
                    <td>${po.date}</td>
                    <td>${po.supplierName}</td>
                    <td>${appSettings.property.currency} ${po.totalAmount.toFixed(0)}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="icon-btn-sm" onclick="inv_viewPurchaseDetails('${po.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                        ${po.status === 'pending' ? `<button class="icon-btn-sm" onclick="inv_approvePurchase('${po.id}')" title="Approve"><i class="fas fa-check-circle" style="color: var(--col-success);"></i></button>` : ''}
                        ${po.status === 'pending' ? `<button class="icon-btn-sm" onclick="inv_rejectPurchase('${po.id}')" title="Reject"><i class="fas fa-times-circle" style="color: var(--col-danger);"></i></button>` : ''}
                    </td>
                </tr>
            `;
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function inv_filterPurchases() {
    const searchTerm = document.getElementById('inv-po-search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#inv-po-tbody tr');
    
    rows.forEach(row => {
        const supplier = row.dataset.supplier || '';
        const id = row.dataset.poId || '';
        const status = row.dataset.status || '';
        const matches = supplier.includes(searchTerm) || id.includes(searchTerm) || status.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
    });
}

function inv_showCreatePurchaseForm() {
    const suppliers = inv_getSuppliers().filter(s => !s.archived);
    if (suppliers.length === 0) {
        showCustomAlert('No Suppliers', 'Please add a supplier first.');
        inv_switchTab('suppliers');
        return;
    }
    
    const modalHtml = `
        <div id="inv-po-modal" class="modal" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <h3>New Purchase Order</h3>
                <div class="modern-form-grid" style="grid-template-columns: 1fr 1fr;">
                    <div class="input-group"><label>Supplier *</label><select id="po-supplier" class="modern-input">${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Date *</label><input type="date" id="po-date" class="modern-input" value="${new Date().toISOString().split('T')[0]}"></div>
                    <div class="input-group full-width"><label>Invoice #</label><input type="text" id="po-invoice" class="modern-input" placeholder="Optional"></div>
                    <div class="input-group full-width"><label>Notes</label><textarea id="po-notes" class="modern-input" rows="2" placeholder="Optional notes"></textarea></div>
                </div>
                <h4>Items</h4>
                <div id="po-items-list"></div>
                <button class="btn-modern" onclick="inv_addPurchaseItemRow()" style="margin-top: 10px;">+ Add Item</button>
                <div class="modal-buttons" style="margin-top: 20px;">
                    <button onclick="inv_closePurchaseModal()">Cancel</button>
                    <button class="save" onclick="inv_submitPurchaseOrder()">Submit for Approval</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('inv-po-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('inv-po-modal');
    modal.classList.add('active');
    inv_addPurchaseItemRow();
}

function inv_closePurchaseModal() {
    const modal = document.getElementById('inv-po-modal');
    if (modal) modal.remove();
}

function inv_addPurchaseItemRow() {
    const container = document.getElementById('po-items-list');
    if (!container) return;
    
    const ingredients = inv_getIngredients().filter(i => !i.archived);
    const idx = container.children.length;
    
    const rowHtml = `
        <div class="po-item-row" data-idx="${idx}" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center;">
            <select class="modern-input po-ingredient" data-idx="${idx}" style="width: 100%;">
                <option value="">-- Select Ingredient --</option>
                ${ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
            </select>
            <input type="number" class="modern-input po-qty" data-idx="${idx}" placeholder="Qty" step="0.001">
            <select class="modern-input po-unit" data-idx="${idx}">
                <option value="kg">kg</option><option value="g">g</option><option value="litre">litre</option>
                <option value="ml">ml</option><option value="piece">piece</option><option value="crate">crate</option>
                <option value="case">case</option><option value="packet">packet</option>
            </select>
            <input type="number" class="modern-input po-price" data-idx="${idx}" placeholder="Unit Price" step="0.01">
            <button class="icon-btn-sm" onclick="this.closest('.po-item-row').remove(); inv_calcPOTotal()">🗑️</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHtml);
}

function inv_calcPOTotal() {
    let total = 0;
    const rows = document.querySelectorAll('.po-item-row');
    
    for (const row of rows) {
        const qty = parseFloat(row.querySelector('.po-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.po-price')?.value) || 0;
        total += qty * price;
    }
    
    const totalEl = document.getElementById('po-total-display');
    if (totalEl) {
        totalEl.textContent = `${appSettings.property.currency} ${total.toFixed(0)}`;
    }
}

function inv_submitPurchaseOrder() {
    const supplierId = document.getElementById('po-supplier')?.value;
    const supplier = inv_getSupplierById(supplierId);
    if (!supplier) {
        showToast('Select a supplier');
        return;
    }
    
    const date = document.getElementById('po-date')?.value;
    const invoiceNo = document.getElementById('po-invoice')?.value || '';
    const notes = document.getElementById('po-notes')?.value || '';
    
    const rows = document.querySelectorAll('#po-items-list .po-item-row');
    const items = [];
    
    for (const row of rows) {
        const ingredientId = row.querySelector('.po-ingredient')?.value;
        const qty = parseFloat(row.querySelector('.po-qty')?.value);
        const unit = row.querySelector('.po-unit')?.value;
        const unitPrice = parseFloat(row.querySelector('.po-price')?.value);
        
        if (ingredientId && qty > 0 && unitPrice > 0) {
            const ing = inv_getIngredientById(ingredientId);
            items.push({
                ingredientId,
                ingredientName: ing ? ing.name : 'Unknown',
                qty,
                unit,
                unitPrice
            });
        }
    }
    
    if (items.length === 0) {
        showToast('Add at least one item');
        return;
    }
    
    inv_createPurchaseOrder({
        supplierId,
        supplierName: supplier.name,
        date,
        invoiceNo,
        notes,
        items
    });
    
    inv_closePurchaseModal();
    showToast('Purchase order created and pending approval');
    inv_renderPurchases(document.getElementById('inv-tab-content'));
}

function inv_viewPurchaseDetails(id) {
    const po = inv_getPurchases().find(p => p.id === id);
    if (!po) return;
    
    const itemsHtml = po.items.map(item => `
        <tr>
            <td>${item.ingredientName}</td>
            <td>${item.qty} ${item.unit}</td>
            <td>${appSettings.property.currency} ${item.unitPrice.toFixed(2)}</td>
            <td>${appSettings.property.currency} ${item.total.toFixed(0)}</td>
        </tr>
    `).join('');
    
    showCustomAlert(`Purchase Order ${po.id}`, `
        <strong>Supplier:</strong> ${po.supplierName}<br>
        <strong>Date:</strong> ${po.date}<br>
        <strong>Status:</strong> ${po.status}<br>
        <strong>Total:</strong> ${appSettings.property.currency} ${po.totalAmount.toFixed(0)}<br>
        <hr>
        <table style="width:100%; border-collapse: collapse;">
            <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        ${po.notes ? `<br><strong>Notes:</strong> ${po.notes}` : ''}
    `, 'large');
}

function inv_approvePurchase(id) {
    verifyManagerPIN((approved) => {
        if (approved) {
            try {
                inv_approvePurchaseOrder(id, null, inv_getCurrentUser());
                showToast('Purchase order approved, stock updated');
                inv_renderPurchases(document.getElementById('inv-tab-content'));
                inv_refreshStockRegister();
            } catch (e) {
                showToast(e.message, 'error');
            }
        }
    });
}

function inv_rejectPurchase(id) {
    openCustomPrompt('Rejection Reason', null, null, null, 'text', (result) => {
        if (result.text) {
            inv_rejectPurchaseOrder(id, result.text, inv_getCurrentUser());
            showToast('Purchase order rejected');
            inv_renderPurchases(document.getElementById('inv-tab-content'));
        }
    });
}

// ============================================================================
// WASTAGE
// ============================================================================
function inv_renderWastage(container) {
    const wastage = inv_getWastage();
    const pending = wastage.filter(w => w.status === 'pending');
    
    let html = `
        <div style="margin-bottom: 20px;">
            <button class="btn-modern" onclick="inv_showDeclareWastageForm()">
                <i class="fas fa-plus"></i> Declare Wastage
            </button>
            <span style="margin-left: 15px;">Pending approvals: <strong style="color: #e67e22;">${pending.length}</strong></span>
        </div>
        <div class="input-group" style="margin-bottom: 15px;">
            <input type="text" id="inv-wastage-search" class="modern-input" placeholder="Search by ingredient, reason, or status..." oninput="inv_filterWastage()">
        </div>
        <div id="wastage-list">
    `;
    
    if (wastage.length === 0) {
        html += '<p class="inv-empty-row">No wastage records.</p>';
    } else {
        html += `
            <div style="overflow-x: auto;">
                <table class="data-table" id="inv-wastage-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Reason</th>
                            <th>Declared By</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </thead>
                        <tbody id="inv-wastage-tbody">
        `;
        
        for (const w of wastage) {
            const ing = inv_getIngredientById(w.ingredientId);
            const statusClass = w.status === 'pending' ? 'badge-warning' : (w.status === 'approved' ? 'badge-success' : 'badge-danger');
            const statusText = w.status === 'pending' ? '⏳ Pending' : (w.status === 'approved' ? '✅ Approved' : '❌ Rejected');
            
            html += `
                <tr data-wastage-id="${w.id}" data-ingredient="${(ing?.name || w.ingredientName).toLowerCase()}" data-status="${w.status}">
                    <td>${new Date(w.declaredAt).toLocaleDateString()}</td>
                    <td>${ing ? ing.name : w.ingredientName}</td>
                    <td>${w.qty}</td>
                    <td>${w.reason}</td>
                    <td>${w.declaredBy}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        ${w.status === 'pending' ? `<button class="icon-btn-sm" onclick="inv_approveWastageRecord('${w.id}')" title="Approve"><i class="fas fa-check-circle" style="color: var(--col-success);"></i></button>` : ''}
                        ${w.status === 'pending' ? `<button class="icon-btn-sm" onclick="inv_rejectWastageRecord('${w.id}')" title="Reject"><i class="fas fa-times-circle" style="color: var(--col-danger);"></i></button>` : ''}
                    </td>
                </tr>
            `;
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function inv_filterWastage() {
    const searchTerm = document.getElementById('inv-wastage-search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#inv-wastage-tbody tr');
    
    rows.forEach(row => {
        const ingredient = row.dataset.ingredient || '';
        const status = row.dataset.status || '';
        const matches = ingredient.includes(searchTerm) || status.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
    });
}

function inv_showDeclareWastageForm() {
    const ingredients = inv_getIngredients().filter(i => !i.archived);
    if (ingredients.length === 0) {
        showToast('No ingredients available');
        return;
    }
    
    const modalHtml = `
        <div id="inv-wastage-modal" class="modal" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="max-width: 500px;">
                <h3>Declare Wastage</h3>
                <div class="input-group"><label>Ingredient *</label>
                    <select id="wastage-ingredient" class="modern-input">
                        <option value="">-- Select --</option>
                        ${ingredients.map(i => `<option value="${i.id}">${i.name} (${inv_getStock(i.id)} ${i.unit} in stock)</option>`).join('')}
                    </select>
                </div>
                <div class="input-group"><label>Quantity *</label>
                    <input type="number" id="wastage-qty" class="modern-input" step="0.001" min="0.001" placeholder="0.000">
                </div>
                <div class="input-group"><label>Reason *</label>
                    <select id="wastage-reason" class="modern-input">
                        <option>Cooking Error</option>
                        <option>Spoilage/Expired</option>
                        <option>Dropped/Spilled</option>
                        <option>Customer Return</option>
                        <option>Over-preparation</option>
                        <option>Other</option>
                    </select>
                </div>
                <div class="input-group"><label>Notes (optional)</label>
                    <textarea id="wastage-notes" class="modern-input" rows="2" placeholder="Additional details..."></textarea>
                </div>
                <div class="modal-buttons">
                    <button onclick="inv_closeWastageModal()">Cancel</button>
                    <button class="save" onclick="inv_submitWastage()">Submit for Approval</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('inv-wastage-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('inv-wastage-modal');
    modal.classList.add('active');
}

function inv_closeWastageModal() {
    const modal = document.getElementById('inv-wastage-modal');
    if (modal) modal.remove();
}

function inv_submitWastage() {
    const ingredientId = document.getElementById('wastage-ingredient')?.value;
    const qty = parseFloat(document.getElementById('wastage-qty')?.value);
    const reason = document.getElementById('wastage-reason')?.value;
    const notes = document.getElementById('wastage-notes')?.value || '';
    
    if (!ingredientId || !qty || qty <= 0 || !reason) {
        showToast('Please fill all required fields');
        return;
    }
    
    const ing = inv_getIngredientById(ingredientId);
    const currentStock = inv_getStock(ingredientId);
    
    if (qty > currentStock) {
        showCustomAlert('Insufficient Stock', `You only have ${currentStock} ${ing?.unit} in stock. Cannot declare wastage of ${qty} ${ing?.unit}.`);
        return;
    }
    
    inv_declareWastage({
        ingredientId,
        ingredientName: ing?.name || 'Unknown',
        qty,
        reason,
        notes
    });
    
    inv_closeWastageModal();
    showToast('Wastage declared, pending approval');
    inv_renderWastage(document.getElementById('inv-tab-content'));
}

function inv_approveWastageRecord(id) {
    verifyManagerPIN((approved) => {
        if (approved) {
            try {
                inv_approveWastage(id, null, inv_getCurrentUser());
                showToast('Wastage approved, stock deducted');
                inv_renderWastage(document.getElementById('inv-tab-content'));
                inv_refreshStockRegister();
            } catch (e) {
                showToast(e.message, 'error');
            }
        }
    });
}

function inv_rejectWastageRecord(id) {
    openCustomPrompt('Rejection Reason', null, null, null, 'text', (result) => {
        if (result.text) {
            inv_rejectWastage(id, result.text, inv_getCurrentUser());
            showToast('Wastage rejected');
            inv_renderWastage(document.getElementById('inv-tab-content'));
        }
    });
}

// ============================================================================
// SUPPLIERS
// ============================================================================
function inv_renderSuppliers(container) {
    const suppliers = inv_getSuppliers().filter(s => !s.archived);
    
    let html = `
        <div style="margin-bottom: 20px;">
            <button class="btn-modern" onclick="inv_showAddSupplierForm()">
                <i class="fas fa-plus"></i> Add Supplier
            </button>
        </div>
        <div class="input-group" style="margin-bottom: 15px;">
            <input type="text" id="inv-supplier-search" class="modern-input" placeholder="Search by name or contact..." oninput="inv_filterSuppliers()">
        </div>
        <div id="suppliers-list">
    `;
    
    if (suppliers.length === 0) {
        html += '<p class="inv-empty-row">No suppliers added yet.</p>';
    } else {
        html += `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;" id="inv-supplier-grid">
        `;
        
        for (const sup of suppliers) {
            html += `
                <div class="inv-dashboard-card" data-supplier-id="${sup.id}" data-name="${sup.name.toLowerCase()}" data-contact="${(sup.contact || '').toLowerCase()}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="font-size: 16px;">${sup.name}</strong>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${sup.contact || 'No phone'}</div>
                            ${sup.address ? `<div style="font-size: 11px; color: var(--text-secondary);">${sup.address}</div>` : ''}
                        </div>
                        <div>
                            <button class="icon-btn-sm" onclick="inv_editSupplier('${sup.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                            <button class="icon-btn-sm" onclick="inv_archiveSupplier('${sup.id}')" title="Archive"><i class="fas fa-archive"></i></button>
                        </div>
                    </div>
                    <div style="margin-top: 12px; font-size: 11px;">
                        <span class="badge">Terms: ${sup.paymentTerms || 'Cash'}</span>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function inv_filterSuppliers() {
    const searchTerm = document.getElementById('inv-supplier-search')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('#inv-supplier-grid .inv-dashboard-card');
    
    cards.forEach(card => {
        const name = card.dataset.name || '';
        const contact = card.dataset.contact || '';
        const matches = name.includes(searchTerm) || contact.includes(searchTerm);
        card.style.display = matches ? '' : 'none';
    });
}

function inv_showAddSupplierForm(editId = null) {
    const sup = editId ? inv_getSupplierById(editId) : null;
    const title = sup ? 'Edit Supplier' : 'Add Supplier';
    
    const modalHtml = `
        <div id="inv-supplier-modal" class="modal" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="max-width: 500px;">
                <h3>${title}</h3>
                <div class="input-group"><label>Name *</label><input type="text" id="sup-name" class="modern-input" value="${sup ? sup.name : ''}"></div>
                <div class="input-group"><label>Contact</label><input type="text" id="sup-contact" class="modern-input" value="${sup ? sup.contact || '' : ''}" placeholder="Phone number"></div>
                <div class="input-group"><label>Address</label><input type="text" id="sup-address" class="modern-input" value="${sup ? sup.address || '' : ''}"></div>
                <div class="input-group"><label>Payment Terms</label>
                    <select id="sup-terms" class="modern-input">
                        <option value="Cash" ${sup && sup.paymentTerms === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Weekly" ${sup && sup.paymentTerms === 'Weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="Monthly" ${sup && sup.paymentTerms === 'Monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="Credit-30" ${sup && sup.paymentTerms === 'Credit-30' ? 'selected' : ''}>Credit 30 Days</option>
                        <option value="Credit-60" ${sup && sup.paymentTerms === 'Credit-60' ? 'selected' : ''}>Credit 60 Days</option>
                    </select>
                </div>
                <div class="input-group"><label>Notes</label><textarea id="sup-notes" class="modern-input" rows="2">${sup ? sup.notes || '' : ''}</textarea></div>
                <div class="modal-buttons">
                    <button onclick="inv_closeSupplierModal()">Cancel</button>
                    <button class="save" onclick="inv_saveSupplierFromModal('${editId || ''}')">Save</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('inv-supplier-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('inv-supplier-modal');
    modal.classList.add('active');
}

function inv_closeSupplierModal() {
    const modal = document.getElementById('inv-supplier-modal');
    if (modal) modal.remove();
}

function inv_saveSupplierFromModal(editId) {
    const name = document.getElementById('sup-name').value.trim();
    if (!name) {
        showToast('Name is required');
        return;
    }
    
    const contact = document.getElementById('sup-contact').value;
    const address = document.getElementById('sup-address').value;
    const paymentTerms = document.getElementById('sup-terms').value;
    const notes = document.getElementById('sup-notes').value;
    
    try {
        if (editId) {
            inv_updateSupplier(editId, { name, contact, address, paymentTerms, notes });
            showToast('Supplier updated');
        } else {
            inv_addSupplier({ name, contact, address, paymentTerms, notes });
            showToast('Supplier added');
        }
        inv_closeSupplierModal();
        inv_renderSuppliers(document.getElementById('inv-tab-content'));
    } catch (error) {
        showCustomAlert('Error', error.message);
    }
}

function inv_editSupplier(id) {
    inv_showAddSupplierForm(id);
}

function inv_archiveSupplier(id) {
    openConfirm('Archive Supplier', 'Are you sure you want to archive this supplier?', () => {
        inv_updateSupplier(id, { archived: true });
        showToast('Supplier archived');
        inv_renderSuppliers(document.getElementById('inv-tab-content'));
    });
}

// ============================================================================
// PHYSICAL COUNT
// ============================================================================
function inv_renderPhysicalCount(container) {
    const activeSession = inv_getPhysicalCounts().find(c => c.status === 'active');
    const recentSessions = inv_getPhysicalCounts().filter(c => c.status === 'completed').slice(0, 5);
    
    if (activeSession) {
        inv_currentCountSessionId = activeSession.id;
        inv_renderActiveCountSession(container, activeSession);
    } else {
        let html = `
            <div style="text-align: center; padding: 40px;">
                <h3>No Active Physical Count Session</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">Start a new physical count to reconcile stock.</p>
                <button class="btn-modern btn-modern-save" onclick="inv_startPhysicalCountSession()">
                    <i class="fas fa-play"></i> Start New Count
                </button>
            </div>
        `;
        
        if (recentSessions.length > 0) {
            html += `
                <h4 style="margin-top: 30px; margin-bottom: 15px;">Recent Count Sessions</h4>
                <div style="overflow-x: auto;">
                    <table class="data-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Started By</th>
                                <th>Items Counted</th>
                                <th>Critical Variances</th>
                                <th>Actions</th>
                            </thead>
                            <tbody>
                                ${recentSessions.map(session => {
                                    const entries = Object.values(session.entries || {});
                                    const counted = entries.filter(e => e.physicalQty !== null).length;
                                    const critical = entries.filter(e => e.severity === 'CRITICAL').length;
                                    return `
                                        <tr>
                                            <td>${new Date(session.startedAt).toLocaleDateString()}</td>
                                            <td>${session.startedBy}</td>
                                            <td>${counted}/${entries.length}</td>
                                            <td style="color: var(--col-danger);">${critical}</td>
                                            <td><button class="icon-btn-sm" onclick="inv_viewCountDetails('${session.id}')">View</button></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
        }
        
        container.innerHTML = html;
    }
}

function inv_renderActiveCountSession(container, session) {
    const entries = Object.values(session.entries || {});
    const counted = entries.filter(e => e.physicalQty !== null).length;
    const progress = Math.round((counted / entries.length) * 100);
    
    let html = `
        <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h3 style="margin: 0;">Physical Count Session</h3>
                    <p style="color: var(--text-secondary);">Started: ${new Date(session.startedAt).toLocaleString()} by ${session.startedBy}</p>
                </div>
                <div>
                    <button class="btn-modern" onclick="inv_cancelCurrentCount()" style="background: var(--col-danger); color: white;">Cancel Session</button>
                    <button class="btn-modern btn-modern-save" onclick="inv_submitCountSession()" ${counted < entries.length ? 'disabled' : ''}>Submit Count</button>
                </div>
            </div>
            <div style="background: var(--bg-app); border-radius: 8px; height: 8px; margin: 15px 0;">
                <div style="width: ${progress}%; height: 100%; background: var(--col-success); border-radius: 8px;"></div>
            </div>
            <div style="text-align: center; font-size: 12px;">${progress}% Complete (${counted}/${entries.length} items)</div>
        </div>
        
        <div class="input-group" style="margin-bottom: 15px;">
            <input type="text" id="inv-count-search" class="modern-input" placeholder="Search ingredients..." oninput="inv_filterCountRows()">
        </div>
        
        <div style="max-height: 500px; overflow-y: auto;">
            <div id="inv-count-rows">
    `;
    
    for (const entry of entries) {
        const isCounted = entry.physicalQty !== null;
        html += `
            <div class="inv-count-row" data-ingredient-id="${entry.ingredientId}" data-name="${entry.ingredientName.toLowerCase()}" style="background: var(--bg-app); border-radius: 12px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <div style="flex: 2; min-width: 150px;">
                    <strong>${entry.ingredientName}</strong>
                    <div style="font-size: 11px; color: var(--text-secondary);">Expected: ${entry.expectedQty} ${entry.unit}</div>
                </div>
                <div style="flex: 1;">
                    <input type="number" id="count-qty-${entry.ingredientId}" class="modern-input" value="${entry.physicalQty !== null ? entry.physicalQty : ''}" placeholder="Physical Qty" step="0.001" style="width: 120px;" onchange="inv_saveCountEntry('${entry.ingredientId}', this.value)">
                </div>
                <div style="width: 80px;">
                    <span id="count-status-${entry.ingredientId}" style="font-size: 11px; color: ${isCounted ? 'var(--col-success)' : 'var(--text-secondary)'};">${isCounted ? '✓ Recorded' : 'Pending'}</span>
                </div>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function inv_filterCountRows() {
    const searchTerm = document.getElementById('inv-count-search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('.inv-count-row');
    
    rows.forEach(row => {
        const name = row.dataset.name || '';
        const matches = name.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
    });
}

function inv_saveCountEntry(ingredientId, value) {
    if (!inv_currentCountSessionId) return;
    
    const physicalQty = parseFloat(value);
    if (isNaN(physicalQty)) return;
    
    try {
        inv_saveCountEntry(inv_currentCountSessionId, ingredientId, physicalQty);
        const statusSpan = document.getElementById(`count-status-${ingredientId}`);
        if (statusSpan) {
            statusSpan.innerHTML = '✓ Recorded';
            statusSpan.style.color = 'var(--col-success)';
        }
        
        // Update progress bar
        const session = inv_getPhysicalCounts().find(c => c.id === inv_currentCountSessionId);
        if (session) {
            const entries = Object.values(session.entries || {});
            const counted = entries.filter(e => e.physicalQty !== null).length;
            const progress = Math.round((counted / entries.length) * 100);
            const progressBar = document.querySelector('#inv-tab-content .progress-bar-fill');
            if (progressBar) progressBar.style.width = `${progress}%`;
            
            const submitBtn = document.querySelector('#inv-tab-content .btn-modern-save');
            if (submitBtn && counted === entries.length) {
                submitBtn.disabled = false;
            }
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function inv_startPhysicalCountSession() {
    try {
        const session = inv_startPhysicalCountSession();
        inv_currentCountSessionId = session.id;
        inv_renderPhysicalCount(document.getElementById('inv-tab-content'));
        showToast('Physical count session started');
    } catch (error) {
        showCustomAlert('Error', error.message);
    }
}

function inv_cancelCurrentCount() {
    if (!inv_currentCountSessionId) return;
    
    openConfirm('Cancel Count Session', 'Are you sure you want to cancel this physical count session? All entered data will be lost.', () => {
        inv_cancelPhysicalCountSession(inv_currentCountSessionId, 'Cancelled by user');
        inv_currentCountSessionId = null;
        showToast('Count session cancelled');
        inv_renderPhysicalCount(document.getElementById('inv-tab-content'));
    });
}

function inv_submitCountSession() {
    if (!inv_currentCountSessionId) return;
    
    const session = inv_getPhysicalCounts().find(c => c.id === inv_currentCountSessionId);
    if (!session) return;
    
    const entries = Object.values(session.entries || {});
    const allCounted = entries.every(e => e.physicalQty !== null);
    
    if (!allCounted) {
        showToast('Please enter physical quantity for all items before submitting');
        return;
    }
    
    verifyManagerPIN((approved) => {
        if (approved) {
            try {
                const report = inv_submitPhysicalCountSession(inv_currentCountSessionId, null, inv_getCurrentUser());
                inv_currentCountSessionId = null;
                showToast(`Count session submitted. ${report.flaggedCount} items flagged for variance.`);
                inv_switchTab('variance');
            } catch (error) {
                showCustomAlert('Error', error.message);
            }
        }
    });
}

function inv_viewCountDetails(sessionId) {
    const session = inv_getPhysicalCounts().find(c => c.id === sessionId);
    if (!session) return;
    
    const entries = Object.values(session.entries || {}).filter(e => e.physicalQty !== null);
    
    let html = `
        <div style="max-height: 400px; overflow-y: auto;">
            <table class="data-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Ingredient</th>
                        <th>Expected</th>
                        <th>Physical</th>
                        <th>Variance</th>
                        <th>Variance %</th>
                        <th>Severity</th>
                    </thead>
                    <tbody>
    `;
    
    for (const entry of entries) {
        const severityClass = entry.severity === 'CRITICAL' ? 'badge-danger' : (entry.severity === 'WARNING' ? 'badge-warning' : 'badge-success');
        html += `
            <tr>
                <td>${entry.ingredientName}</td>
                <td>${entry.expectedQty} ${entry.unit}</td>
                <td>${entry.physicalQty} ${entry.unit}</td>
                <td style="color: ${entry.variance >= 0 ? 'var(--col-success)' : 'var(--col-danger)'};">${entry.variance >= 0 ? '+' : ''}${entry.variance}</td>
                <td>${entry.variancePct?.toFixed(2) || 0}%</td>
                <td><span class="badge ${severityClass}">${entry.severity}</span></td>
            </tr>
        `;
    }
    
    html += `
                    </tbody>
                </table>
            </div>
    `;
    
    showCustomAlert(`Count Session Details - ${new Date(session.startedAt).toLocaleDateString()}`, html);
}

// ============================================================================
// VARIANCE REPORTS
// ============================================================================
function inv_renderVarianceReports(container) {
    const reports = inv_getVarianceReports();
    
    let html = `
        <div style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn-modern" onclick="inv_exportVarianceToCSV()">
                <i class="fas fa-file-excel"></i> Export to CSV
            </button>
            <button class="btn-modern" onclick="inv_refreshVarianceReports()">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        <div class="input-group" style="margin-bottom: 15px;">
            <input type="text" id="inv-variance-search" class="modern-input" placeholder="Search by ingredient or session..." oninput="inv_filterVarianceReports()">
        </div>
        <div id="variance-reports-list">
    `;
    
    if (reports.length === 0) {
        html += '<p class="inv-empty-row">No variance reports yet. Complete a physical count to generate reports.</p>';
    } else {
        html += `
            <div style="overflow-x: auto;">
                <table class="data-table" id="inv-variance-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Session ID</th>
                            <th>Items Counted</th>
                            <th>Critical</th>
                            <th>Warning</th>
                            <th>Total Gap</th>
                            <th>Actions</th>
                        </thead>
                        <tbody id="inv-variance-tbody">
        `;
        
        for (const report of reports) {
            const results = report.results || [];
            const critical = results.filter(r => r.severity === 'CRITICAL').length;
            const warning = results.filter(r => r.severity === 'WARNING').length;
            
            html += `
                <tr data-report-id="${report.id}" data-date="${new Date(report.createdAt).toLocaleDateString()}">
                    <td>${new Date(report.createdAt).toLocaleDateString()} ${new Date(report.createdAt).toLocaleTimeString()}飞
                    <td>${report.countSessionId}飞
                    <td>${results.length}飞
                    <td style="color: var(--col-danger);">${critical}飞
                    <td style="color: #e67e22;">${warning}飞
                    <td>${appSettings.property.currency} ${(report.totalGap || 0).toFixed(0)}飞
                    <td><button class="icon-btn-sm" onclick="inv_viewVarianceReportDetails('${report.id}')">View Details</button>飞
                </tr>
            `;
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function inv_filterVarianceReports() {
    const searchTerm = document.getElementById('inv-variance-search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#inv-variance-tbody tr');
    
    rows.forEach(row => {
        const date = row.dataset.date || '';
        const matches = date.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
    });
}

function inv_refreshVarianceReports() {
    if (inv_activeTab === 'variance') {
        inv_renderVarianceReports(document.getElementById('inv-tab-content'));
    }
}

function inv_viewVarianceReportDetails(reportId) {
    const report = inv_getVarianceReports().find(r => r.id === reportId);
    if (!report) return;
    
    const results = report.results || [];
    
    let html = `
        <div style="max-height: 500px; overflow-y: auto;">
            <table class="data-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Ingredient</th>
                        <th>Expected</th>
                        <th>Physical</th>
                        <th>Variance</th>
                        <th>Variance %</th>
                        <th>Severity</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const result of results) {
        const severityClass = result.severity === 'CRITICAL' ? 'badge-danger' : (result.severity === 'WARNING' ? 'badge-warning' : 'badge-success');
        html += `
            <tr>
                <td><strong>${result.ingredientName}</strong></td>
                <td>${result.expectedQty} ${result.unit}</td>
                <td>${result.physicalQty !== null ? result.physicalQty : '—'} ${result.unit}</td>
                <td style="color: ${result.variance >= 0 ? 'var(--col-success)' : 'var(--col-danger)'};">${result.variance >= 0 ? '+' : ''}${result.variance}</td>
                <td>${result.variancePct?.toFixed(2) || 0}%</td>
                <td><span class="badge ${severityClass}">${result.severity}</span></td>
            </tr>
        `;
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    showCustomAlert(`Variance Report - ${new Date(report.createdAt).toLocaleString()}`, html);
}

// ============================================================================
// REORDER SUGGESTIONS
// ============================================================================
function inv_renderReorderSuggestions(container) {
    const suggestions = inv_getReorderSuggestions();
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h3>📊 Predictive Reorder Suggestions</h3>
            <p style="color: var(--text-secondary); margin-bottom: 10px;">Based on consumption over the last 30 days</p>
            <button class="btn-modern" onclick="inv_createPurchaseFromSuggestions()">
                <i class="fas fa-shopping-cart"></i> Create Purchase Order from Selected
            </button>
            <button class="btn-modern" onclick="inv_refreshReorderSuggestions()">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
    `;
    
    if (suggestions.length === 0) {
        html += '<p class="inv-empty-row">No reorder suggestions at this time. All stock levels are healthy.</p>';
    } else {
        html += `
            <div style="overflow-x: auto;">
                <table class="data-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="select-all-suggestions" onclick="inv_toggleAllSuggestions(this.checked)"></th>
                            <th>Ingredient</th>
                            <th>Current Stock</th>
                            <th>Min Threshold</th>
                            <th>Avg Daily Consumption</th>
                            <th>Days Remaining</th>
                            <th>Suggested Qty</th>
                            <th>Unit</th>
                            <th>Est. Cost</th>
                        </tr>
                    </thead>
                    <tbody id="inv-suggestions-tbody">
        `;
        
        suggestions.forEach((s, idx) => {
            const urgencyColor = s.urgency === 'critical' ? 'var(--col-danger)' : (s.urgency === 'high' ? '#e67e22' : '#f39c12');
            html += `
                <tr data-ingredient-id="${s.ingredientId}" data-ingredient-name="${s.ingredientName}">
                    <td><input type="checkbox" class="suggestion-checkbox" data-idx="${idx}"></td>
                    <td><strong>${s.ingredientName}</strong></td>
                    <td style="color: ${s.currentStock <= s.minThreshold ? 'var(--col-danger)' : 'var(--text-primary)'}">${s.currentStock}</td>
                    <td>${s.minThreshold}</td>
                    <td>${s.avgDailyConsumption}</td>
                    <td style="color: ${urgencyColor}; font-weight: bold;">${s.daysRemaining}</td>
                    <td><input type="number" id="suggested-qty-${idx}" value="${s.suggestedQty}" style="width: 80px;" step="0.001" class="modern-input"></td>
                    <td>${s.unit}</td>
                    <td>${appSettings.property.currency} ${s.estimatedCost.toFixed(0)}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function inv_toggleAllSuggestions(checked) {
    const checkboxes = document.querySelectorAll('.suggestion-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
}

function inv_createPurchaseFromSuggestions() {
    const selectedRows = [];
    const checkboxes = document.querySelectorAll('.suggestion-checkbox:checked');
    
    for (const cb of checkboxes) {
        const idx = cb.dataset.idx;
        const row = cb.closest('tr');
        const ingredientId = row?.dataset.ingredientId;
        const ingredientName = row?.dataset.ingredientName;
        const suggestedQty = parseFloat(document.getElementById(`suggested-qty-${idx}`)?.value);
        const unit = row?.cells[7]?.innerText || '';
        
        if (ingredientId && suggestedQty > 0) {
            selectedRows.push({
                ingredientId,
                ingredientName,
                qty: suggestedQty,
                unit,
                unitPrice: 0
            });
        }
    }
    
    if (selectedRows.length === 0) {
        showToast('No items selected');
        return;
    }
    
    inv_showCreatePurchaseFormWithItems(selectedRows);
}

function inv_showCreatePurchaseFormWithItems(prefilledItems) {
    const suppliers = inv_getSuppliers().filter(s => !s.archived);
    if (suppliers.length === 0) {
        showCustomAlert('No Suppliers', 'Please add a supplier first.');
        inv_switchTab('suppliers');
        return;
    }
    
    const modalHtml = `
        <div id="inv-po-modal" class="modal" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <h3>New Purchase Order (from Reorder Suggestions)</h3>
                <div class="modern-form-grid" style="grid-template-columns: 1fr 1fr;">
                    <div class="input-group"><label>Supplier *</label><select id="po-supplier" class="modern-input">${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Date *</label><input type="date" id="po-date" class="modern-input" value="${new Date().toISOString().split('T')[0]}"></div>
                    <div class="input-group full-width"><label>Invoice #</label><input type="text" id="po-invoice" class="modern-input" placeholder="Optional"></div>
                    <div class="input-group full-width"><label>Notes</label><textarea id="po-notes" class="modern-input" rows="2" placeholder="Auto-generated from reorder suggestions"></textarea></div>
                </div>
                <h4>Items (prices need to be entered)</h4>
                <div id="po-items-list"></div>
                <div class="modal-buttons" style="margin-top: 20px;">
                    <button onclick="inv_closePurchaseModal()">Cancel</button>
                    <button class="save" onclick="inv_submitPurchaseOrder()">Submit for Approval</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('inv-po-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('inv-po-modal');
    modal.classList.add('active');
    
    const container = document.getElementById('po-items-list');
    container.innerHTML = '';
    
    prefilledItems.forEach((item, idx) => {
        const rowHtml = `
            <div class="po-item-row" data-idx="${idx}" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center;">
                <input type="text" class="modern-input" value="${item.ingredientName}" readonly style="background: var(--bg-app);">
                <input type="hidden" class="po-ingredient" value="${item.ingredientId}">
                <input type="number" class="modern-input po-qty" data-idx="${idx}" value="${item.qty}" step="0.001" readonly style="background: var(--bg-app);">
                <input type="text" class="modern-input" value="${item.unit}" readonly style="background: var(--bg-app);">
                <input type="number" class="modern-input po-price" data-idx="${idx}" placeholder="Unit Price" step="0.01">
                <button class="icon-btn-sm" onclick="this.closest('.po-item-row').remove()">🗑️</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', rowHtml);
    });
}

function inv_refreshReorderSuggestions() {
    if (inv_activeTab === 'reorder') {
        inv_renderReorderSuggestions(document.getElementById('inv-tab-content'));
    }
}

// ============================================================================
// AUDIT LOG
// ============================================================================
function inv_renderAuditLog(container) {
    const logs = inv_getAuditLog();
    
    let html = `
        <div class="input-group" style="margin-bottom: 15px;">
            <input type="text" id="inv-audit-search" class="modern-input" placeholder="Search by user, action, entity..." oninput="inv_filterAuditLog()">
        </div>
        <div class="input-group" style="margin-bottom: 15px;">
            <input type="date" id="inv-audit-date-from" class="modern-input" style="width: auto; display: inline-block; margin-right: 10px;" placeholder="From">
            <input type="date" id="inv-audit-date-to" class="modern-input" style="width: auto; display: inline-block;" placeholder="To">
            <button class="btn-modern" onclick="inv_filterAuditLogByDate()">Apply Date Filter</button>
        </div>
        <div id="audit-table" style="max-height: 500px; overflow-y: auto;">
    `;
    
    if (logs.length === 0) {
        html += '<p class="inv-empty-row">No audit logs yet.</p>';
    } else {
        html += `
            <table class="data-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody id="inv-audit-tbody">
        `;
        
        for (const log of logs) {
            html += `
                <tr data-timestamp="${log.timestamp}">
                    <td style="white-space: nowrap;">${new Date(log.timestamp).toLocaleString()}</td>
                    <td><strong>${log.user}</strong></td>
                    <td><span class="badge">${log.action}</span></td>
                    <td>${log.entity}</td>
                    <td>${log.details}</td>
                </tr>
            `;
        }
        
        html += `
                </tbody>
            </table>
        `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function inv_filterAuditLog() {
    const searchTerm = document.getElementById('inv-audit-search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#inv-audit-tbody tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        const matches = text.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
    });
}

function inv_filterAuditLogByDate() {
    const fromDate = document.getElementById('inv-audit-date-from')?.value;
    const toDate = document.getElementById('inv-audit-date-to')?.value;
    const rows = document.querySelectorAll('#inv-audit-tbody tr');
    
    rows.forEach(row => {
        const timestamp = row.dataset.timestamp;
        if (!timestamp) {
            row.style.display = '';
            return;
        }
        
        const logDate = new Date(timestamp).toISOString().split('T')[0];
        let show = true;
        
        if (fromDate && logDate < fromDate) show = false;
        if (toDate && logDate > toDate) show = false;
        
        row.style.display = show ? '' : 'none';
    });
}

// ============================================================================
// SETTINGS
// ============================================================================
function inv_renderInventorySettings(container) {
    const invSettings = (typeof appSettings !== 'undefined' && appSettings.inventory) ? appSettings.inventory : {
        lowStockThreshold: 5,
        varianceWarningPct: 3,
        varianceCriticalPct: 10,
        priceAnomalyPct: 10,
        autoReorder: false
    };
    
    let html = `
        <div class="modern-form-grid" style="max-width: 600px;">
            <div class="modern-input-group full-width">
                <label>Low Stock Threshold (quantity)</label>
                <input type="number" id="inv-low-threshold" class="modern-input" value="${invSettings.lowStockThreshold || 5}" min="0" step="0.1">
            </div>
            <div class="modern-input-group full-width">
                <label>Variance Warning Percentage (%)</label>
                <input type="number" id="inv-var-warn" class="modern-input" value="${invSettings.varianceWarningPct || 3}" step="0.1" min="0">
            </div>
            <div class="modern-input-group full-width">
                <label>Variance Critical Percentage (%)</label>
                <input type="number" id="inv-var-crit" class="modern-input" value="${invSettings.varianceCriticalPct || 10}" step="0.1" min="0">
            </div>
            <div class="modern-input-group full-width">
                <label>Price Anomaly Threshold (%)</label>
                <input type="number" id="inv-price-anomaly" class="modern-input" value="${invSettings.priceAnomalyPct || 10}" step="1" min="0">
            </div>
            <div class="modern-input-group full-width" style="flex-direction: row; align-items: center; gap: 10px; padding: 15px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
                <input type="checkbox" id="inv-auto-reorder" class="apple-switch" ${invSettings.autoReorder ? 'checked' : ''}>
                <label for="inv-auto-reorder" style="margin:0; font-size:0.9rem; cursor:pointer;">Auto-create purchase orders for critical stock</label>
            </div>
            
            <div class="modern-input-group full-width" style="border-top: 1px solid var(--border-color); padding-top: 20px; margin-top: 10px;">
                <h4 style="margin-bottom: 15px;">Data Management</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-modern" onclick="inv_exportInventoryData()">
                        <i class="fas fa-download"></i> Export Inventory Data
                    </button>
                    <button class="btn-modern" onclick="document.getElementById('inv-import-input').click()">
                        <i class="fas fa-upload"></i> Import Inventory Data
                    </button>
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
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button class="btn-modern btn-modern-save" onclick="inv_saveInventorySettings()">Save Settings</button>
            <button class="btn-modern" onclick="inv_resetInventorySettings()">Reset to Default</button>
        </div>
    `;
    
    container.innerHTML = html;
}

function inv_saveInventorySettings() {
    if (typeof appSettings === 'undefined') {
        console.error('appSettings not available');
        return;
    }
    
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
    if (typeof appSettings === 'undefined') return;
    
    if (!appSettings.inventory) appSettings.inventory = {};
    
    appSettings.inventory.lowStockThreshold = 5;
    appSettings.inventory.varianceWarningPct = 3;
    appSettings.inventory.varianceCriticalPct = 10;
    appSettings.inventory.priceAnomalyPct = 10;
    appSettings.inventory.autoReorder = false;
    
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast('Inventory settings reset to default');
    inv_renderInventorySettings(document.getElementById('inv-tab-content'));
}

function inv_toggleDebugMode() {
    const isEnabled = localStorage.getItem('inv_debug_mode') === 'true';
    localStorage.setItem('inv_debug_mode', !isEnabled);
    showToast(`Inventory Debug Mode: ${!isEnabled ? 'ON' : 'OFF'}`);
    if (!isEnabled) {
        console.log('Inventory Debug Mode Enabled');
        console.log('Current inventory state:', {
            ingredients: inv_getIngredients().length,
            recipes: inv_getRecipes().length,
            stock: Object.keys(inv_getStockLevels()).length,
            movements: inv_getMovements().length
        });
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function inv_initInventoryUI() {
    if (typeof inv_seedDefaultIngredients === 'function') {
        inv_seedDefaultIngredients();
    }
    
    if (typeof inv_startSync === 'function') {
        inv_startSync(60);
    }
    
    renderInventorySection();
    
    if (typeof applyAdvancedCSSVariables === 'function') {
        applyAdvancedCSSVariables();
    }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('inventory-section')) {
            inv_initInventoryUI();
        }
    });
}

// Expose functions globally
if (typeof window !== 'undefined') {
    window.renderInventorySection = renderInventorySection;
    window.inv_switchTab = inv_switchTab;
    window.inv_showAddIngredientForm = inv_showAddIngredientForm;
    window.inv_editIngredient = inv_editIngredient;
    window.inv_adjustStockPrompt = inv_adjustStockPrompt;
    window.inv_archiveIngredient = inv_archiveIngredient;
    window.inv_refreshStockRegister = inv_refreshStockRegister;
    window.inv_scanBarcodeForIngredient = inv_scanBarcodeForIngredient;
    window.inv_scanBarcodeForAdjustment = inv_scanBarcodeForAdjustment;
    window.inv_loadRecipeForMenuItem = inv_loadRecipeForMenuItem;
    window.inv_addRecipeIngredientRow = inv_addRecipeIngredientRow;
    window.inv_removeRecipeIngredientRow = inv_removeRecipeIngredientRow;
    window.inv_saveCurrentRecipe = inv_saveCurrentRecipe;
    window.inv_deleteCurrentRecipe = inv_deleteCurrentRecipe;
    window.inv_showCreatePurchaseForm = inv_showCreatePurchaseForm;
    window.inv_addPurchaseItemRow = inv_addPurchaseItemRow;
    window.inv_submitPurchaseOrder = inv_submitPurchaseOrder;
    window.inv_viewPurchaseDetails = inv_viewPurchaseDetails;
    window.inv_approvePurchase = inv_approvePurchase;
    window.inv_rejectPurchase = inv_rejectPurchase;
    window.inv_showDeclareWastageForm = inv_showDeclareWastageForm;
    window.inv_submitWastage = inv_submitWastage;
    window.inv_approveWastageRecord = inv_approveWastageRecord;
    window.inv_rejectWastageRecord = inv_rejectWastageRecord;
    window.inv_showAddSupplierForm = inv_showAddSupplierForm;
    window.inv_editSupplier = inv_editSupplier;
    window.inv_archiveSupplier = inv_archiveSupplier;
    window.inv_startPhysicalCountSession = inv_startPhysicalCountSession;
    window.inv_saveCountEntry = inv_saveCountEntry;
    window.inv_cancelCurrentCount = inv_cancelCurrentCount;
    window.inv_submitCountSession = inv_submitCountSession;
    window.inv_viewCountDetails = inv_viewCountDetails;
    window.inv_viewVarianceReportDetails = inv_viewVarianceReportDetails;
    window.inv_createPurchaseFromSuggestions = inv_createPurchaseFromSuggestions;
    window.inv_toggleAllSuggestions = inv_toggleAllSuggestions;
    window.inv_exportStockToCSV = inv_exportStockToCSV;
    window.inv_exportVarianceToCSV = inv_exportVarianceToCSV;
    window.inv_toggleDebugMode = inv_toggleDebugMode;
    window.inv_saveInventorySettings = inv_saveInventorySettings;
    window.inv_resetInventorySettings = inv_resetInventorySettings;
}