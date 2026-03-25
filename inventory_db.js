// inventory_db.js – Dexie.js IndexedDB Storage for Inventory Management
// Version: 2.0 – Fully integrated with all inventory features

// ============================================================================
// DATABASE SETUP
// ============================================================================
class InventoryDatabase extends Dexie {
    constructor() {
        super('InventoryDB');

        // Define version 1 schema
        this.version(1).stores({
            ingredients: 'id, name, category, archived, createdAt',
            recipes: 'menuItemId',
            stock: 'ingredientId',
            movements: 'id, ingredientId, type, timestamp',
            purchases: 'id, supplierId, status, createdAt',
            suppliers: 'id, name, archived',
            wastage: 'id, ingredientId, status, declaredAt',
            physicalCounts: 'id, status, startedAt',
            varianceReports: 'id, createdAt',
            auditLog: 'id, user, action, timestamp'
        });

        // Define tables for easy access
        this.ingredients = this.table('ingredients');
        this.recipes = this.table('recipes');
        this.stock = this.table('stock');
        this.movements = this.table('movements');
        this.purchases = this.table('purchases');
        this.suppliers = this.table('suppliers');
        this.wastage = this.table('wastage');
        this.physicalCounts = this.table('physicalCounts');
        this.varianceReports = this.table('varianceReports');
        this.auditLog = this.table('auditLog');
    }
}

// Global instance
let inventoryDB = null;

// ============================================================================
// INITIALIZATION & MIGRATION
// ============================================================================
async function initInventoryDB() {
    if (typeof Dexie === 'undefined') {
        console.error('Dexie.js not loaded. Inventory will use localStorage fallback.');
        return false;
    }
    inventoryDB = new InventoryDatabase();
    await inventoryDB.open();
    console.log('InventoryDB opened successfully');
    return true;
}

async function migrateFromLocalStorage() {
    if (!inventoryDB) {
        await initInventoryDB();
    }
    if (!inventoryDB) return;

    const migratedFlag = localStorage.getItem('inv_migrated_to_indexeddb');
    if (migratedFlag === 'true') return;

    console.log('Starting migration from localStorage to IndexedDB...');

    const keys = [
        { key: 'inv_ingredients', table: 'ingredients' },
        { key: 'inv_recipes', table: 'recipes' },
        { key: 'inv_stock', table: 'stock' },
        { key: 'inv_movements', table: 'movements' },
        { key: 'inv_purchases', table: 'purchases' },
        { key: 'inv_suppliers', table: 'suppliers' },
        { key: 'inv_wastage', table: 'wastage' },
        { key: 'inv_physical_counts', table: 'physicalCounts' },
        { key: 'inv_variance_reports', table: 'varianceReports' },
        { key: 'inv_audit', table: 'auditLog' }
    ];

    for (const { key, table } of keys) {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.length && parsed.length > 0) {
                    await inventoryDB[table].bulkAdd(parsed);
                    console.log(`Migrated ${parsed.length} records to ${table}`);
                }
            } catch (e) {
                console.error(`Error migrating ${key}:`, e);
            }
        }
    }

    // For stock, it's an object, not array; handle separately
    const stockData = localStorage.getItem('inv_stock');
    if (stockData) {
        try {
            const stockObj = JSON.parse(stockData);
            const stockItems = Object.entries(stockObj).map(([ingredientId, qty]) => ({ ingredientId, qty }));
            if (stockItems.length) {
                await inventoryDB.stock.bulkAdd(stockItems);
                console.log(`Migrated ${stockItems.length} stock records`);
            }
        } catch (e) {
            console.error('Error migrating stock:', e);
        }
    }

    localStorage.setItem('inv_migrated_to_indexeddb', 'true');
    console.log('Migration complete!');
}

// ============================================================================
// DATABASE ACCESS FUNCTIONS (Wrapper for inventory_data.js)
// ============================================================================
async function inv_db_getIngredients() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.ingredients.where('archived').equals(false).toArray();
}

async function inv_db_getAllIngredients() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.ingredients.toArray();
}

async function inv_db_addIngredient(ingredient) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) throw new Error('Database not available');
    const id = ingredient.id || inv_generateId('ING');
    const newIngredient = {
        ...ingredient,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    await inventoryDB.ingredients.add(newIngredient);
    // Also initialize stock
    await inv_db_initStockForIngredient(id, ingredient.currentQty || 0);
    return newIngredient;
}

async function inv_db_updateIngredient(id, updates) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return null;
    await inventoryDB.ingredients.update(id, { ...updates, updatedAt: new Date().toISOString() });
    return await inventoryDB.ingredients.get(id);
}

async function inv_db_getIngredientById(id) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return null;
    return await inventoryDB.ingredients.get(id);
}

async function inv_db_findIngredientByBarcode(barcode) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return null;
    return await inventoryDB.ingredients.where('barcode').equals(barcode).and(i => !i.archived).first();
}

async function inv_db_archiveIngredient(id, reason) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return null;
    await inventoryDB.ingredients.update(id, { archived: true, archivedReason: reason, archivedAt: new Date().toISOString() });
    return await inventoryDB.ingredients.get(id);
}

// Stock
async function inv_db_getStock(ingredientId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return 0;
    const record = await inventoryDB.stock.get(ingredientId);
    return record ? record.qty : 0;
}

async function inv_db_setStock(ingredientId, qty) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    await inventoryDB.stock.put({ ingredientId, qty });
}

async function inv_db_initStockForIngredient(ingredientId, initialQty = 0) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    const exists = await inventoryDB.stock.get(ingredientId);
    if (!exists) {
        await inventoryDB.stock.add({ ingredientId, qty: initialQty });
    }
}

async function inv_db_adjustStock(ingredientId, delta, type, reason, userId) {
    const before = await inv_db_getStock(ingredientId);
    const after = Math.max(0, before + delta);
    await inv_db_setStock(ingredientId, after);
    await inv_db_logMovement(ingredientId, delta, type, reason, userId, before, after);
    return after;
}

// Movements
async function inv_db_logMovement(ingredientId, delta, type, reason, userId, qtyBefore, qtyAfter) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    const movement = {
        id: inv_generateId('MOV'),
        ingredientId,
        delta,
        type,
        reason,
        userId,
        qtyBefore,
        qtyAfter,
        timestamp: new Date().toISOString()
    };
    await inventoryDB.movements.add(movement);
}

async function inv_db_getMovements(ingredientId, limit = 100) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    let query = inventoryDB.movements.orderBy('timestamp').reverse();
    if (ingredientId) {
        query = query.filter(m => m.ingredientId === ingredientId);
    }
    return await query.limit(limit).toArray();
}

// Recipes
async function inv_db_getRecipes() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.recipes.toArray();
}

async function inv_db_getRecipeForMenuItem(menuItemId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return null;
    return await inventoryDB.recipes.get(menuItemId);
}

async function inv_db_saveRecipe(menuItemId, ingredients) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return null;
    const recipe = {
        menuItemId,
        menuItemName: '', // can be filled later
        ingredients,
        updatedAt: new Date().toISOString()
    };
    await inventoryDB.recipes.put(recipe);
    return recipe;
}

async function inv_db_deleteRecipe(menuItemId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    await inventoryDB.recipes.delete(menuItemId);
}

// Suppliers
async function inv_db_getSuppliers() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.suppliers.where('archived').equals(false).toArray();
}

async function inv_db_addSupplier(supplier) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) throw new Error('Database not available');
    const id = inv_generateId('SUP');
    const newSupplier = {
        ...supplier,
        id,
        archived: false,
        priceHistory: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    await inventoryDB.suppliers.add(newSupplier);
    return newSupplier;
}

async function inv_db_updateSupplier(id, updates) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return null;
    await inventoryDB.suppliers.update(id, { ...updates, updatedAt: new Date().toISOString() });
    return await inventoryDB.suppliers.get(id);
}

async function inv_db_getSupplierById(id) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return null;
    return await inventoryDB.suppliers.get(id);
}

// Purchases
async function inv_db_getPurchases() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.purchases.orderBy('createdAt').reverse().toArray();
}

async function inv_db_createPurchaseOrder(purchaseData) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) throw new Error('Database not available');
    const id = inv_generateId('PO');
    const order = {
        ...purchaseData,
        id,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    await inventoryDB.purchases.add(order);
    return order;
}

async function inv_db_approvePurchaseOrder(orderId, userId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) throw new Error('Database not available');
    await inventoryDB.purchases.update(orderId, { status: 'approved', approvedBy: userId, approvedAt: new Date().toISOString() });
    const order = await inventoryDB.purchases.get(orderId);
    // Update stock for each item
    for (const item of order.items) {
        await inv_db_adjustStock(item.ingredientId, item.qty, 'PURCHASE', `PO ${orderId}`, userId);
        // Optionally update ingredient cost
        const ing = await inv_db_getIngredientById(item.ingredientId);
        if (ing && item.unitPrice !== ing.costPerUnit) {
            await inv_db_updateIngredient(item.ingredientId, { costPerUnit: item.unitPrice });
        }
        // Record price history
        await inv_db_recordSupplierPrice(order.supplierId, item.ingredientId, item.unitPrice);
    }
    return order;
}

async function inv_db_rejectPurchaseOrder(orderId, reason, userId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    await inventoryDB.purchases.update(orderId, { status: 'rejected', rejectedBy: userId, rejectedAt: new Date().toISOString(), rejectionReason: reason });
}

// Wastage
async function inv_db_getWastage() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.wastage.orderBy('declaredAt').reverse().toArray();
}

async function inv_db_declareWastage(declaration) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) throw new Error('Database not available');
    const id = inv_generateId('WST');
    const wastage = {
        ...declaration,
        id,
        status: 'pending',
        declaredAt: new Date().toISOString()
    };
    await inventoryDB.wastage.add(wastage);
    return wastage;
}

async function inv_db_approveWastage(wastageId, userId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) throw new Error('Database not available');
    await inventoryDB.wastage.update(wastageId, { status: 'approved', approvedBy: userId, approvedAt: new Date().toISOString() });
    const wastage = await inventoryDB.wastage.get(wastageId);
    await inv_db_adjustStock(wastage.ingredientId, -wastage.qty, 'WASTAGE', wastage.reason, userId);
    return wastage;
}

async function inv_db_rejectWastage(wastageId, reason, userId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    await inventoryDB.wastage.update(wastageId, { status: 'rejected', rejectedBy: userId, rejectedAt: new Date().toISOString(), rejectionReason: reason });
}

// Physical Counts
async function inv_db_getPhysicalCounts() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.physicalCounts.orderBy('startedAt').reverse().toArray();
}

async function inv_db_startPhysicalCountSession(userId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) throw new Error('Database not available');
    const id = inv_generateId('COUNT');
    const session = {
        id,
        startedAt: new Date().toISOString(),
        startedBy: userId,
        status: 'active',
        entries: {}
    };
    await inventoryDB.physicalCounts.add(session);
    return session;
}

async function inv_db_saveCountEntry(sessionId, ingredientId, physicalQty) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    const session = await inventoryDB.physicalCounts.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'active') throw new Error('Session not active');
    session.entries[ingredientId] = {
        ingredientId,
        physicalQty,
        timestamp: new Date().toISOString()
    };
    await inventoryDB.physicalCounts.update(sessionId, { entries: session.entries });
}

async function inv_db_submitPhysicalCountSession(sessionId, userId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) throw new Error('Database not available');
    const session = await inventoryDB.physicalCounts.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'active') throw new Error('Session not active');
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.completedBy = userId;
    await inventoryDB.physicalCounts.update(sessionId, session);
    // Generate variance report
    const ingredients = await inv_db_getAllIngredients();
    const results = [];
    let totalGap = 0;
    for (const ing of ingredients) {
        const expected = await inv_db_getStock(ing.id);
        const physical = session.entries[ing.id]?.physicalQty;
        if (physical !== undefined) {
            const variance = physical - expected;
            const variancePct = expected ? (variance / expected) * 100 : (physical ? 100 : 0);
            const severity = Math.abs(variancePct) > 10 ? 'CRITICAL' : (Math.abs(variancePct) > 3 ? 'WARNING' : 'OK');
            results.push({
                ingredientId: ing.id,
                ingredientName: ing.name,
                unit: ing.unit,
                expected,
                physical,
                variance,
                variancePct,
                severity
            });
            totalGap += Math.abs(variance) * (ing.costPerUnit || 0);
            if (variance !== 0) {
                await inv_db_adjustStock(ing.id, variance, 'COUNT_CORRECTION', `Physical count from session ${sessionId}`, userId);
            }
        }
    }
    const report = {
        id: inv_generateId('VAR'),
        countSessionId: sessionId,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        results,
        totalGap,
        flaggedCount: results.filter(r => r.severity !== 'OK').length,
        criticalCount: results.filter(r => r.severity === 'CRITICAL').length
    };
    await inventoryDB.varianceReports.add(report);
    return report;
}

// Variance Reports
async function inv_db_getVarianceReports() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.varianceReports.orderBy('createdAt').reverse().toArray();
}

// Audit Log
async function inv_db_logAudit(action, entity, entityId, details, userId) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    const log = {
        id: inv_generateId('AUD'),
        timestamp: new Date().toISOString(),
        user: userId || inv_getCurrentUser(),
        action,
        entity,
        entityId,
        details
    };
    await inventoryDB.auditLog.add(log);
}

async function inv_db_getAuditLog() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return [];
    return await inventoryDB.auditLog.orderBy('timestamp').reverse().toArray();
}

// Supplier price history (stored as part of supplier record)
async function inv_db_recordSupplierPrice(supplierId, ingredientId, price) {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    const supplier = await inventoryDB.suppliers.get(supplierId);
    if (!supplier) return;
    if (!supplier.priceHistory) supplier.priceHistory = {};
    if (!supplier.priceHistory[ingredientId]) supplier.priceHistory[ingredientId] = [];
    supplier.priceHistory[ingredientId].unshift({ price, timestamp: new Date().toISOString() });
    // Keep only last 12 entries
    if (supplier.priceHistory[ingredientId].length > 12) supplier.priceHistory[ingredientId].pop();
    await inventoryDB.suppliers.update(supplierId, { priceHistory: supplier.priceHistory });
}

// ============================================================================
// SEED DEFAULT DATA
// ============================================================================
async function inv_db_seedDefaultIngredients() {
    if (!inventoryDB) await initInventoryDB();
    if (!inventoryDB) return;
    const count = await inventoryDB.ingredients.count();
    if (count > 0) return;

    const defaultIngredients = [
        { name: 'Chicken', altName: 'مرغی', unit: 'kg', category: 'Meat', minThreshold: 5, costPerUnit: 550, barcode: '', notes: '' },
        { name: 'Cooking Oil', altName: 'تیل', unit: 'L', category: 'Oils', minThreshold: 10, costPerUnit: 360, barcode: '', notes: '' },
        { name: 'Spice Mix', altName: 'مصالحہ', unit: 'kg', category: 'Spices', minThreshold: 1, costPerUnit: 850, barcode: '', notes: '' },
        { name: 'Tomatoes', altName: 'ٹماٹر', unit: 'kg', category: 'Vegetables', minThreshold: 3, costPerUnit: 80, barcode: '', notes: '' },
        { name: 'Onions', altName: 'پیاز', unit: 'kg', category: 'Vegetables', minThreshold: 3, costPerUnit: 60, barcode: '', notes: '' },
        { name: 'Ginger Garlic Paste', altName: 'ادرک لہسن', unit: 'kg', category: 'Spices', minThreshold: 1, costPerUnit: 400, barcode: '', notes: '' },
        { name: 'Yogurt', altName: 'دہی', unit: 'kg', category: 'Dairy', minThreshold: 2, costPerUnit: 280, barcode: '', notes: '' },
        { name: 'Cheese', altName: 'پنیر', unit: 'kg', category: 'Dairy', minThreshold: 1, costPerUnit: 1200, barcode: '', notes: '' }
    ];

    for (const def of defaultIngredients) {
        await inv_db_addIngredient(def);
    }
    console.log('Default ingredients seeded in IndexedDB');
}

// ============================================================================
// EXPOSE GLOBALS
// ============================================================================
if (typeof window !== 'undefined') {
    window.inv_db_init = initInventoryDB;
    window.inv_db_migrate = migrateFromLocalStorage;
    window.inv_db_seed = inv_db_seedDefaultIngredients;
    window.inv_db_getIngredients = inv_db_getIngredients;
    window.inv_db_getAllIngredients = inv_db_getAllIngredients;
    window.inv_db_addIngredient = inv_db_addIngredient;
    window.inv_db_updateIngredient = inv_db_updateIngredient;
    window.inv_db_getIngredientById = inv_db_getIngredientById;
    window.inv_db_findIngredientByBarcode = inv_db_findIngredientByBarcode;
    window.inv_db_archiveIngredient = inv_db_archiveIngredient;
    window.inv_db_getStock = inv_db_getStock;
    window.inv_db_setStock = inv_db_setStock;
    window.inv_db_adjustStock = inv_db_adjustStock;
    window.inv_db_logMovement = inv_db_logMovement;
    window.inv_db_getMovements = inv_db_getMovements;
    window.inv_db_getRecipes = inv_db_getRecipes;
    window.inv_db_getRecipeForMenuItem = inv_db_getRecipeForMenuItem;
    window.inv_db_saveRecipe = inv_db_saveRecipe;
    window.inv_db_deleteRecipe = inv_db_deleteRecipe;
    window.inv_db_getSuppliers = inv_db_getSuppliers;
    window.inv_db_addSupplier = inv_db_addSupplier;
    window.inv_db_updateSupplier = inv_db_updateSupplier;
    window.inv_db_getSupplierById = inv_db_getSupplierById;
    window.inv_db_recordSupplierPrice = inv_db_recordSupplierPrice;
    window.inv_db_getPurchases = inv_db_getPurchases;
    window.inv_db_createPurchaseOrder = inv_db_createPurchaseOrder;
    window.inv_db_approvePurchaseOrder = inv_db_approvePurchaseOrder;
    window.inv_db_rejectPurchaseOrder = inv_db_rejectPurchaseOrder;
    window.inv_db_getWastage = inv_db_getWastage;
    window.inv_db_declareWastage = inv_db_declareWastage;
    window.inv_db_approveWastage = inv_db_approveWastage;
    window.inv_db_rejectWastage = inv_db_rejectWastage;
    window.inv_db_getPhysicalCounts = inv_db_getPhysicalCounts;
    window.inv_db_startPhysicalCountSession = inv_db_startPhysicalCountSession;
    window.inv_db_saveCountEntry = inv_db_saveCountEntry;
    window.inv_db_submitPhysicalCountSession = inv_db_submitPhysicalCountSession;
    window.inv_db_getVarianceReports = inv_db_getVarianceReports;
    window.inv_db_logAudit = inv_db_logAudit;
    window.inv_db_getAuditLog = inv_db_getAuditLog;
}

// ============================================================================
// AUTO-INIT ON LOAD (if Dexie available)
// ============================================================================
if (typeof Dexie !== 'undefined') {
    initInventoryDB().then(() => {
        migrateFromLocalStorage().then(() => {
            inv_db_seedDefaultIngredients();
        });
    });
}