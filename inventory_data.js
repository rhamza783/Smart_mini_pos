// inventory_data.js
// Complete data layer for inventory management
// Version: 2.0 - Fully integrated with all features

// ============================================================================
// CONSTANTS & STORAGE KEYS
// ============================================================================
const INV_INGREDIENTS_KEY = 'inv_ingredients';
const INV_RECIPES_KEY = 'inv_recipes';
const INV_STOCK_KEY = 'inv_stock';
const INV_MOVEMENTS_KEY = 'inv_movements';
const INV_PURCHASES_KEY = 'inv_purchases';
const INV_SUPPLIERS_KEY = 'inv_suppliers';
const INV_WASTAGE_KEY = 'inv_wastage';
const INV_PHYSICAL_COUNTS_KEY = 'inv_physical_counts';
const INV_VARIANCE_KEY = 'inv_variance_reports';
const INV_AUDIT_KEY = 'inv_audit';
const INV_SYNC_KEY = 'inv_sync_broadcast';
const INV_MIGRATED_KEY = 'inv_migrated_to_indexeddb';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function inv_generateId(prefix = 'INV') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function inv_getCurrentUser() {
    return (typeof app !== 'undefined' && app.currentUser && app.currentUser.name) ? app.currentUser.name : 'System';
}

function inv_getCurrentUserId() {
    return (typeof app !== 'undefined' && app.currentUser && app.currentUser.id) ? app.currentUser.id : 'SYSTEM';
}

// ============================================================================
// INGREDIENTS CRUD
// ============================================================================
function inv_getIngredients() {
    try {
        const data = localStorage.getItem(INV_INGREDIENTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading ingredients:', e);
        return [];
    }
}

function inv_saveIngredients(ingredients) {
    localStorage.setItem(INV_INGREDIENTS_KEY, JSON.stringify(ingredients));
    inv_broadcastChange({ action: 'save', entity: 'ingredients' });
}

function inv_addIngredient(ingredient) {
    const ingredients = inv_getIngredients();
    const newIngredient = {
        id: inv_generateId('ING'),
        name: ingredient.name,
        altName: ingredient.altName || '',
        unit: ingredient.unit,
        category: ingredient.category || 'Other',
        minThreshold: ingredient.minThreshold || 0,
        costPerUnit: ingredient.costPerUnit || 0,
        barcode: ingredient.barcode || '',
        notes: ingredient.notes || '',
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Check for duplicate name
    const existing = ingredients.find(i => i.name.toLowerCase() === newIngredient.name.toLowerCase() && !i.archived);
    if (existing) {
        throw new Error(`Ingredient "${ingredient.name}" already exists`);
    }
    
    ingredients.push(newIngredient);
    inv_saveIngredients(ingredients);
    inv_initStockForIngredient(newIngredient.id);
    inv_logAudit('ADD_INGREDIENT', 'ingredient', newIngredient.id, `Added ${newIngredient.name}`);
    return newIngredient;
}

function inv_updateIngredient(id, updates) {
    const ingredients = inv_getIngredients();
    const index = ingredients.findIndex(i => i.id === id);
    if (index === -1) return null;
    
    // Prevent duplicate name
    if (updates.name) {
        const existing = ingredients.find(i => i.id !== id && i.name.toLowerCase() === updates.name.toLowerCase() && !i.archived);
        if (existing) {
            throw new Error(`Ingredient "${updates.name}" already exists`);
        }
    }
    
    ingredients[index] = {
        ...ingredients[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    inv_saveIngredients(ingredients);
    inv_logAudit('UPDATE_INGREDIENT', 'ingredient', id, `Updated ${ingredients[index].name}`);
    return ingredients[index];
}

function inv_getIngredientById(id) {
    const ingredients = inv_getIngredients();
    return ingredients.find(i => i.id === id);
}

function inv_findIngredientByBarcode(barcode) {
    if (!barcode) return null;
    const ingredients = inv_getIngredients();
    return ingredients.find(i => i.barcode === barcode && !i.archived);
}

function inv_archiveIngredient(id, reason) {
    const ing = inv_getIngredientById(id);
    if (!ing) return null;
    
    // Check if ingredient is used in any recipes
    const recipes = inv_getRecipes();
    const isUsed = recipes.some(r => r.ingredients.some(i => i.ingredientId === id));
    if (isUsed) {
        throw new Error(`Cannot archive "${ing.name}" because it is used in recipes. Remove from recipes first.`);
    }
    
    return inv_updateIngredient(id, { archived: true, archivedReason: reason, archivedAt: new Date().toISOString() });
}

// ============================================================================
// STOCK LEVELS
// ============================================================================
function inv_getStockLevels() {
    try {
        const data = localStorage.getItem(INV_STOCK_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Error loading stock levels:', e);
        return {};
    }
}

function inv_saveStockLevels(stock) {
    localStorage.setItem(INV_STOCK_KEY, JSON.stringify(stock));
}

function inv_initStockForIngredient(ingredientId) {
    const stock = inv_getStockLevels();
    if (stock[ingredientId] === undefined) {
        stock[ingredientId] = 0;
        inv_saveStockLevels(stock);
    }
}

function inv_getStock(ingredientId) {
    const stock = inv_getStockLevels();
    return stock[ingredientId] !== undefined ? parseFloat(stock[ingredientId]) : 0;
}

function inv_setStock(ingredientId, qty) {
    const stock = inv_getStockLevels();
    stock[ingredientId] = Math.max(0, parseFloat(qty) || 0);
    inv_saveStockLevels(stock);
}

// ============================================================================
// STOCK MOVEMENTS (AUDIT TRAIL)
// ============================================================================
function inv_getMovements() {
    try {
        const data = localStorage.getItem(INV_MOVEMENTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading movements:', e);
        return [];
    }
}

function inv_saveMovements(movements) {
    localStorage.setItem(INV_MOVEMENTS_KEY, JSON.stringify(movements));
}

function inv_logMovement(ingredientId, delta, type, reason, userId, qtyBefore, qtyAfter) {
    const movements = inv_getMovements();
    const movement = {
        id: inv_generateId('MOV'),
        ingredientId,
        delta: parseFloat(delta),
        type: type,
        reason: reason || '',
        userId: userId || inv_getCurrentUser(),
        qtyBefore: parseFloat(qtyBefore),
        qtyAfter: parseFloat(qtyAfter),
        timestamp: new Date().toISOString()
    };
    movements.unshift(movement);
    
    if (movements.length > 10000) movements.splice(10000);
    inv_saveMovements(movements);
    inv_broadcastChange({ action: 'movement', entity: 'stock', ingredientId, delta });
}

// ============================================================================
// SAFE STOCK ADJUSTMENT WITH NEGATIVE PREVENTION
// ============================================================================
function inv_adjustStockWithSafety(ingredientId, delta, type, reason, userId) {
    const before = inv_getStock(ingredientId);
    const after = before + delta;
    
    if (after < 0) {
        const ing = inv_getIngredientById(ingredientId);
        throw new Error(`Insufficient stock: ${ing?.name || 'Item'} has ${before} ${ing?.unit || 'units'}. Cannot deduct ${Math.abs(delta)}.`);
    }
    
    inv_setStock(ingredientId, after);
    inv_logMovement(ingredientId, delta, type, reason, userId, before, after);
    
    const ing = inv_getIngredientById(ingredientId);
    if (ing && after <= ing.minThreshold && after > 0) {
        inv_triggerLowStockAlert(ingredientId, ing.name, after, ing.minThreshold);
    }
    
    if (after === 0) {
        inv_triggerOutOfStockAlert(ingredientId, ing?.name);
    }
    
    return after;
}

function inv_triggerLowStockAlert(ingredientId, ingredientName, currentQty, threshold) {
    inv_logAudit('LOW_STOCK_ALERT', 'ingredient', ingredientId, `${ingredientName} is at ${currentQty} (threshold: ${threshold})`);
    
    if (typeof showToast === 'function') {
        showToast(`⚠️ Low stock: ${ingredientName} (${currentQty} left)`, 'warning');
    }
    
    if (typeof app !== 'undefined') {
        if (!app.inventoryAlerts) app.inventoryAlerts = [];
        app.inventoryAlerts.push({
            id: inv_generateId('ALERT'),
            type: 'low_stock',
            ingredientId,
            ingredientName,
            currentQty,
            threshold,
            timestamp: new Date().toISOString(),
            resolved: false
        });
        localStorage.setItem('pos_inventory_alerts', JSON.stringify(app.inventoryAlerts));
    }
}

function inv_triggerOutOfStockAlert(ingredientId, ingredientName) {
    inv_logAudit('OUT_OF_STOCK_ALERT', 'ingredient', ingredientId, `${ingredientName} is out of stock!`);
    
    if (typeof showToast === 'function') {
        showToast(`🚨 OUT OF STOCK: ${ingredientName}`, 'danger');
    }
    
    if (typeof app !== 'undefined') {
        if (!app.inventoryAlerts) app.inventoryAlerts = [];
        app.inventoryAlerts.push({
            id: inv_generateId('ALERT'),
            type: 'out_of_stock',
            ingredientId,
            ingredientName,
            timestamp: new Date().toISOString(),
            resolved: false
        });
        localStorage.setItem('pos_inventory_alerts', JSON.stringify(app.inventoryAlerts));
    }
}

// ============================================================================
// RECIPES (BOM)
// ============================================================================
function inv_getRecipes() {
    try {
        const data = localStorage.getItem(INV_RECIPES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading recipes:', e);
        return [];
    }
}

function inv_saveRecipes(recipes) {
    localStorage.setItem(INV_RECIPES_KEY, JSON.stringify(recipes));
    inv_broadcastChange({ action: 'save', entity: 'recipes' });
}

function inv_getRecipeForMenuItem(menuItemId) {
    const recipes = inv_getRecipes();
    return recipes.find(r => r.menuItemId === menuItemId);
}

function inv_saveRecipe(menuItemId, ingredients) {
    const recipes = inv_getRecipes();
    const existingIndex = recipes.findIndex(r => r.menuItemId === menuItemId);
    
    const recipe = {
        menuItemId,
        menuItemName: '',
        ingredients: ingredients.map(ing => ({
            ingredientId: ing.ingredientId,
            quantity: parseFloat(ing.quantity) || 0,
            unit: ing.unit || ''
        })).filter(ing => ing.ingredientId && ing.quantity > 0)
    };
    
    if (existingIndex !== -1) {
        recipes[existingIndex] = recipe;
    } else {
        recipes.push(recipe);
    }
    
    inv_saveRecipes(recipes);
    inv_logAudit('SAVE_RECIPE', 'recipe', menuItemId, `Saved recipe with ${recipe.ingredients.length} ingredients`);
    return recipe;
}

function inv_deleteRecipe(menuItemId) {
    let recipes = inv_getRecipes();
    recipes = recipes.filter(r => r.menuItemId !== menuItemId);
    inv_saveRecipes(recipes);
    inv_logAudit('DELETE_RECIPE', 'recipe', menuItemId, 'Deleted recipe');
}

// ============================================================================
// SUPPLIERS
// ============================================================================
function inv_getSuppliers() {
    try {
        const data = localStorage.getItem(INV_SUPPLIERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading suppliers:', e);
        return [];
    }
}

function inv_saveSuppliers(suppliers) {
    localStorage.setItem(INV_SUPPLIERS_KEY, JSON.stringify(suppliers));
    inv_broadcastChange({ action: 'save', entity: 'suppliers' });
}

function inv_addSupplier(supplier) {
    const suppliers = inv_getSuppliers();
    const newSupplier = {
        id: inv_generateId('SUP'),
        name: supplier.name,
        contact: supplier.contact || '',
        address: supplier.address || '',
        paymentTerms: supplier.paymentTerms || 'Cash',
        notes: supplier.notes || '',
        archived: false,
        priceHistory: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const existing = suppliers.find(s => s.name.toLowerCase() === newSupplier.name.toLowerCase() && !s.archived);
    if (existing) {
        throw new Error(`Supplier "${supplier.name}" already exists`);
    }
    
    suppliers.push(newSupplier);
    inv_saveSuppliers(suppliers);
    inv_logAudit('ADD_SUPPLIER', 'supplier', newSupplier.id, `Added ${newSupplier.name}`);
    return newSupplier;
}

function inv_updateSupplier(id, updates) {
    const suppliers = inv_getSuppliers();
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    if (updates.name) {
        const existing = suppliers.find(s => s.id !== id && s.name.toLowerCase() === updates.name.toLowerCase() && !s.archived);
        if (existing) {
            throw new Error(`Supplier "${updates.name}" already exists`);
        }
    }
    
    suppliers[index] = {
        ...suppliers[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    inv_saveSuppliers(suppliers);
    inv_logAudit('UPDATE_SUPPLIER', 'supplier', id, `Updated ${suppliers[index].name}`);
    return suppliers[index];
}

function inv_getSupplierById(id) {
    const suppliers = inv_getSuppliers();
    return suppliers.find(s => s.id === id);
}

function inv_recordSupplierPrice(supplierId, ingredientId, price) {
    const suppliers = inv_getSuppliers();
    const index = suppliers.findIndex(s => s.id === supplierId);
    if (index === -1) return;
    
    if (!suppliers[index].priceHistory) suppliers[index].priceHistory = {};
    if (!suppliers[index].priceHistory[ingredientId]) suppliers[index].priceHistory[ingredientId] = [];
    
    suppliers[index].priceHistory[ingredientId].unshift({ price: parseFloat(price), timestamp: new Date().toISOString() });
    
    if (suppliers[index].priceHistory[ingredientId].length > 12) {
        suppliers[index].priceHistory[ingredientId].pop();
    }
    
    inv_saveSuppliers(suppliers);
}

function inv_getSupplierPriceHistory(supplierId, ingredientId) {
    const supplier = inv_getSupplierById(supplierId);
    if (!supplier || !supplier.priceHistory) return [];
    return supplier.priceHistory[ingredientId] || [];
}

// ============================================================================
// PURCHASE ORDERS
// ============================================================================
function inv_getPurchases() {
    try {
        const data = localStorage.getItem(INV_PURCHASES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading purchases:', e);
        return [];
    }
}

function inv_savePurchases(purchases) {
    localStorage.setItem(INV_PURCHASES_KEY, JSON.stringify(purchases));
    inv_broadcastChange({ action: 'save', entity: 'purchases' });
}

function inv_createPurchaseOrder(purchaseData) {
    const purchases = inv_getPurchases();
    const newOrder = {
        id: inv_generateId('PO'),
        supplierId: purchaseData.supplierId,
        supplierName: purchaseData.supplierName,
        date: purchaseData.date || new Date().toISOString().split('T')[0],
        invoiceNo: purchaseData.invoiceNo || '',
        items: purchaseData.items.map(item => ({
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            qty: parseFloat(item.qty),
            unit: item.unit,
            unitPrice: parseFloat(item.unitPrice),
            total: parseFloat(item.qty) * parseFloat(item.unitPrice)
        })),
        totalAmount: purchaseData.items.reduce((sum, item) => sum + (parseFloat(item.qty) * parseFloat(item.unitPrice)), 0),
        status: 'pending',
        createdBy: inv_getCurrentUser(),
        createdById: inv_getCurrentUserId(),
        createdAt: new Date().toISOString(),
        approvedBy: null,
        approvedById: null,
        approvedAt: null,
        notes: purchaseData.notes || ''
    };
    
    purchases.unshift(newOrder);
    inv_savePurchases(purchases);
    inv_logAudit('CREATE_PURCHASE', 'purchase', newOrder.id, `Created order for ${newOrder.supplierName} - ${newOrder.totalAmount}`);
    return newOrder;
}

function inv_approvePurchaseOrder(orderId, pin, userId) {
    const purchases = inv_getPurchases();
    const index = purchases.findIndex(p => p.id === orderId);
    if (index === -1) throw new Error('Purchase order not found');
    
    const order = purchases[index];
    if (order.status !== 'pending') throw new Error('Order already processed');
    
    order.status = 'approved';
    order.approvedBy = userId || inv_getCurrentUser();
    order.approvedById = inv_getCurrentUserId();
    order.approvedAt = new Date().toISOString();
    inv_savePurchases(purchases);
    
    for (const item of order.items) {
        inv_adjustStockWithSafety(item.ingredientId, item.qty, 'PURCHASE', `PO ${order.id}`, order.approvedBy);
        
        const ing = inv_getIngredientById(item.ingredientId);
        if (ing && item.unitPrice !== ing.costPerUnit) {
            inv_updateIngredient(item.ingredientId, { costPerUnit: item.unitPrice });
        }
        
        inv_recordSupplierPrice(order.supplierId, item.ingredientId, item.unitPrice);
    }
    
    inv_logAudit('APPROVE_PURCHASE', 'purchase', orderId, `Approved by ${order.approvedBy}`);
    return order;
}

function inv_rejectPurchaseOrder(orderId, reason, userId) {
    const purchases = inv_getPurchases();
    const index = purchases.findIndex(p => p.id === orderId);
    if (index === -1) return;
    
    purchases[index].status = 'rejected';
    purchases[index].rejectedBy = userId || inv_getCurrentUser();
    purchases[index].rejectedById = inv_getCurrentUserId();
    purchases[index].rejectedAt = new Date().toISOString();
    purchases[index].rejectionReason = reason;
    inv_savePurchases(purchases);
    inv_logAudit('REJECT_PURCHASE', 'purchase', orderId, `Rejected: ${reason}`);
}

// ============================================================================
// WASTAGE MANAGEMENT
// ============================================================================
function inv_getWastage() {
    try {
        const data = localStorage.getItem(INV_WASTAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading wastage:', e);
        return [];
    }
}

function inv_saveWastage(wastage) {
    localStorage.setItem(INV_WASTAGE_KEY, JSON.stringify(wastage));
    inv_broadcastChange({ action: 'save', entity: 'wastage' });
}

function inv_declareWastage(declaration) {
    const wastageList = inv_getWastage();
    const newWastage = {
        id: inv_generateId('WST'),
        ingredientId: declaration.ingredientId,
        ingredientName: declaration.ingredientName,
        qty: parseFloat(declaration.qty),
        reason: declaration.reason,
        notes: declaration.notes || '',
        declaredBy: inv_getCurrentUser(),
        declaredById: inv_getCurrentUserId(),
        declaredAt: new Date().toISOString(),
        status: 'pending',
        approvedBy: null,
        approvedById: null,
        approvedAt: null,
        rejectionReason: null
    };
    
    wastageList.unshift(newWastage);
    inv_saveWastage(wastageList);
    inv_logAudit('DECLARE_WASTAGE', 'wastage', newWastage.id, `${newWastage.qty} of ${newWastage.ingredientName} - ${newWastage.reason}`);
    return newWastage;
}

function inv_approveWastage(wastageId, pin, userId) {
    const wastageList = inv_getWastage();
    const index = wastageList.findIndex(w => w.id === wastageId);
    if (index === -1) throw new Error('Wastage record not found');
    
    const w = wastageList[index];
    if (w.status !== 'pending') throw new Error('Already processed');
    
    w.status = 'approved';
    w.approvedBy = userId || inv_getCurrentUser();
    w.approvedById = inv_getCurrentUserId();
    w.approvedAt = new Date().toISOString();
    inv_saveWastage(wastageList);
    
    inv_adjustStockWithSafety(w.ingredientId, -w.qty, 'WASTAGE', w.reason, w.approvedBy);
    inv_logAudit('APPROVE_WASTAGE', 'wastage', wastageId, `Approved by ${w.approvedBy}`);
    return w;
}

function inv_rejectWastage(wastageId, reason, userId) {
    const wastageList = inv_getWastage();
    const index = wastageList.findIndex(w => w.id === wastageId);
    if (index === -1) return;
    
    wastageList[index].status = 'rejected';
    wastageList[index].rejectedBy = userId || inv_getCurrentUser();
    wastageList[index].rejectedById = inv_getCurrentUserId();
    wastageList[index].rejectedAt = new Date().toISOString();
    wastageList[index].rejectionReason = reason;
    inv_saveWastage(wastageList);
    inv_logAudit('REJECT_WASTAGE', 'wastage', wastageId, `Rejected: ${reason}`);
}

// ============================================================================
// PHYSICAL COUNTS & VARIANCE
// ============================================================================
function inv_getPhysicalCounts() {
    try {
        const data = localStorage.getItem(INV_PHYSICAL_COUNTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading physical counts:', e);
        return [];
    }
}

function inv_savePhysicalCounts(counts) {
    localStorage.setItem(INV_PHYSICAL_COUNTS_KEY, JSON.stringify(counts));
}

function inv_getVarianceReports() {
    try {
        const data = localStorage.getItem(INV_VARIANCE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading variance reports:', e);
        return [];
    }
}

function inv_saveVarianceReports(reports) {
    localStorage.setItem(INV_VARIANCE_KEY, JSON.stringify(reports));
}

function inv_startPhysicalCountSession() {
    const activeSession = inv_getPhysicalCounts().find(c => c.status === 'active');
    if (activeSession) {
        throw new Error('There is already an active count session. Please complete or cancel it first.');
    }
    
    const ingredients = inv_getIngredients().filter(i => !i.archived);
    const entries = {};
    
    for (const ing of ingredients) {
        entries[ing.id] = {
            ingredientId: ing.id,
            ingredientName: ing.name,
            unit: ing.unit,
            expectedQty: inv_getStock(ing.id),
            physicalQty: null,
            variance: null,
            variancePct: null,
            severity: null
        };
    }
    
    const session = {
        id: inv_generateId('COUNT'),
        startedAt: new Date().toISOString(),
        startedBy: inv_getCurrentUser(),
        startedById: inv_getCurrentUserId(),
        status: 'active',
        entries: entries,
        completedAt: null,
        completedBy: null
    };
    
    const counts = inv_getPhysicalCounts();
    counts.unshift(session);
    inv_savePhysicalCounts(counts);
    inv_logAudit('START_COUNT', 'physical_count', session.id, 'Started physical count session');
    return session;
}

function inv_saveCountEntry(sessionId, ingredientId, physicalQty) {
    const counts = inv_getPhysicalCounts();
    const sessionIndex = counts.findIndex(c => c.id === sessionId);
    if (sessionIndex === -1) throw new Error('Count session not found');
    
    const session = counts[sessionIndex];
    if (session.status !== 'active') throw new Error('Count session is not active');
    
    if (!session.entries[ingredientId]) {
        const ing = inv_getIngredientById(ingredientId);
        session.entries[ingredientId] = {
            ingredientId,
            ingredientName: ing?.name || 'Unknown',
            unit: ing?.unit || '',
            expectedQty: inv_getStock(ingredientId),
            physicalQty: null,
            variance: null,
            variancePct: null,
            severity: null
        };
    }
    
    session.entries[ingredientId].physicalQty = parseFloat(physicalQty);
    session.entries[ingredientId].variance = parseFloat(physicalQty) - session.entries[ingredientId].expectedQty;
    
    const expected = session.entries[ingredientId].expectedQty;
    if (expected > 0) {
        session.entries[ingredientId].variancePct = (session.entries[ingredientId].variance / expected) * 100;
    } else {
        session.entries[ingredientId].variancePct = session.entries[ingredientId].variance === 0 ? 0 : 100;
    }
    
    const variancePct = Math.abs(session.entries[ingredientId].variancePct);
    const settings = (typeof appSettings !== 'undefined' && appSettings.inventory) ? appSettings.inventory : { varianceWarningPct: 3, varianceCriticalPct: 10 };
    
    if (variancePct > settings.varianceCriticalPct) {
        session.entries[ingredientId].severity = 'CRITICAL';
    } else if (variancePct > settings.varianceWarningPct) {
        session.entries[ingredientId].severity = 'WARNING';
    } else {
        session.entries[ingredientId].severity = 'OK';
    }
    
    inv_savePhysicalCounts(counts);
    inv_logAudit('COUNT_ENTRY', 'physical_count', sessionId, `Recorded ${physicalQty} for ${session.entries[ingredientId].ingredientName}`);
}

function inv_submitPhysicalCountSession(sessionId, pin, userId) {
    const counts = inv_getPhysicalCounts();
    const sessionIndex = counts.findIndex(c => c.id === sessionId);
    if (sessionIndex === -1) throw new Error('Count session not found');
    
    const session = counts[sessionIndex];
    if (session.status !== 'active') throw new Error('Count session is not active');
    
    const results = [];
    let flaggedCount = 0;
    let criticalCount = 0;
    let totalGap = 0;
    
    for (const entry of Object.values(session.entries)) {
        if (entry.physicalQty !== null) {
            results.push(entry);
            if (entry.severity !== 'OK') flaggedCount++;
            if (entry.severity === 'CRITICAL') criticalCount++;
            totalGap += Math.abs(entry.variance * (inv_getIngredientById(entry.ingredientId)?.costPerUnit || 0));
            
            if (entry.variance !== 0) {
                inv_adjustStockWithSafety(entry.ingredientId, entry.variance, 'COUNT_CORRECTION', `Physical count correction from session ${sessionId}`, userId || inv_getCurrentUser());
            }
        }
    }
    
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.completedBy = userId || inv_getCurrentUser();
    session.completedById = inv_getCurrentUserId();
    inv_savePhysicalCounts(counts);
    
    const varianceReport = {
        id: inv_generateId('VAR'),
        countSessionId: sessionId,
        createdAt: new Date().toISOString(),
        createdBy: userId || inv_getCurrentUser(),
        results: results,
        flaggedCount: flaggedCount,
        criticalCount: criticalCount,
        totalGap: totalGap
    };
    
    const reports = inv_getVarianceReports();
    reports.unshift(varianceReport);
    inv_saveVarianceReports(reports);
    
    inv_logAudit('SUBMIT_COUNT', 'physical_count', sessionId, `Submitted with ${flaggedCount} flagged items, ${criticalCount} critical`);
    
    if (flaggedCount > 0 && typeof showToast === 'function') {
        showToast(`⚠️ Variance report generated: ${flaggedCount} items flagged (${criticalCount} critical)`, 'warning');
    }
    
    return varianceReport;
}

function inv_cancelPhysicalCountSession(sessionId, reason) {
    const counts = inv_getPhysicalCounts();
    const sessionIndex = counts.findIndex(c => c.id === sessionId);
    if (sessionIndex === -1) return;
    
    counts[sessionIndex].status = 'cancelled';
    counts[sessionIndex].cancelledAt = new Date().toISOString();
    counts[sessionIndex].cancelledBy = inv_getCurrentUser();
    counts[sessionIndex].cancellationReason = reason;
    inv_savePhysicalCounts(counts);
    inv_logAudit('CANCEL_COUNT', 'physical_count', sessionId, `Cancelled: ${reason || 'No reason provided'}`);
}

// ============================================================================
// AUDIT LOG
// ============================================================================
function inv_getAuditLog() {
    try {
        const data = localStorage.getItem(INV_AUDIT_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading audit log:', e);
        return [];
    }
}

function inv_saveAuditLog(log) {
    localStorage.setItem(INV_AUDIT_KEY, JSON.stringify(log));
}

function inv_logAudit(action, entity, entityId, details) {
    const log = inv_getAuditLog();
    const entry = {
        id: inv_generateId('AUD'),
        timestamp: new Date().toISOString(),
        user: inv_getCurrentUser(),
        userId: inv_getCurrentUserId(),
        action: action,
        entity: entity,
        entityId: entityId,
        details: details
    };
    log.unshift(entry);
    
    if (log.length > 5000) log.splice(5000);
    inv_saveAuditLog(log);
}

// ============================================================================
// EXPORT / IMPORT FUNCTIONALITY
// ============================================================================
function inv_exportInventoryData() {
    const data = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        ingredients: inv_getIngredients(),
        recipes: inv_getRecipes(),
        stock: inv_getStockLevels(),
        movements: inv_getMovements(),
        purchases: inv_getPurchases(),
        suppliers: inv_getSuppliers(),
        wastage: inv_getWastage(),
        physicalCounts: inv_getPhysicalCounts(),
        varianceReports: inv_getVarianceReports(),
        auditLog: inv_getAuditLog()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (typeof showToast === 'function') {
        showToast('Inventory data exported successfully');
    }
    
    inv_logAudit('EXPORT_DATA', 'system', 'all', 'Exported all inventory data');
}

function inv_importInventoryData(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.ingredients || !data.recipes) {
                throw new Error('Invalid backup file format');
            }
            
            if (typeof openConfirm === 'function') {
                openConfirm(
                    'Import Inventory Data',
                    `This will REPLACE all current inventory data with ${data.ingredients.length} ingredients, ` +
                    `${data.recipes.length} recipes, and ${data.suppliers?.length || 0} suppliers. Are you sure?`,
                    () => {
                        inv_saveIngredients(data.ingredients);
                        inv_saveRecipes(data.recipes);
                        inv_saveStockLevels(data.stock || {});
                        inv_saveMovements(data.movements || []);
                        inv_savePurchases(data.purchases || []);
                        inv_saveSuppliers(data.suppliers || []);
                        inv_saveWastage(data.wastage || []);
                        inv_savePhysicalCounts(data.physicalCounts || []);
                        inv_saveVarianceReports(data.varianceReports || []);
                        inv_saveAuditLog(data.auditLog || []);
                        
                        if (typeof showToast === 'function') {
                            showToast('Inventory data imported successfully');
                        }
                        
                        inv_logAudit('IMPORT_DATA', 'system', 'all', `Imported ${data.ingredients.length} ingredients, ${data.recipes.length} recipes`);
                        
                        if (typeof inv_renderActiveTab === 'function') {
                            inv_renderActiveTab();
                        }
                    }
                );
            } else {
                inv_saveIngredients(data.ingredients);
                inv_saveRecipes(data.recipes);
                inv_saveStockLevels(data.stock || {});
                inv_saveMovements(data.movements || []);
                inv_savePurchases(data.purchases || []);
                inv_saveSuppliers(data.suppliers || []);
                inv_saveWastage(data.wastage || []);
                inv_savePhysicalCounts(data.physicalCounts || []);
                inv_saveVarianceReports(data.varianceReports || []);
                inv_saveAuditLog(data.auditLog || []);
                alert('Inventory data imported successfully');
            }
        } catch (err) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Import Error', `Failed to import data: ${err.message}`);
            } else {
                alert(`Import Error: ${err.message}`);
            }
        }
    };
    reader.readAsText(file);
    fileInput.value = '';
}

// ============================================================================
// REAL-TIME SYNC (MULTI-TERMINAL)
// ============================================================================
let inv_syncInterval = null;

function inv_startSync(intervalSeconds = 30) {
    if (inv_syncInterval) clearInterval(inv_syncInterval);
    
    inv_syncInterval = setInterval(() => {
        inv_broadcastSync();
    }, intervalSeconds * 1000);
}

function inv_stopSync() {
    if (inv_syncInterval) {
        clearInterval(inv_syncInterval);
        inv_syncInterval = null;
    }
}

function inv_broadcastChange(data) {
    try {
        localStorage.setItem(INV_SYNC_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
        setTimeout(() => localStorage.removeItem(INV_SYNC_KEY), 100);
    } catch (e) {
        console.warn('Broadcast error:', e);
    }
}

function inv_broadcastSync() {
    inv_broadcastChange({ action: 'sync', timestamp: Date.now() });
}

window.addEventListener('storage', (e) => {
    if (e.key === INV_SYNC_KEY && e.newValue) {
        try {
            const broadcast = JSON.parse(e.newValue);
            if (broadcast && broadcast.data) {
                if (broadcast.data.action === 'sync') {
                    if (typeof inv_renderActiveTab === 'function') {
                        inv_renderActiveTab();
                    }
                    if (typeof showToast === 'function') {
                        showToast('Inventory data synced from another terminal', 'info');
                    }
                }
            }
        } catch (err) {
            console.error('Sync error:', err);
        }
    }
});

// ============================================================================
// ENRICHED DATA HELPERS
// ============================================================================
function inv_getEnrichedIngredients() {
    const ingredients = inv_getIngredients().filter(i => !i.archived);
    return ingredients.map(ing => {
        const currentQty = inv_getStock(ing.id);
        const status = currentQty <= ing.minThreshold ? 'low' : (currentQty === 0 ? 'critical' : 'ok');
        const value = currentQty * (ing.costPerUnit || 0);
        return { ...ing, currentQty, status, value };
    });
}

function inv_getLowStockItems() {
    return inv_getEnrichedIngredients().filter(i => i.status === 'low');
}

function inv_getCriticalStockItems() {
    return inv_getEnrichedIngredients().filter(i => i.currentQty === 0);
}

function inv_getTotalStockValue() {
    return inv_getEnrichedIngredients().reduce((sum, i) => sum + i.value, 0);
}

function inv_getTotalIngredientsCount() {
    return inv_getEnrichedIngredients().length;
}

// ============================================================================
// INITIALIZATION & MIGRATION
// ============================================================================
function inv_seedDefaultIngredients() {
    const ingredients = inv_getIngredients();
    if (ingredients.length === 0) {
        const defaults = [
            { name: 'Chicken', altName: 'مرغی', unit: 'kg', category: 'Meat', minThreshold: 5, costPerUnit: 550 },
            { name: 'Cooking Oil', altName: 'تیل', unit: 'L', category: 'Oils', minThreshold: 10, costPerUnit: 360 },
            { name: 'Spice Mix', altName: 'مصالحہ', unit: 'kg', category: 'Spices', minThreshold: 1, costPerUnit: 850 },
            { name: 'Tomatoes', altName: 'ٹماٹر', unit: 'kg', category: 'Vegetables', minThreshold: 3, costPerUnit: 80 },
            { name: 'Onions', altName: 'پیاز', unit: 'kg', category: 'Vegetables', minThreshold: 3, costPerUnit: 60 },
            { name: 'Ginger Garlic Paste', altName: 'ادرک لہسن', unit: 'kg', category: 'Spices', minThreshold: 1, costPerUnit: 400 },
            { name: 'Yogurt', altName: 'دہی', unit: 'kg', category: 'Dairy', minThreshold: 2, costPerUnit: 280 },
            { name: 'Cheese', altName: 'پنیر', unit: 'kg', category: 'Dairy', minThreshold: 1, costPerUnit: 1200 }
        ];
        
        for (const def of defaults) {
            try {
                inv_addIngredient(def);
            } catch (e) {
                console.warn('Error seeding default ingredient:', e);
            }
        }
    }
}

function inv_migrateToIndexedDB() {
    if (localStorage.getItem(INV_MIGRATED_KEY)) return;
    
    console.log('Starting migration to IndexedDB...');
    const keys = [
        INV_INGREDIENTS_KEY, INV_RECIPES_KEY, INV_STOCK_KEY, INV_MOVEMENTS_KEY,
        INV_PURCHASES_KEY, INV_SUPPLIERS_KEY, INV_WASTAGE_KEY, INV_PHYSICAL_COUNTS_KEY,
        INV_VARIANCE_KEY, INV_AUDIT_KEY
    ];
    
    for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data && typeof Dexie !== 'undefined' && window.inventoryDB) {
            try {
                const parsed = JSON.parse(data);
                const tableName = key.replace('inv_', '');
                if (window.inventoryDB[tableName] && parsed.length) {
                    window.inventoryDB[tableName].bulkAdd(parsed).catch(e => console.warn(`Migration error for ${tableName}:`, e));
                }
            } catch (e) {
                console.warn(`Error migrating ${key}:`, e);
            }
        }
    }
    
    localStorage.setItem(INV_MIGRATED_KEY, 'true');
    console.log('Migration to IndexedDB completed');
}

if (typeof window !== 'undefined') {
    window.inv_getIngredients = inv_getIngredients;
    window.inv_saveIngredients = inv_saveIngredients;
    window.inv_addIngredient = inv_addIngredient;
    window.inv_updateIngredient = inv_updateIngredient;
    window.inv_getIngredientById = inv_getIngredientById;
    window.inv_findIngredientByBarcode = inv_findIngredientByBarcode;
    window.inv_archiveIngredient = inv_archiveIngredient;
    window.inv_getStock = inv_getStock;
    window.inv_setStock = inv_setStock;
    window.inv_adjustStockWithSafety = inv_adjustStockWithSafety;
    window.inv_logMovement = inv_logMovement;
    window.inv_getMovements = inv_getMovements;
    window.inv_getRecipes = inv_getRecipes;
    window.inv_saveRecipe = inv_saveRecipe;
    window.inv_getRecipeForMenuItem = inv_getRecipeForMenuItem;
    window.inv_deleteRecipe = inv_deleteRecipe;
    window.inv_getSuppliers = inv_getSuppliers;
    window.inv_addSupplier = inv_addSupplier;
    window.inv_updateSupplier = inv_updateSupplier;
    window.inv_getSupplierById = inv_getSupplierById;
    window.inv_recordSupplierPrice = inv_recordSupplierPrice;
    window.inv_getPurchases = inv_getPurchases;
    window.inv_createPurchaseOrder = inv_createPurchaseOrder;
    window.inv_approvePurchaseOrder = inv_approvePurchaseOrder;
    window.inv_rejectPurchaseOrder = inv_rejectPurchaseOrder;
    window.inv_getWastage = inv_getWastage;
    window.inv_declareWastage = inv_declareWastage;
    window.inv_approveWastage = inv_approveWastage;
    window.inv_rejectWastage = inv_rejectWastage;
    window.inv_startPhysicalCountSession = inv_startPhysicalCountSession;
    window.inv_saveCountEntry = inv_saveCountEntry;
    window.inv_submitPhysicalCountSession = inv_submitPhysicalCountSession;
    window.inv_cancelPhysicalCountSession = inv_cancelPhysicalCountSession;
    window.inv_getPhysicalCounts = inv_getPhysicalCounts;
    window.inv_getVarianceReports = inv_getVarianceReports;
    window.inv_getAuditLog = inv_getAuditLog;
    window.inv_logAudit = inv_logAudit;
    window.inv_exportInventoryData = inv_exportInventoryData;
    window.inv_importInventoryData = inv_importInventoryData;
    window.inv_startSync = inv_startSync;
    window.inv_stopSync = inv_stopSync;
    window.inv_getEnrichedIngredients = inv_getEnrichedIngredients;
    window.inv_getLowStockItems = inv_getLowStockItems;
    window.inv_getCriticalStockItems = inv_getCriticalStockItems;
    window.inv_getTotalStockValue = inv_getTotalStockValue;
    window.inv_getTotalIngredientsCount = inv_getTotalIngredientsCount;
    window.inv_seedDefaultIngredients = inv_seedDefaultIngredients;
    window.inv_migrateToIndexedDB = inv_migrateToIndexedDB;
    window.inv_generateId = inv_generateId;
    window.inv_getCurrentUser = inv_getCurrentUser;
}

if (typeof inv_seedDefaultIngredients === 'function') {
    inv_seedDefaultIngredients();
}