// ============================================================
// INVENTORY MANAGER — Al-Madina Shinwari POS
// Pure Data Layer. 100% Offline. localStorage only.
// ============================================================
window.INV = window.INV || (function(){
'use strict';
const K={INGREDIENTS:'inv_i',RECIPES:'inv_r',STOCK:'inv_s',MOVEMENTS:'inv_mv',COUNT_SESSIONS:'inv_cs',VARIANCE_REPORTS:'inv_vr',PURCHASES:'inv_po',SUPPLIERS:'inv_sup',WASTAGE:'inv_w',OVERRIDES:'inv_ov',AUDIT:'inv_aud',SETTINGS:'inv_cfg',SEEDED:'inv_seeded_v4'};
const db={get:k=>{try{return JSON.parse(localStorage.getItem(k))||[];}catch{return[];}},obj:(k,d={})=>{try{return JSON.parse(localStorage.getItem(k))||d;}catch{return d;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){console.error(e);return false;}}};
const uid=p=>`${p||'ID'}-${Date.now()}-${Math.random().toString(36).substr(2,4).toUpperCase()}`;
const ts=()=>new Date().toISOString();
const fmt=n=>Number(n||0).toLocaleString('en-PK');
const cur=n=>`PKR ${fmt(Math.round(n||0))}`;
const fmtD=iso=>iso?new Date(iso).toLocaleString('en-PK',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const clamp=(v,min=0)=>Math.max(min,parseFloat(v)||0);
const todayStart=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};

function auditLog(action,entity,entityId,details='',userId='SYSTEM'){
  const list=db.get(K.AUDIT);
  list.unshift({id:uid('AUD'),ts:ts(),action,entity,entityId,details:String(details).substr(0,200),userId});
  if(list.length>3000)list.splice(3000);
  db.set(K.AUDIT,list);
}

const settings={
  _def:{restaurantName:'AL-MADINA SHINWARI',managerPin:'1234',varianceThreshold:3,lowStockThreshold:2,currency:'PKR',priceAnomalyPct:10,categories:['Meat','Spices','Dairy','Beverages','Vegetables','Bakery','Other']},
  get:()=>({...settings._def,...db.obj(K.SETTINGS,{})}),
  save:d=>{db.set(K.SETTINGS,{...settings.get(),...d});auditLog('SETTINGS','settings','global',JSON.stringify(d));},
  pin:()=>settings.get().managerPin||'1234',
  checkPin:p=>String(p).trim()===String(settings.pin()).trim(),
};

const ingredients={
  all:()=>db.get(K.INGREDIENTS),
  active:()=>ingredients.all().filter(i=>!i.archived),
  byId:id=>ingredients.all().find(i=>i.id===id),
  byCat:c=>ingredients.active().filter(i=>i.category===c),
  add:d=>{
    const list=ingredients.all();
    const item={id:uid('ING'),name:d.name,unit:d.unit,category:d.category,unitCost:clamp(d.unitCost),minThreshold:clamp(d.minThreshold,0)||2,notes:d.notes||'',archived:false,createdAt:ts(),updatedAt:ts()};
    list.push(item);db.set(K.INGREDIENTS,list);
    stock.init(item.id,clamp(d.openingQty));
    auditLog('ADD','ingredient',item.id,item.name);
    return item;
  },
  update:(id,d)=>{
    const list=ingredients.all();const i=list.findIndex(x=>x.id===id);if(i===-1)return null;
    list[i]={...list[i],...d,updatedAt:ts()};db.set(K.INGREDIENTS,list);
    auditLog('UPDATE','ingredient',id,list[i].name);return list[i];
  },
  archive:id=>{ingredients.update(id,{archived:true});auditLog('ARCHIVE','ingredient',id);},
  restore:id=>{ingredients.update(id,{archived:false});auditLog('RESTORE','ingredient',id);},
  archived:()=>ingredients.all().filter(i=>i.archived),
};

const stock={
  _m:()=>db.obj(K.STOCK,{}),_s:m=>db.set(K.STOCK,m),
  init:(id,qty=0)=>{const m=stock._m();if(m[id]===undefined){m[id]=qty;stock._s(m);}},
  qty:id=>{const m=stock._m();return m[id]!==undefined?parseFloat(m[id]):0;},
  set:(id,qty)=>{const m=stock._m();m[id]=clamp(qty);stock._s(m);},
  adjust:(id,delta,reason,userId='SYSTEM',type='MANUAL')=>{
    const m=stock._m();const prev=m[id]||0;const next=clamp(prev+parseFloat(delta));
    m[id]=next;stock._s(m);
    movements.log(id,delta,type,reason,userId,prev,next);
    return next;
  },
  totalValue:()=>{const m=stock._m();return ingredients.active().reduce((s,i)=>s+(m[i.id]||0)*(i.unitCost||0),0);},
  lowItems:()=>{const m=stock._m();const cfg=settings.get();return ingredients.active().filter(i=>(m[i.id]||0)<=(i.minThreshold||cfg.lowStockThreshold));},
  enriched:()=>{
    const m=stock._m();const cfg=settings.get();
    return ingredients.active().map(i=>{
      const qty=parseFloat(m[i.id]||0),min=parseFloat(i.minThreshold||cfg.lowStockThreshold);
      const status=qty===0?'empty':qty<=min?'critical':qty<=min*1.5?'low':'ok';
      return{...i,currentQty:qty,status,value:qty*(i.unitCost||0)};
    });
  },
};

const movements={
  all:()=>db.get(K.MOVEMENTS),
  log:(ingId,delta,type,reason,userId,prev,next)=>{
    const list=movements.all();
    const e={id:uid('MOV'),ingId,delta:parseFloat(delta),type,reason:String(reason).substr(0,120),userId,prev:parseFloat(prev),next:parseFloat(next),ts:ts()};
    list.unshift(e);if(list.length>10000)list.splice(10000);db.set(K.MOVEMENTS,list);return e;
  },
  forIng:(id,lim=60)=>movements.all().filter(m=>m.ingId===id).slice(0,lim),
  inRange:(from,to)=>movements.all().filter(m=>m.ts>=from&&m.ts<=to),
  today:()=>movements.all().filter(m=>new Date(m.ts)>=todayStart()),
  byType:(type,days=30)=>{const c=new Date();c.setDate(c.getDate()-days);return movements.all().filter(m=>m.type===type&&new Date(m.ts)>=c);},
};

const recipes={
  all:()=>db.get(K.RECIPES),
  forItem:id=>recipes.all().filter(r=>r.menuItemId===id),
  save:(menuItemId,menuItemName,menuCategory,lines)=>{
    const cleaned=recipes.all().filter(r=>r.menuItemId!==menuItemId);
    const newLines=lines.filter(l=>l.ingId&&l.qty>0).map(l=>({id:uid('RCP'),menuItemId,menuItemName,menuCategory,ingId:l.ingId,qty:clamp(l.qty),unit:l.unit,yieldFactor:clamp(l.yieldFactor)||1,updatedAt:ts()}));
    db.set(K.RECIPES,[...cleaned,...newLines]);
    auditLog('SAVE_RECIPE','recipe',menuItemId,menuItemName);return newLines;
  },
  delete:id=>{db.set(K.RECIPES,recipes.all().filter(r=>r.menuItemId!==id));auditLog('DELETE_RECIPE','recipe',id);},
  cost:id=>recipes.forItem(id).reduce((s,r)=>{const i=ingredients.byId(r.ingId);return s+r.qty*(i?i.unitCost||0:0);},0),
  menuItems:()=>{
    const map={};
    recipes.all().forEach(r=>{if(!map[r.menuItemId])map[r.menuItemId]={menuItemId:r.menuItemId,menuItemName:r.menuItemName,menuCategory:r.menuCategory,lines:0};map[r.menuItemId].lines++;});
    return Object.values(map).map(m=>({...m,cost:recipes.cost(m.menuItemId)}));
  },
  deductForSale:(menuItemId,qty=1,userId='POS')=>{
    recipes.forItem(menuItemId).forEach(r=>{stock.adjust(r.ingId,-(r.qty*qty/(r.yieldFactor||1)),`SALE:${menuItemId}`,userId,'SALE');});
  },
};

const counts={
  all:()=>db.get(K.COUNT_SESSIONS),
  active:()=>counts.all().find(c=>c.status==='active'),
  byId:id=>counts.all().find(c=>c.id===id),
  start:(userId='MANAGER')=>{
    if(counts.active())throw new Error('A count session is already active. Complete or cancel it first.');
    const s={id:uid('CNT'),startedAt:ts(),startedBy:userId,status:'active',entries:{}};
    const list=counts.all();list.unshift(s);db.set(K.COUNT_SESSIONS,list);
    auditLog('START_COUNT','count',s.id,`Started by ${userId}`);return s;
  },
  entry:(sessionId,ingId,qty)=>{
    const list=counts.all();const i=list.findIndex(c=>c.id===sessionId);
    if(i===-1)return;list[i].entries[ingId]=clamp(qty);db.set(K.COUNT_SESSIONS,list);
  },
  cancel:sessionId=>{
    const list=counts.all();const i=list.findIndex(c=>c.id===sessionId);
    if(i===-1)return;list[i].status='cancelled';db.set(K.COUNT_SESSIONS,list);
    auditLog('CANCEL_COUNT','count',sessionId);
  },
  submit:(sessionId,userId='MANAGER')=>{
    const list=counts.all();const i=list.findIndex(c=>c.id===sessionId);
    if(i===-1)throw new Error('Session not found');
    list[i].status='completed';list[i].completedAt=ts();list[i].completedBy=userId;
    db.set(K.COUNT_SESSIONS,list);
    const report=variance.calculate(list[i]);
    auditLog('COMPLETE_COUNT','count',sessionId,`${report.flagged} items flagged`);
    return report;
  },
};

const variance={
  all:()=>db.get(K.VARIANCE_REPORTS),
  byId:id=>variance.all().find(v=>v.id===id),
  calculate:session=>{
    const cfg=settings.get();const results=[];let flagged=0,criticals=0,totalGap=0;
    ingredients.active().forEach(ing=>{
      const physical=session.entries[ing.id]!==undefined?parseFloat(session.entries[ing.id]):null;
      if(physical===null)return;
      const theoretical=stock.qty(ing.id);const diff=physical-theoretical;
      const pct=theoretical!==0?(diff/theoretical)*100:diff!==0?100:0;
      const sev=Math.abs(pct)>10?'CRITICAL':Math.abs(pct)>cfg.varianceThreshold?'WARNING':'OK';
      if(sev!=='OK')flagged++;if(sev==='CRITICAL')criticals++;
      totalGap+=Math.abs(diff)*(ing.unitCost||0);
      results.push({ingId:ing.id,ingName:ing.name,unit:ing.unit,theoretical,physical,diff,pct:parseFloat(pct.toFixed(2)),severity:sev,valueGap:diff*(ing.unitCost||0)});
      if(Math.abs(diff)>0.001){
        const prev=stock.qty(ing.id);stock.set(ing.id,physical);
        movements.log(ing.id,diff,'COUNT_ADJUST','Physical count correction',session.completedBy||'MANAGER',prev,physical);
      }
    });
    const report={id:uid('VAR'),countSessionId:session.id,ts:ts(),results,flagged,criticals,totalGap};
    const all=variance.all();all.unshift(report);if(all.length>500)all.splice(500);
    db.set(K.VARIANCE_REPORTS,all);return report;
  },
  latestFlags:()=>{const r=variance.all()[0];return r?r.results.filter(x=>x.severity!=='OK'):[];},
};

const purchases={
  all:()=>db.get(K.PURCHASES),
  byId:id=>purchases.all().find(p=>p.id===id),
  pending:()=>purchases.all().filter(p=>p.status==='pending'),
  create:(supId,supName,invoiceNo,items,userId)=>{
    const warnings=[];
    items.forEach(item=>{const a=suppliers.checkAnomaly(supId,item.ingId,item.unitPrice);if(a)warnings.push({...a,ingName:item.ingName});});
    const total=items.reduce((s,i)=>s+i.qty*i.unitPrice,0);
    const po={id:uid('PO'),supId,supName,invoiceNo,items:[...items],total,status:'pending',warnings,createdAt:ts(),createdBy:userId,approvedAt:null,approvedBy:null};
    const list=purchases.all();list.unshift(po);db.set(K.PURCHASES,list);
    auditLog('CREATE_PO','purchase',po.id,`${supName}|${invoiceNo}|${cur(total)}`);
    return{po,warnings};
  },
  approve:(poId,pin,userId)=>{
    if(!settings.checkPin(pin))throw new Error('❌ Invalid Manager PIN');
    const list=purchases.all();const i=list.findIndex(p=>p.id===poId);
    if(i===-1)throw new Error('PO not found');
    if(list[i].status==='approved')throw new Error('Already approved');
    list[i].status='approved';list[i].approvedAt=ts();list[i].approvedBy=userId;
    db.set(K.PURCHASES,list);
    list[i].items.forEach(item=>{
      stock.adjust(item.ingId,item.qty,`PO:${poId}|${list[i].supName}`,userId,'PURCHASE');
      if(item.unitPrice>0)ingredients.update(item.ingId,{unitCost:item.unitPrice});
      suppliers.recordPrice(list[i].supId,item.ingId,item.unitPrice);
    });
    auditLog('APPROVE_PO','purchase',poId,`Approved by ${userId}`);return list[i];
  },
  reject:(poId,reason,userId)=>{
    const list=purchases.all();const i=list.findIndex(p=>p.id===poId);
    if(i===-1)return;
    Object.assign(list[i],{status:'rejected',rejectedAt:ts(),rejectedBy:userId,rejectedReason:reason});
    db.set(K.PURCHASES,list);auditLog('REJECT_PO','purchase',poId,reason);
  },
  stats:()=>{
    const all=purchases.all(),approved=all.filter(p=>p.status==='approved');
    const now=new Date();const thisMonth=approved.filter(p=>{const d=new Date(p.approvedAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    return{total:all.length,pending:all.filter(p=>p.status==='pending').length,totalSpend:approved.reduce((s,p)=>s+p.total,0),monthSpend:thisMonth.reduce((s,p)=>s+p.total,0)};
  },
};

const suppliers={
  all:()=>db.get(K.SUPPLIERS),
  byId:id=>suppliers.all().find(s=>s.id===id),
  active:()=>suppliers.all().filter(s=>!s.archived),
  add:d=>{
    const list=suppliers.all();
    const s={id:uid('SUP'),name:d.name,contact:d.contact||'',address:d.address||'',paymentTerms:d.paymentTerms||'Cash',notes:d.notes||'',archived:false,priceHistory:{},createdAt:ts()};
    list.push(s);db.set(K.SUPPLIERS,list);auditLog('ADD_SUPPLIER','supplier',s.id,s.name);return s;
  },
  update:(id,d)=>{const list=suppliers.all();const i=list.findIndex(s=>s.id===id);if(i===-1)return null;list[i]={...list[i],...d};db.set(K.SUPPLIERS,list);return list[i];},
  archive:id=>suppliers.update(id,{archived:true}),
  recordPrice:(supId,ingId,price)=>{
    const list=suppliers.all();const i=list.findIndex(s=>s.id===supId);if(i===-1)return;
    if(!list[i].priceHistory)list[i].priceHistory={};
    if(!list[i].priceHistory[ingId])list[i].priceHistory[ingId]=[];
    list[i].priceHistory[ingId].unshift({price:parseFloat(price),ts:ts()});
    if(list[i].priceHistory[ingId].length>24)list[i].priceHistory[ingId].splice(24);
    db.set(K.SUPPLIERS,list);
  },
  checkAnomaly:(supId,ingId,price)=>{
    const sup=suppliers.byId(supId);const hist=sup?.priceHistory?.[ingId];
    if(!hist||hist.length<2)return null;
    const avg=hist.slice(0,6).reduce((s,h)=>s+h.price,0)/Math.min(hist.length,6);
    const pct=((price-avg)/avg)*100;
    return pct>settings.get().priceAnomalyPct?{supId,ingId,currentPrice:price,avgPrice:avg,pct:parseFloat(pct.toFixed(1))}:null;
  },
  priceHistory:(supId,ingId)=>suppliers.byId(supId)?.priceHistory?.[ingId]||[],
};

const wastage={
  all:()=>db.get(K.WASTAGE),
  byId:id=>wastage.all().find(w=>w.id===id),
  pending:()=>wastage.all().filter(w=>w.status==='pending'),
  log:(ingId,qty,reason,category,userId)=>{
    const ing=ingredients.byId(ingId);
    const e={id:uid('WST'),ingId,qty:clamp(qty),reason,category:category||'other',userId,status:'pending',createdAt:ts(),approvedAt:null,approvedBy:null};
    const list=wastage.all();list.unshift(e);db.set(K.WASTAGE,list);
    auditLog('LOG_WASTAGE','wastage',e.id,`${qty}${ing?.unit||''}—${reason}`);return e;
  },
  approve:(id,pin,approverId)=>{
    if(!settings.checkPin(pin))throw new Error('❌ Invalid Manager PIN');
    const list=wastage.all();const i=list.findIndex(w=>w.id===id);
    if(i===-1)throw new Error('Not found');if(list[i].status!=='pending')throw new Error('Already processed');
    list[i].status='approved';list[i].approvedAt=ts();list[i].approvedBy=approverId;
    db.set(K.WASTAGE,list);
    stock.adjust(list[i].ingId,-list[i].qty,`WASTAGE:${list[i].reason}`,approverId,'WASTAGE');
    auditLog('APPROVE_WASTAGE','wastage',id,`by ${approverId}`);return list[i];
  },
  reject:(id,reason,userId)=>{
    const list=wastage.all();const i=list.findIndex(w=>w.id===id);if(i===-1)return;
    Object.assign(list[i],{status:'rejected',rejectedReason:reason,rejectedAt:ts(),rejectedBy:userId});
    db.set(K.WASTAGE,list);auditLog('REJECT_WASTAGE','wastage',id,reason);
  },
  todayValue:()=>{const t=todayStart();return wastage.all().filter(w=>w.status==='approved'&&new Date(w.createdAt)>=t).reduce((s,w)=>s+w.qty*(ingredients.byId(w.ingId)?.unitCost||0),0);},
  stats:()=>{
    const approved=wastage.all().filter(w=>w.status==='approved');
    const total=approved.reduce((s,w)=>s+w.qty*(ingredients.byId(w.ingId)?.unitCost||0),0);
    const byCat={};approved.forEach(w=>{byCat[w.category]=(byCat[w.category]||0)+w.qty*(ingredients.byId(w.ingId)?.unitCost||0);});
    return{total,byCat,count:approved.length,pending:wastage.pending().length};
  },
};

const overrides={
  all:()=>db.get(K.OVERRIDES),
  record:(type,ref,reason,requestedBy,approved,approvedBy=null)=>{
    const e={id:uid('OVR'),type,ref,reason,requestedBy,approved,approvedBy,ts:ts()};
    const list=overrides.all();list.unshift(e);if(list.length>2000)list.splice(2000);
    db.set(K.OVERRIDES,list);
    auditLog('OVERRIDE','override',e.id,`${type}:${approved?'APPROVED':'DENIED'} by ${requestedBy}`);return e;
  },
  stats:()=>{
    const all=overrides.all();const t=todayStart();const td=all.filter(o=>new Date(o.ts)>=t);
    return{total:all.length,today:td.length,approved:td.filter(o=>o.approved).length,denied:td.filter(o=>!o.approved).length};
  },
};

const analytics={
  stockTrend:(days=7)=>{
    const r=[];
    for(let i=days-1;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);
      const d2=new Date(d);d2.setHours(23,59,59,999);
      const mList=movements.all().filter(m=>{const md=new Date(m.ts);return md>=d&&md<=d2;});
      const inF=mList.filter(m=>m.delta>0).reduce((s,m)=>s+m.delta,0);
      const outF=mList.filter(m=>m.delta<0).reduce((s,m)=>s+Math.abs(m.delta),0);
      r.push({label:d.toLocaleDateString('en-PK',{weekday:'short',day:'numeric',month:'short'}),inFlow:inF,outFlow:outF});
    }
    return r;
  },
  catBreakdown:()=>{const m={};stock.enriched().forEach(i=>{m[i.category]=(m[i.category]||0)+i.value;});return m;},
  topConsumed:(lim=10,days=30)=>{
    const c=new Date();c.setDate(c.getDate()-days);const map={};
    movements.all().filter(m=>m.type==='SALE'&&new Date(m.ts)>=c).forEach(m=>{map[m.ingId]=(map[m.ingId]||0)+Math.abs(m.delta);});
    return Object.entries(map).map(([id,qty])=>({ing:ingredients.byId(id),qty})).filter(x=>x.ing).sort((a,b)=>b.qty-a.qty).slice(0,lim);
  },
  wastageByDay:(days=7)=>{
    const r=[];
    for(let i=days-1;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);
      const d2=new Date(d);d2.setHours(23,59,59,999);
      const val=wastage.all().filter(w=>w.status==='approved'&&new Date(w.createdAt)>=d&&new Date(w.createdAt)<=d2).reduce((s,w)=>s+w.qty*(ingredients.byId(w.ingId)?.unitCost||0),0);
      r.push({label:d.toLocaleDateString('en-PK',{weekday:'short',day:'numeric'}),value:val});
    }
    return r;
  },
  purchaseTrend:(months=6)=>{
    const r=[];
    for(let i=months-1;i>=0;i--){
      const d=new Date();d.setMonth(d.getMonth()-i);d.setDate(1);d.setHours(0,0,0,0);
      const d2=new Date(d);d2.setMonth(d2.getMonth()+1);
      const total=purchases.all().filter(p=>p.status==='approved'&&new Date(p.approvedAt)>=d&&new Date(p.approvedAt)<d2).reduce((s,p)=>s+p.total,0);
      r.push({label:d.toLocaleDateString('en-PK',{month:'short',year:'2-digit'}),total});
    }
    return r;
  },
  movementTypeSplit:(days=30)=>{
    const c=new Date();c.setDate(c.getDate()-days);const map={};
    movements.all().filter(m=>new Date(m.ts)>=c&&m.delta<0).forEach(m=>{map[m.type]=(map[m.type]||0)+Math.abs(m.delta);});
    return map;
  },
};

function seedDemo(){
  if(localStorage.getItem(K.SEEDED))return;
  localStorage.setItem(K.SEEDED,'1');
  const sups=[
    suppliers.add({name:'Al-Noor Meat Supply',contact:'0300-1234567',address:'Raja Market, Lahore',paymentTerms:'Cash'}),
    suppliers.add({name:'Karachi Dry Goods',contact:'0321-9876543',address:'Anarkali, Lahore',paymentTerms:'7 Days'}),
    suppliers.add({name:'Pepsi Beverages Ltd.',contact:'0311-5555555',address:'Industrial Area',paymentTerms:'Monthly'}),
    suppliers.add({name:'Fresh Veggies Co.',contact:'0333-2222222',address:'Badami Bagh Mandi',paymentTerms:'Cash'}),
  ];
  const I={};
  [{name:'Chicken',unit:'kg',category:'Meat',unitCost:550,minThreshold:5,openingQty:22},{name:'Mutton',unit:'kg',category:'Meat',unitCost:1800,minThreshold:3,openingQty:12},{name:'Beef',unit:'kg',category:'Meat',unitCost:900,minThreshold:3,openingQty:16},{name:'Fish',unit:'kg',category:'Meat',unitCost:700,minThreshold:2,openingQty:9},{name:'Cooking Oil',unit:'L',category:'Other',unitCost:360,minThreshold:5,openingQty:22},{name:'Spice Mix',unit:'kg',category:'Spices',unitCost:850,minThreshold:1,openingQty:6},{name:'Tomatoes',unit:'kg',category:'Vegetables',unitCost:80,minThreshold:3,openingQty:11},{name:'Onions',unit:'kg',category:'Vegetables',unitCost:60,minThreshold:3,openingQty:9},{name:'Ginger Garlic Paste',unit:'kg',category:'Spices',unitCost:400,minThreshold:1,openingQty:3},{name:'Milk',unit:'L',category:'Dairy',unitCost:180,minThreshold:5,openingQty:16},{name:'Yogurt',unit:'kg',category:'Dairy',unitCost:280,minThreshold:2,openingQty:9},{name:'Charcoal',unit:'kg',category:'Other',unitCost:120,minThreshold:5,openingQty:28},{name:'Naan Dough',unit:'kg',category:'Bakery',unitCost:100,minThreshold:3,openingQty:12},{name:'Pizza Dough',unit:'kg',category:'Bakery',unitCost:120,minThreshold:2,openingQty:7},{name:'Cheese',unit:'kg',category:'Dairy',unitCost:1200,minThreshold:1,openingQty:4},{name:'Burger Buns',unit:'pcs',category:'Bakery',unitCost:25,minThreshold:10,openingQty:60},{name:'Potatoes',unit:'kg',category:'Vegetables',unitCost:70,minThreshold:5,openingQty:22},{name:'Desi Ghee',unit:'kg',category:'Dairy',unitCost:2800,minThreshold:1,openingQty:3},{name:'Soft Drinks (250ml)',unit:'pcs',category:'Beverages',unitCost:50,minThreshold:24,openingQty:72},{name:'Water Bottles (1.5L)',unit:'pcs',category:'Beverages',unitCost:80,minThreshold:12,openingQty:36},{name:'Salt',unit:'kg',category:'Spices',unitCost:40,minThreshold:1,openingQty:5},{name:'Red Chilli',unit:'kg',category:'Spices',unitCost:600,minThreshold:0.5,openingQty:2}].forEach(d=>{const ing=ingredients.add(d);I[d.name]=ing.id;});
  [{id:'ITEM-033',name:'Chicken Karahi F',cat:'karahi',lines:[['Chicken',1,'kg'],['Cooking Oil',0.15,'L'],['Spice Mix',0.1,'kg'],['Tomatoes',0.2,'kg'],['Ginger Garlic Paste',0.05,'kg']]},{id:'ITEM-035',name:'Chicken Karahi H',cat:'karahi',lines:[['Chicken',0.5,'kg'],['Cooking Oil',0.08,'L'],['Spice Mix',0.05,'kg'],['Tomatoes',0.1,'kg']]},{id:'ITEM-042',name:'Beef Karahi F',cat:'karahi',lines:[['Beef',1,'kg'],['Cooking Oil',0.15,'L'],['Spice Mix',0.1,'kg'],['Tomatoes',0.2,'kg'],['Onions',0.1,'kg']]},{id:'ITEM-048',name:'Mutton Karahi F',cat:'karahi',lines:[['Mutton',1,'kg'],['Cooking Oil',0.15,'L'],['Spice Mix',0.12,'kg'],['Tomatoes',0.2,'kg'],['Desi Ghee',0.05,'kg']]},{id:'ITEM-011',name:'Tikka Seekh',cat:'bbq',lines:[['Chicken',0.25,'kg'],['Spice Mix',0.04,'kg'],['Charcoal',0.3,'kg'],['Ginger Garlic Paste',0.02,'kg']]},{id:'ITEM-012',name:'Tikka 0.5kg',cat:'bbq',lines:[['Chicken',0.5,'kg'],['Spice Mix',0.07,'kg'],['Charcoal',0.5,'kg']]},{id:'ITEM-024',name:'Fish S',cat:'bbq',lines:[['Fish',1,'kg'],['Spice Mix',0.08,'kg'],['Cooking Oil',0.3,'L'],['Charcoal',0.5,'kg']]},{id:'ITEM-119',name:'Zinger Burger',cat:'burgers',lines:[['Chicken',0.15,'kg'],['Burger Buns',1,'pcs'],['Cooking Oil',0.1,'L']]},{id:'ITEM-120',name:'Chicken Burger',cat:'burgers',lines:[['Chicken',0.12,'kg'],['Burger Buns',1,'pcs'],['Cooking Oil',0.08,'L']]},{id:'ITEM-123',name:'Chicken Tikka Pizza S',cat:'pizza',lines:[['Pizza Dough',0.2,'kg'],['Chicken',0.1,'kg'],['Cheese',0.08,'kg']]},{id:'ITEM-124',name:'Chicken Tikka Pizza M',cat:'pizza',lines:[['Pizza Dough',0.35,'kg'],['Chicken',0.18,'kg'],['Cheese',0.15,'kg']]},{id:'ITEM-003',name:'Naan',cat:'other',lines:[['Naan Dough',0.1,'kg']]},{id:'ITEM-130',name:'Chicken Broast Q',cat:'broast',lines:[['Chicken',0.4,'kg'],['Cooking Oil',0.5,'L'],['Spice Mix',0.03,'kg']]},{id:'ITEM-136',name:'Plain Fries',cat:'fries',lines:[['Potatoes',0.3,'kg'],['Cooking Oil',0.15,'L'],['Salt',0.01,'kg']]},{id:'ITEM-139',name:'Loaded Cheesy Fries',cat:'fries',lines:[['Potatoes',0.4,'kg'],['Cooking Oil',0.2,'L'],['Cheese',0.06,'kg']]}].forEach(r=>recipes.save(r.id,r.name,r.cat,r.lines.map(l=>({ingId:I[l[0]],qty:l[1],unit:l[2],yieldFactor:1}))));
  const now=new Date();
  for(let day=14;day>=1;day--){
    const d=new Date(now);d.setDate(d.getDate()-day);
    [[I['Chicken'],-(Math.random()*3+1)],[I['Beef'],-(Math.random()*2+0.5)],[I['Mutton'],-(Math.random()*1.5+0.3)]].forEach(([id,delta])=>{
      if(stock.qty(id)+delta>0){
        const prev=stock.qty(id);const next=Math.max(0,prev+delta);stock.set(id,next);
        const mv=movements.all();const t2=new Date(d);t2.setHours(12+Math.floor(Math.random()*6));
        mv.push({id:uid('MOV'),ingId:id,delta:parseFloat(delta.toFixed(3)),type:'SALE',reason:'SALE:DEMO',userId:'POS',prev,next,ts:t2.toISOString()});
        db.set(K.MOVEMENTS,mv);
      }
    });
    if(day%4===0){
      const id=I['Cooking Oil'];const prev=stock.qty(id);stock.set(id,prev+5);
      const mv=movements.all();const t2=new Date(d);t2.setHours(9);
      mv.push({id:uid('MOV'),ingId:id,delta:5,type:'PURCHASE',reason:'PO:DEMO',userId:'MANAGER',prev,next:prev+5,ts:t2.toISOString()});
      db.set(K.MOVEMENTS,mv);
    }
  }
  const{po}=purchases.create(sups[0].id,sups[0].name,'INV-001-2024',[{ingId:I['Chicken'],ingName:'Chicken',qty:10,unit:'kg',unitPrice:550},{ingId:I['Mutton'],ingName:'Mutton',qty:5,unit:'kg',unitPrice:1800}],'ADMIN');
  const pl=purchases.all();const pi=pl.findIndex(p=>p.id===po.id);
  if(pi!==-1){pl[pi].status='approved';pl[pi].approvedAt=ts();pl[pi].approvedBy='ADMIN';db.set(K.PURCHASES,pl);}
  wastage.log(I['Chicken'],0.5,'Dropped on floor','accident','KITCHEN');
  const we=wastage.log(I['Spice Mix'],0.2,'Expired batch','spoilage','KITCHEN');
  const wl=wastage.all();const wi=wl.findIndex(w=>w.id===we.id);
  if(wi!==-1){wl[wi].status='approved';wl[wi].approvedAt=ts();wl[wi].approvedBy='MANAGER';db.set(K.WASTAGE,wl);stock.adjust(wl[wi].ingId,-wl[wi].qty,'WASTAGE:Expired batch','MANAGER','WASTAGE');}
  [550,540,545,555,550].forEach(p=>suppliers.recordPrice(sups[0].id,I['Chicken'],p));
  [1800,1750,1780,1820].forEach(p=>suppliers.recordPrice(sups[0].id,I['Mutton'],p));
  console.log('✅ INV: Demo data seeded');
}

return{uid,ts,cur,fmtD,fmt,settings,ingredients,stock,movements,recipes,counts,variance,purchases,suppliers,wastage,overrides,analytics,audit:{log:auditLog,all:()=>db.get(K.AUDIT)},seedDemo};
})();