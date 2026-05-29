import { useState, useMemo } from "react";

const today = new Date();
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };

const TICKET_PLATFORMS = ["الهيئة", "أسهل", "تواصل اجتماعي"];
const FOLLOW_CHANNELS = ["أسهل", "بريد إلكتروني"];
const ENTITIES = ["آي سوفت", "أعمالي", "علم", "قسم الفحص الفني"];
const ASSIGNEES = ["أفنان الزهراني", "نوف العويس"];
const ESCALATION_TARGETS = ["رئيس البلاغات", "قسم الفحص الفني"];
const CLOSE_REASONS = [
"تمت المعالجة من الجهة المعنية",
"لا يوجد تجاوب من الجهة المعنية وتم التواصل مع المستفيد وأُشعر بالمعالجة"
];

const PRIORITY_LABELS = { high:"عالي", medium:"متوسط", low:"منخفض" };

const C = {
// أزرق داكن رئيسي
b1:"#0a1f44", b2:"#1a3a6b", b3:"#2351a3", b4:"#4a7fd4", b5:"#a8c4e8",
bL:"#dce8f7", bLL:"#f2f7fd",
// ألوان الحالات
green:"#2351a3", greenL:"#dce8f7",
orange:"#c47a1a", orangeL:"#fdf3e3",
red:"#b52a2a", redL:"#fbe9e9",
gold:"#c8952a", goldL:"#fdf4e3",
// رمادي فولاذي
gray:"#4a5568", grayL:"#edf2f7",
bg:"#eef3f9", white:"#ffffff",
};

const STORAGE_KEY = "tickets_data_v2";
const loadFromStorage = () => { try { const s=localStorage.getItem(STORAGE_KEY); if(s) return JSON.parse(s); } catch(e){} return null; };
const saveToStorage = (t) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch(e){} };

const calcWorkingDays = (startDate, endDate) => {
let count=0; const cur=new Date(startDate); cur.setHours(0,0,0,0);
const end=new Date(endDate); end.setHours(0,0,0,0);
while(cur<end){const d=cur.getDay();if(d!==5&&d!==6)count++;cur.setDate(cur.getDate()+1);}
return count;
};

const calcSLAInfo = (ticket) => {
if(!ticket) return null;
const transfers = ticket.transfers||[];
const lastTransfer = transfers.length>0 ? transfers[transfers.length-1] : null;
const refDate = lastTransfer ? lastTransfer.date : ticket.submittedAt;
if(!refDate) return null;
const hours = Math.floor((new Date()-new Date(refDate))/3600000);
const workDays = calcWorkingDays(refDate, new Date());
const breached = workDays>=3;
const overDays = breached ? workDays-3 : 0;
let color,bg,label;
if(hours<24){color="#2e7d32";bg="#e8f5e9";label=`${hours} ساعة`;}
else if(workDays<2){color="#2e7d32";bg="#e8f5e9";label=`${workDays} يوم`;}
else if(workDays<3){color="#e65100";bg="#fff3e0";label=`${workDays} يوم ⚠`;}
else{color="#c62828";bg="#ffebee";label=`${workDays} يوم ✗`;}
return {hours,workDays,breached,overDays,color,bg,label,refDate};
};

const getStatus = (ticket) => {
if(ticket.closedAt) return {label:"مغلق",color:"#37474f",bg:"#eceff1"};
if(!ticket.submittedAt) return {label:"لم يُرفع للجهة بعد",color:"#546e7a",bg:"#eceff1"};
const sla=calcSLAInfo(ticket);
if(sla&&sla.breached) return {label:`تجاوز SLA — ${sla.overDays} يوم`,color:"#c62828",bg:"#ffebee"};
if(sla&&sla.workDays>=2) return {label:"قارب انتهاء SLA",color:"#e65100",bg:"#fff3e0"};
return {label:"ضمن SLA",color:"#2e7d32",bg:"#e8f5e9"};
};

const formatDate=(d)=>d?new Date(d).toLocaleDateString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit"}):"—";
const formatDT=(d)=>d?new Date(d).toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
const todayStr=()=>new Date().toISOString().slice(0,10);
const genId=()=>`TKT-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`;

const INIT_TICKETS = [
{id:"2025-001",title:"خطأ في عملية التحقق",platform:"الهيئة",followChannel:"أسهل",beneficiary:"محمد العمري",entity:"آي سوفت",assignee:"أفنان الزهراني",priority:"high",createdAt:daysAgo(7),submittedAt:daysAgo(7),closedAt:null,closeReason:null,notes:"يؤثر على عمليات الهيئة",escalationCount:1,transfers:[],escalations:[]},
{id:"2025-002",title:"تأخر استجابة النظام",platform:"أسهل",followChannel:"بريد إلكتروني",beneficiary:"سلطان الغامدي",entity:"أعمالي",assignee:"نوف العويس",priority:"medium",createdAt:daysAgo(4),submittedAt:daysAgo(4),closedAt:null,closeReason:null,notes:"",escalationCount:0,transfers:[],escalations:[]},
{id:"2025-003",title:"مشكلة في رفع المستندات",platform:"تواصل اجتماعي",followChannel:"أسهل",beneficiary:"هند الشهري",entity:"علم",assignee:"أفنان الزهراني",priority:"low",createdAt:daysAgo(10),submittedAt:daysAgo(9),closedAt:daysAgo(6),closeReason:"تمت المعالجة من الجهة المعنية",notes:"تم الحل",escalationCount:0,transfers:[],escalations:[]},
{id:"2025-004",title:"خلل في واجهة الدفع",platform:"أسهل",followChannel:"أسهل",beneficiary:"ريم القحطاني",entity:"آي سوفت",assignee:"أفنان الزهراني",priority:"high",createdAt:daysAgo(5),submittedAt:daysAgo(5),closedAt:null,closeReason:null,notes:"قيد التحقيق",escalationCount:0,transfers:[],escalations:[]},
];

// ===== مكونات مشتركة =====
const Badge=({color,bg,label,size=12})=>(
<span style={{background:bg,color,padding:"3px 10px",borderRadius:20,fontSize:size,fontWeight:700,whiteSpace:"nowrap",border:`1px solid ${color}33`}}>{label}</span>
);
const Field=({label,children})=>(
<div style={{display:"flex",flexDirection:"column",gap:5}}>
<label style={{fontSize:12,fontWeight:700,color:C.gray,fontFamily:"Calibri,sans-serif"}}>{label}</label>
{children}
</div>
);
const iS={padding:"9px 13px",borderRadius:9,border:"1.5px solid #b0bec5",fontSize:13,fontFamily:"Calibri,sans-serif",direction:"rtl",background:"#fafafa",width:"100%",boxSizing:"border-box"};

// ===== نموذج البلاغ (بدون تحويل) =====
const TicketForm=({ticket,onSave,onClose})=>{
const empty={id:"",title:"",platform:TICKET_PLATFORMS[0],followChannel:FOLLOW_CHANNELS[0],beneficiary:"",entity:ENTITIES[0],assignee:ASSIGNEES[0],priority:"medium",createdAt:todayStr(),submittedAt:"",closedAt:"",closeReason:null,notes:"",escalationCount:0,transfers:[],escalations:[]};
const [form,setForm]=useState(ticket?{...empty,...ticket}:empty);
const set=(k,v)=>setForm(p=>({...p,[k]:v}));
const isEdit=!!ticket;

const save=()=>{
if(!form.id.trim()) return alert("يرجى إدخال رقم البلاغ");
if(!form.title.trim()) return alert("يرجى إدخال عنوان البلاغ");
if(!form.beneficiary.trim()) return alert("يرجى إدخال اسم المستفيد");
onSave(form);
};

const sec={background:C.bLL,borderRadius:12,padding:"16px 18px",marginBottom:14,border:`1px solid ${C.b5}`};
const hdr={fontSize:13,fontWeight:800,color:C.b1,marginTop:0,marginBottom:14,paddingBottom:8,borderBottom:`2px solid ${C.b5}`,fontFamily:"Calibri,sans-serif"};

return (
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:C.white,borderRadius:20,width:"100%",maxWidth:660,maxHeight:"93vh",overflowY:"auto",direction:"rtl",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
<div style={{background:`linear-gradient(135deg,${C.b1},${C.b2})`,padding:"20px 26px",borderRadius:"20px 20px 0 0",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<div style={{fontSize:11,opacity:.7,marginBottom:3}}>{form.id||"بلاغ جديد"}</div>
<h2 style={{margin:0,fontSize:18,fontWeight:900,fontFamily:"Calibri,sans-serif"}}>{isEdit?"✏️ تعديل البلاغ":"➕ إضافة بلاغ جديد"}</h2>
</div>
<button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:17}}>✕</button>
</div>
<div style={{padding:"22px 26px"}}>
<div style={sec}>
<h3 style={hdr}>📋 بيانات البلاغ</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
<Field label="رقم البلاغ *"><input style={iS} value={form.id} onChange={e=>set("id",e.target.value)} placeholder="مثال: 2025-001"/></Field>
<Field label="منصة البلاغ"><select style={{...iS,cursor:"pointer"}} value={form.platform} onChange={e=>set("platform",e.target.value)}>{TICKET_PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></Field>
<Field label="اسم المستفيد *"><input style={iS} value={form.beneficiary} onChange={e=>set("beneficiary",e.target.value)} placeholder="اسم المستفيد..."/></Field>
<Field label="أين يتابع البلاغ؟"><select style={{...iS,cursor:"pointer"}} value={form.followChannel} onChange={e=>set("followChannel",e.target.value)}>{FOLLOW_CHANNELS.map(c=><option key={c}>{c}</option>)}</select></Field>
<div style={{gridColumn:"1/-1"}}><Field label="عنوان / وصف البلاغ *"><input style={iS} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="وصف مختصر..."/></Field></div>
<Field label="المسؤول"><select style={{...iS,cursor:"pointer"}} value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{ASSIGNEES.map(a=><option key={a}>{a}</option>)}</select></Field>
<Field label="الأولوية"><select style={{...iS,cursor:"pointer"}} value={form.priority} onChange={e=>set("priority",e.target.value)}>{Object.entries(PRIORITY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
</div>
</div>
<div style={sec}>
<h3 style={hdr}>🏢 الجهة المعنية</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
<Field label="الجهة المعنية"><select style={{...iS,cursor:"pointer"}} value={form.entity} onChange={e=>set("entity",e.target.value)}>{ENTITIES.map(e=><option key={e}>{e}</option>)}</select></Field>
<Field label="تاريخ الرفع للجهة (بداية SLA)"><input type="date" style={iS} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/></Field>
</div>
</div>
<div style={sec}>
<h3 style={hdr}>📅 التواريخ</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
<Field label="تاريخ إنشاء البلاغ من المستفيد"><input type="date" style={iS} value={form.createdAt} onChange={e=>set("createdAt",e.target.value)}/></Field>
<Field label="تاريخ رفع البلاغ (بداية SLA)"><input type="date" style={iS} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/></Field>
<div style={{display:"flex",alignItems:"center",background:C.bL,borderRadius:9,padding:"10px 14px",border:`1px solid ${C.b5}`}}><span style={{fontSize:11,color:C.b2,fontWeight:700,lineHeight:1.6}}>⏱ SLA: 3 أيام عمل (الأحد—الخميس)<br/>🔵 24س | 🟠 48س | 🔴 72س</span></div>
</div>
</div>
{isEdit && (
<div style={sec}>
<h3 style={hdr}>🔄 تحويل البلاغ لجهة أخرى</h3>
<TransferSection form={form} setForm={setForm}/>
</div>
)}
{isEdit && (
<div style={sec}>
<h3 style={hdr}>🔺 تسجيل تصعيد جديد</h3>
<EscalationSection form={form} setForm={setForm}/>
</div>
)}
<div style={sec}>
<h3 style={hdr}>📝 ملاحظات</h3>
<textarea style={{...iS,minHeight:70,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="ملاحظات إضافية..."/>
</div>
<div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
<button onClick={onClose} style={{padding:"10px 24px",borderRadius:10,border:"1.5px solid #b0bec5",background:C.white,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>إلغاء</button>
<button onClick={save} style={{padding:"10px 28px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.b1},${C.b2})`,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>💾 حفظ البلاغ</button>
</div>
</div>
</div>
</div>
);
};

// ===== قسم التحويل (في التعديل فقط) =====
const TransferSection=({form,setForm})=>{
const [newEntity,setNewEntity]=useState("");
const handle=()=>{
if(!newEntity) return;
const tr={from:form.entity,to:newEntity,date:new Date().toISOString()};
setForm(p=>({...p,entity:newEntity,transfers:[...(p.transfers||[]),tr]}));
setNewEntity("");
};
return (
<div>
<div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
<select style={{...iS,flex:1}} value={newEntity} onChange={e=>setNewEntity(e.target.value)}>
<option value="">— اختر الجهة الجديدة —</option>
{ENTITIES.filter(e=>e!==form.entity).map(e=><option key={e}>{e}</option>)}
</select>
<button onClick={handle} disabled={!newEntity} style={{padding:"9px 18px",background:newEntity?C.b2:"#ccc",color:"#fff",border:"none",borderRadius:9,cursor:newEntity?"pointer":"default",fontSize:12,fontWeight:800,whiteSpace:"nowrap",fontFamily:"Calibri,sans-serif"}}>تحويل الآن</button>
</div>
{(form.transfers||[]).length>0&&(
<div style={{fontSize:11,color:C.gray}}>
{form.transfers.map((t,i)=>(
<div key={i} style={{padding:"5px 10px",background:C.white,borderRadius:7,marginBottom:4,border:`1px solid ${C.b5}`}}>
📌 من <strong>{t.from}</strong> → <strong>{t.to}</strong> — {formatDT(t.date)}
</div>
))}
</div>
)}
</div>
);
};

// ===== قسم التصعيد (في التعديل فقط) =====
const EscalationSection=({form,setForm})=>{
const [esc,setEsc]=useState({date:todayStr(),escalatedTo:ESCALATION_TARGETS[0],notes:""});
const add=()=>{
const newEsc={...esc,id:Date.now(),by:form.assignee};
setForm(p=>({...p,escalationCount:(p.escalationCount||0)+1,escalations:[...(p.escalations||[]),newEsc]}));
setEsc({date:todayStr(),escalatedTo:ESCALATION_TARGETS[0],notes:""});
};
return (
<div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
<Field label="تاريخ التصعيد"><input type="date" style={iS} value={esc.date} onChange={e=>setEsc(p=>({...p,date:e.target.value}))}/></Field>
<Field label="إلى من؟"><select style={{...iS,cursor:"pointer"}} value={esc.escalatedTo} onChange={e=>setEsc(p=>({...p,escalatedTo:e.target.value}))}>{ESCALATION_TARGETS.map(t=><option key={t}>{t}</option>)}</select></Field>
<div style={{gridColumn:"1/-1"}}><Field label="سبب التصعيد"><input style={iS} value={esc.notes} onChange={e=>setEsc(p=>({...p,notes:e.target.value}))} placeholder="سبب التصعيد..."/></Field></div>
</div>
<button onClick={add} style={{padding:"8px 18px",background:C.red,color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>+ تسجيل التصعيد</button>
</div>
);
};

// ===== نافذة العرض (تاريخ التحويلات + التصعيدات فقط) =====
const TicketDetail=({ticket,onClose})=>{
const sla=calcSLAInfo(ticket);
const status=getStatus(ticket);
const row={display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.bL}`};

return (
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:C.white,borderRadius:20,width:"100%",maxWidth:700,maxHeight:"92vh",overflowY:"auto",direction:"rtl",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
<div style={{background:`linear-gradient(135deg,${C.b1},${C.b2})`,padding:"22px 28px",borderRadius:"20px 20px 0 0",color:"#fff"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
<div>
<div style={{fontSize:11,opacity:.7,marginBottom:4}}>{ticket.id}</div>
<h2 style={{fontSize:19,fontWeight:900,margin:0,fontFamily:"Calibri,sans-serif"}}>{ticket.title}</h2>
<div style={{fontSize:12,opacity:.75,marginTop:4}}>👤 {ticket.beneficiary} · 📲 {ticket.platform}</div>
</div>
<button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:17}}>✕</button>
</div>
<div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
<Badge color={status.color} bg="rgba(255,255,255,.2)" label={status.label}/>
{sla&&<Badge color={sla.color} bg="rgba(255,255,255,.2)" label={`⏱ ${sla.label}`}/>}
{(ticket.escalationCount||0)>0&&<Badge color="#fff" bg="rgba(198,40,40,.4)" label={`🔺 ${ticket.escalationCount} تصعيد`}/>}
</div>
</div>

<div style={{padding:24}}>
{/* تفاصيل */}
<div style={{background:C.bLL,borderRadius:12,padding:18,marginBottom:14,border:`1px solid ${C.b5}`}}>
<h3 style={{fontSize:13,fontWeight:800,color:C.b1,marginTop:0,marginBottom:12,fontFamily:"Calibri,sans-serif"}}>📋 تفاصيل البلاغ</h3>
{[["الجهة الحالية",ticket.entity],["المسؤول",ticket.assignee],["المنصة",ticket.platform],["تاريخ الإنشاء",formatDate(ticket.createdAt)],["تاريخ الرفع (بداية SLA)",formatDate(ticket.submittedAt)],["تاريخ الإغلاق",formatDate(ticket.closedAt)],["سبب الإغلاق",ticket.closeReason||"—"]].map(([l,v])=>(
<div key={l} style={row}><span style={{color:C.gray,fontSize:13}}>{l}</span><strong style={{fontSize:13}}>{v||"—"}</strong></div>
))}
</div>

{ticket.notes&&(
<div style={{background:C.bL,borderRadius:12,padding:16,marginBottom:14,border:`1px solid ${C.b5}`}}>
<h3 style={{fontSize:13,fontWeight:800,color:C.b1,marginTop:0,marginBottom:8,fontFamily:"Calibri,sans-serif"}}>📝 ملاحظات</h3>
<p style={{margin:0,color:"#374151",fontSize:13,lineHeight:1.8}}>{ticket.notes}</p>
</div>
)}

{/* سجل التحويلات */}
<div style={{background:C.bLL,borderRadius:12,padding:18,marginBottom:14,border:`1px solid ${C.b5}`}}>
<h3 style={{fontSize:13,fontWeight:800,color:C.b1,marginTop:0,marginBottom:12,fontFamily:"Calibri,sans-serif"}}>🔄 سجل التحويلات ({(ticket.transfers||[]).length})</h3>
{(ticket.transfers||[]).length===0?(
<p style={{color:"#90a4ae",fontSize:12,textAlign:"center",padding:"8px 0"}}>لا توجد تحويلات</p>
):(
<div style={{position:"relative",paddingRight:20}}>
<div style={{position:"absolute",right:8,top:0,bottom:0,width:2,background:C.b5}}/>
{(ticket.transfers||[]).map((t,i)=>(
<div key={i} style={{position:"relative",marginBottom:12,paddingRight:16}}>
<div style={{position:"absolute",right:-4,top:4,width:10,height:10,borderRadius:"50%",background:C.b2,border:`2px solid ${C.white}`}}/>
<div style={{background:C.white,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.b5}`}}>
<div style={{fontSize:12,color:C.b1,fontWeight:700}}>من <strong>{t.from}</strong> → <strong>{t.to}</strong></div>
<div style={{fontSize:11,color:C.gray,marginTop:3}}>{formatDT(t.date)}</div>
</div>
</div>
))}
</div>
)}
</div>

{/* سجل التصعيدات */}
<div style={{background:C.bLL,borderRadius:12,padding:18,border:`1px solid ${C.b5}`}}>
<h3 style={{fontSize:13,fontWeight:800,color:C.b1,marginTop:0,marginBottom:12,fontFamily:"Calibri,sans-serif"}}>🔺 سجل التصعيدات ({(ticket.escalations||[]).length})</h3>
{(ticket.escalations||[]).length===0?(
<p style={{color:"#90a4ae",fontSize:12,textAlign:"center",padding:"8px 0"}}>لا توجد تصعيدات</p>
):(
<div style={{position:"relative",paddingRight:20}}>
<div style={{position:"absolute",right:8,top:0,bottom:0,width:2,background:"#ef9a9a"}}/>
{(ticket.escalations||[]).map((e,i)=>(
<div key={e.id} style={{position:"relative",marginBottom:12,paddingRight:16}}>
<div style={{position:"absolute",right:-4,top:4,width:10,height:10,borderRadius:"50%",background:C.red,border:`2px solid ${C.white}`}}/>
<div style={{background:C.white,borderRadius:10,padding:"10px 14px",border:"1px solid #ef9a9a"}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
<strong style={{color:C.red,fontSize:13}}>تصعيد #{i+1} → {e.escalatedTo}</strong>
<span style={{color:C.gray,fontSize:11}}>{formatDate(e.date)}</span>
</div>
{e.notes&&<p style={{margin:0,fontSize:12,color:C.gray}}>{e.notes}</p>}
</div>
</div>
))}
</div>
)}
</div>
</div>
</div>
</div>
);
};

// ===== نافذة إغلاق البلاغ =====
const CloseTicketModal=({ticket,onClose,onConfirm})=>{
const [reason,setReason]=useState(CLOSE_REASONS[0]);
return (
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:C.white,borderRadius:16,width:"100%",maxWidth:480,direction:"rtl",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
<div style={{background:`linear-gradient(135deg,${C.gray},#455a64)`,padding:"18px 24px",borderRadius:"16px 16px 0 0",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<h3 style={{margin:0,fontSize:16,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>🔒 إغلاق البلاغ</h3>
<button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:30,height:30,borderRadius:8,cursor:"pointer",fontSize:16}}>✕</button>
</div>
<div style={{padding:24}}>
<p style={{fontSize:13,color:C.gray,marginTop:0}}>اختر سبب إغلاق البلاغ: <strong>{ticket.id}</strong></p>
<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
{CLOSE_REASONS.map(r=>(
<label key={r} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",borderRadius:10,border:`2px solid ${reason===r?C.b2:"#e0e0e0"}`,background:reason===r?C.bL:C.white,cursor:"pointer",fontSize:13,fontFamily:"Calibri,sans-serif"}}>
<input type="radio" name="closeReason" value={r} checked={reason===r} onChange={()=>setReason(r)} style={{marginTop:2,accentColor:C.b2}}/>
{r}
</label>
))}
</div>
<div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
<button onClick={onClose} style={{padding:"9px 20px",borderRadius:9,border:"1.5px solid #b0bec5",background:C.white,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>إلغاء</button>
<button onClick={()=>onConfirm(reason)} style={{padding:"9px 20px",borderRadius:9,border:"none",background:C.gray,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>🔒 تأكيد الإغلاق</button>
</div>
</div>
</div>
</div>
);
};

// ===== لوحة التحكم =====
const DashboardView=({tickets})=>{
const total=tickets.length;
const open=tickets.filter(t=>!t.closedAt).length;
const closed=tickets.filter(t=>t.closedAt).length;
const breached=tickets.filter(t=>{const s=calcSLAInfo(t);return s&&s.breached&&!t.closedAt;}).length;
const withinSLA=open-breached>0?open-breached:0;
const escalated=tickets.filter(t=>(t.escalationCount||0)>0).length;
const totalEsc=tickets.reduce((s,t)=>s+(t.escalationCount||0),0);

const entityData=ENTITIES.map(e=>({
name:e.replace("قسم الفحص الفني","الفحص الفني"),
total:tickets.filter(t=>t.entity===e).length,
open:tickets.filter(t=>t.entity===e&&!t.closedAt).length,
})).filter(e=>e.total>0);
const maxVal=Math.max(...entityData.map(e=>e.total),1);

const KPI=({icon,label,value,color,sub})=>(
<div style={{background:C.white,borderRadius:14,padding:"18px 20px",boxShadow:"0 2px 8px rgba(0,0,0,.07)",borderTop:`4px solid ${color}`}}>
<div style={{fontSize:26}}>{icon}</div>
<div style={{fontSize:32,fontWeight:900,color:"#1a1a1a",lineHeight:1,marginTop:6}}>{value}</div>
<div style={{fontSize:13,color:C.gray,fontWeight:700,marginTop:4}}>{label}</div>
{sub&&<div style={{fontSize:11,color:"#90a4ae",marginTop:2}}>{sub}</div>}
</div>
);

// رسم دائري SVG
const PieChart=({data,colors})=>{
const tot=data.reduce((s,d)=>s+d.value,0)||1;
let cum=0;
return (
<svg viewBox="0 0 100 100" width="160" height="160">
{data.map((d,i)=>{
const pct=d.value/tot;
const sa=cum*360*Math.PI/180; cum+=pct;
const ea=cum*360*Math.PI/180;
const x1=50+40*Math.sin(sa),y1=50-40*Math.cos(sa);
const x2=50+40*Math.sin(ea),y2=50-40*Math.cos(ea);
if(pct===0) return null;
if(pct===1) return <circle key={i} cx="50" cy="50" r="40" fill={colors[i]}/>;
return <path key={i} d={`M50,50 L${x1},${y1} A40,40 0 ${pct>0.5?1:0},1 ${x2},${y2} Z`} fill={colors[i]}/>;
})}
<circle cx="50" cy="50" r="22" fill={C.white}/>
<text x="50" y="54" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1a1a1a">{tot}</text>
</svg>
);
};

const pieData=[{label:"ضمن SLA",value:withinSLA},{label:"تجاوز SLA",value:breached}].filter(d=>d.value>0);
const pieColors=["#2e7d32","#c62828"];

return (
<div style={{direction:"rtl",fontFamily:"Calibri,sans-serif"}}>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:24}}>
<KPI icon="📋" label="إجمالي البلاغات" value={total} color="#1a3a6b"/>
<KPI icon="🔄" label="قيد المعالجة" value={open} color="#0288d1" sub={`${Math.round(open/Math.max(total,1)*100)}%`}/>
<KPI icon="✅" label="مغلقة" value={closed} color="#388e3c"/>
<KPI icon="🔺" label="بلاغات مصعدة" value={escalated} color="#c62828"/>
<KPI icon="⏰" label="تجاوزت SLA" value={breached} color="#e65100"/>
<KPI icon="📌" label="إجمالي التصعيدات" value={totalEsc} color="#7b1fa2"/>
</div>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
<div style={{background:C.white,borderRadius:14,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",marginTop:0,marginBottom:18}}>توزيع البلاغات (SLA)</h3>
<div style={{display:"flex",alignItems:"center",gap:20}}>
<PieChart data={pieData} colors={pieColors}/>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
{pieData.map((d,i)=>(
<div key={d.label} style={{display:"flex",alignItems:"center",gap:8}}>
<div style={{width:14,height:14,borderRadius:4,background:pieColors[i]}}/>
<span style={{fontSize:13,color:C.gray}}>{d.label}</span>
<strong style={{fontSize:15,color:pieColors[i]}}>{d.value}</strong>
</div>
))}
</div>
</div>
</div>

<div style={{background:C.white,borderRadius:14,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,.07)"}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",marginTop:0,marginBottom:18}}>البلاغات حسب الجهة</h3>
{entityData.map(e=>(
<div key={e.name} style={{marginBottom:13}}>
<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
<span style={{fontWeight:700}}>{e.name}</span>
<span style={{color:C.gray}}>{e.open} مفتوح / {e.total}</span>
</div>
<div style={{background:C.bL,borderRadius:8,height:10,position:"relative",overflow:"hidden"}}>
<div style={{width:`${(e.total/maxVal)*100}%`,height:"100%",background:C.b5,borderRadius:8}}/>
<div style={{position:"absolute",top:0,right:0,width:`${(e.open/maxVal)*100}%`,height:"100%",background:C.b2,borderRadius:8}}/>
</div>
</div>
))}
</div>

<div style={{background:C.white,borderRadius:14,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,.07)",gridColumn:"1/-1"}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",marginTop:0,marginBottom:14}}>⏰ مؤقتات SLA</h3>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:10}}>
{tickets.filter(t=>!t.closedAt&&t.submittedAt).map(t=>{
const sla=calcSLAInfo(t); if(!sla) return null;
return (
<div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:sla.bg,borderRadius:10,border:`1.5px solid ${sla.color}33`}}>
<div><strong style={{fontSize:13}}>{t.title}</strong><div style={{fontSize:11,color:C.gray,marginTop:2}}>{t.entity} · {t.assignee}</div></div>
<div style={{textAlign:"center"}}>
<div style={{fontSize:18,fontWeight:900,color:sla.color}}>{sla.label}</div>
<div style={{fontSize:10,color:C.gray}}>{sla.breached?"تجاوز SLA":"ضمن SLA"}</div>
</div>
</div>
);
})}
{tickets.filter(t=>!t.closedAt&&t.submittedAt).length===0&&<p style={{color:C.b2,fontWeight:700,textAlign:"center",padding:16,background:C.bL,borderRadius:10,gridColumn:"1/-1"}}>✅ جميع البلاغات ضمن SLA</p>}
</div>
</div>
</div>
</div>
);
};

// ===== سجل البلاغات =====
const TicketsList=({tickets,onEdit,onView,onDelete,onClose})=>{
const [search,setSearch]=useState("");
const [fE,setFE]=useState("all");
const [fA,setFA]=useState("all");
const [sort,setSort]=useState("createdAt");

const filtered=useMemo(()=>{
let l=tickets.filter(t=>{
if(fE!=="all"&&t.entity!==fE) return false;
if(fA!=="all"&&t.assignee!==fA) return false;
if(search&&!t.title.includes(search)&&!t.id.includes(search)&&!t.beneficiary.includes(search)) return false;
return true;
});
l.sort((a,b)=>{
if(sort==="createdAt") return new Date(b.createdAt)-new Date(a.createdAt);
if(sort==="sla"){const sa=calcSLAInfo(a);const sb=calcSLAInfo(b);return (sb?.workDays||0)-(sa?.workDays||0);}
return (b.escalationCount||0)-(a.escalationCount||0);
});
return l;
},[tickets,search,fE,fA,sort]);

const sI={padding:"8px 12px",borderRadius:9,border:"1.5px solid #b0bec5",fontSize:12,fontFamily:"Calibri,sans-serif",direction:"rtl",background:"#fafafa"};

return (
<div style={{direction:"rtl",fontFamily:"Calibri,sans-serif"}}>
<div style={{background:C.white,borderRadius:14,padding:14,marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
<input style={{...sI,flex:1,minWidth:180}} placeholder="🔍 بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
<select style={sI} value={fE} onChange={e=>setFE(e.target.value)}><option value="all">جميع الجهات</option>{ENTITIES.map(e=><option key={e}>{e}</option>)}</select>
<select style={sI} value={fA} onChange={e=>setFA(e.target.value)}><option value="all">جميع المسؤولين</option>{ASSIGNEES.map(a=><option key={a}>{a}</option>)}</select>
<select style={sI} value={sort} onChange={e=>setSort(e.target.value)}>
<option value="createdAt">الأحدث</option>
<option value="sla">حسب SLA</option>
<option value="escalations">التصعيدات</option>
</select>
</div>

<div style={{display:"flex",flexDirection:"column",gap:10}}>
{filtered.map(t=>{
const sla=calcSLAInfo(t);
const status=getStatus(t);
return (
<div key={t.id} style={{background:C.white,borderRadius:13,padding:"14px 18px",boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderRight:`4px solid ${sla?.color||C.gray}`,display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
<div style={{flex:1,minWidth:0}}>
<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:6}}>
<span style={{fontSize:11,fontWeight:800,color:C.gray,background:C.grayL,padding:"2px 8px",borderRadius:6}}>{t.id}</span>
<Badge color={status.color} bg={status.bg} label={status.label}/>
{sla&&<Badge color={sla.color} bg={sla.bg} label={sla.label}/>}
{(t.escalationCount||0)>0&&<Badge color={C.red} bg={C.redL} label={`🔺 ${t.escalationCount}`}/>}
{(t.transfers||[]).length>0&&<Badge color={C.b2} bg={C.bL} label={`🔄 ${t.transfers.length} تحويل`}/>}
{t.closedAt&&<Badge color={C.gray} bg={C.grayL} label="🔒 مغلق"/>}
</div>
<h4 style={{margin:0,fontSize:14,fontWeight:800,color:"#1a1a1a",marginBottom:5}}>{t.title}</h4>
<div style={{fontSize:12,color:C.gray,display:"flex",gap:12,flexWrap:"wrap"}}>
<span>👤 {t.beneficiary}</span><span>🏢 {t.entity}</span>
<span>📲 {t.platform}</span><span>🧑‍💼 {t.assignee}</span>
<span>📅 {formatDate(t.createdAt)}</span>
{t.submittedAt&&<span>📤 {formatDate(t.submittedAt)}</span>}
</div>
</div>
<div style={{display:"flex",gap:7,flexShrink:0}}>
<button onClick={()=>onView(t)} style={{padding:"6px 13px",background:C.bL,color:C.b1,border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>عرض</button>
<button onClick={()=>onEdit(t)} style={{padding:"6px 13px",background:"#e3f2fd",color:"#1565c0",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>تعديل</button>
{!t.closedAt&&<button onClick={()=>onClose(t)} style={{padding:"6px 13px",background:C.grayL,color:C.gray,border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>🔒 إغلاق</button>}
<button onClick={()=>{if(confirm("حذف البلاغ؟"))onDelete(t.id);}} style={{padding:"6px 13px",background:C.redL,color:C.red,border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>حذف</button>
</div>
</div>
);
})}
{filtered.length===0&&<div style={{textAlign:"center",padding:48,color:"#90a4ae"}}><div style={{fontSize:44,marginBottom:10}}>📭</div><div style={{fontSize:15,fontWeight:700}}>لا توجد بلاغات</div></div>}
</div>
</div>
);
};

// ===== التقارير =====
const ReportsView=({tickets})=>{
const [filter,setFilter]=useState({entity:"all",assignee:"all",from:"",to:"",status:"all"});
const setF=(k,v)=>setFilter(p=>({...p,[k]:v}));

const filtered=useMemo(()=>tickets.filter(t=>{
if(filter.entity!=="all"&&t.entity!==filter.entity) return false;
if(filter.assignee!=="all"&&t.assignee!==filter.assignee) return false;
if(filter.status==="open"&&t.closedAt) return false;
if(filter.status==="closed"&&!t.closedAt) return false;
if(filter.from&&t.createdAt<filter.from) return false;
if(filter.to&&t.createdAt>filter.to) return false;
return true;
}),[tickets,filter]);

const breached=filtered.filter(t=>{const s=calcSLAInfo(t);return s&&s.breached;}).length;
const closed=filtered.filter(t=>t.closedAt).length;
const totalEsc=filtered.reduce((s,t)=>s+(t.escalationCount||0),0);

const exportExcel=()=>{
const h=["رقم البلاغ","العنوان","المستفيد","المنصة","الجهة","المسؤول","تاريخ الإنشاء","تاريخ الرفع","تاريخ الإغلاق","سبب الإغلاق","الحالة","SLA","تصعيدات","تحويلات"];
const rows=filtered.map(t=>{
const sla=calcSLAInfo(t);const status=getStatus(t);
return [t.id,t.title,t.beneficiary,t.platform,t.entity,t.assignee,t.createdAt,t.submittedAt||"",t.closedAt||"",t.closeReason||"",status.label,sla?sla.label:"لم يُرفع",t.escalationCount||0,(t.transfers||[]).length];
});
const csv=[h,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));a.download="تقرير_البلاغات.csv";a.click();
};

const sI={padding:"8px 12px",borderRadius:9,border:"1.5px solid #b0bec5",fontSize:12,fontFamily:"Calibri,sans-serif",direction:"rtl",background:"#fafafa"};

return (
<div style={{direction:"rtl",fontFamily:"Calibri,sans-serif"}}>
<div style={{background:C.white,borderRadius:14,padding:18,marginBottom:18,boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",marginTop:0,marginBottom:14}}>🔍 تصفية التقرير</h3>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
<select style={sI} value={filter.entity} onChange={e=>setF("entity",e.target.value)}><option value="all">جميع الجهات</option>{ENTITIES.map(e=><option key={e}>{e}</option>)}</select>
<select style={sI} value={filter.assignee} onChange={e=>setF("assignee",e.target.value)}><option value="all">جميع المسؤولين</option>{ASSIGNEES.map(a=><option key={a}>{a}</option>)}</select>
<select style={sI} value={filter.status} onChange={e=>setF("status",e.target.value)}>
<option value="all">جميع الحالات</option>
<option value="open">مفتوحة</option>
<option value="closed">مغلقة</option>
</select>
<input type="date" style={sI} value={filter.from} onChange={e=>setF("from",e.target.value)}/>
<input type="date" style={sI} value={filter.to} onChange={e=>setF("to",e.target.value)}/>
<button onClick={()=>setFilter({entity:"all",assignee:"all",from:"",to:"",status:"all"})} style={{...sI,cursor:"pointer",background:C.white}}>↺ إعادة تعيين</button>
</div>
</div>

<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
{[["📋 إجمالي",filtered.length,C.b2],["✅ مغلقة",closed,C.gray],["🔺 تصعيدات",totalEsc,C.red],["⏰ تجاوز SLA",breached,C.orange]].map(([l,v,c])=>(
<div key={l} style={{background:C.white,borderRadius:12,padding:16,textAlign:"center",boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderTop:`3px solid ${c}`}}>
<div style={{fontSize:26,fontWeight:900,color:"#1a1a1a"}}>{v}</div>
<div style={{fontSize:12,color:C.gray,marginTop:4}}>{l}</div>
</div>
))}
</div>

<div style={{background:C.white,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:`linear-gradient(135deg,${C.b1},${C.b2})`,color:"#fff"}}>
<h3 style={{fontSize:14,fontWeight:800,margin:0,fontFamily:"Calibri,sans-serif"}}>نتائج التقرير ({filtered.length} بلاغ)</h3>
<button onClick={exportExcel} style={{padding:"8px 18px",background:"rgba(255,255,255,.2)",color:"#fff",border:"1px solid rgba(255,255,255,.4)",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>⬇ تصدير Excel</button>
</div>
<div style={{overflowX:"auto"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"Calibri,sans-serif"}}>
<thead>
<tr style={{background:C.bLL}}>
{["رقم البلاغ","العنوان","المستفيد","الجهة","المسؤول","تاريخ الإنشاء","تاريخ الرفع","الحالة","SLA","تصعيدات","تحويلات"].map(h=>(
<th key={h} style={{padding:"12px 13px",textAlign:"right",fontWeight:800,color:C.b1,borderBottom:`2px solid ${C.b5}`,whiteSpace:"nowrap"}}>{h}</th>
))}
</tr>
</thead>
<tbody>
{filtered.map((t,i)=>{
const sla=calcSLAInfo(t);const status=getStatus(t);
return (
<tr key={t.id} style={{background:i%2===0?C.white:C.bLL,borderBottom:`1px solid ${C.bL}`}}>
<td style={{padding:"10px 13px",fontWeight:800,color:C.b2,whiteSpace:"nowrap"}}>{t.id}</td>
<td style={{padding:"10px 13px",maxWidth:180}}>{t.title}</td>
<td style={{padding:"10px 13px"}}>{t.beneficiary}</td>
<td style={{padding:"10px 13px",whiteSpace:"nowrap"}}>{t.entity}</td>
<td style={{padding:"10px 13px",whiteSpace:"nowrap"}}>{t.assignee}</td>
<td style={{padding:"10px 13px",whiteSpace:"nowrap",color:C.gray}}>{formatDate(t.createdAt)}</td>
<td style={{padding:"10px 13px",whiteSpace:"nowrap",color:C.gray}}>{formatDate(t.submittedAt)}</td>
<td style={{padding:"10px 13px"}}><Badge color={status.color} bg={status.bg} label={status.label}/></td>
<td style={{padding:"10px 13px"}}>{sla?<Badge color={sla.color} bg={sla.bg} label={sla.label}/>:"—"}</td>
<td style={{padding:"10px 13px",textAlign:"center",fontWeight:800,color:(t.escalationCount||0)>0?C.red:C.b2}}>{t.escalationCount||0}</td>
<td style={{padding:"10px 13px",textAlign:"center",fontWeight:800,color:(t.transfers||[]).length>0?C.b2:C.gray}}>{(t.transfers||[]).length}</td>
</tr>
);
})}
</tbody>
</table>
{filtered.length===0&&<p style={{textAlign:"center",color:"#90a4ae",padding:32}}>لا توجد بيانات</p>}
</div>
</div>
</div>
);
};

// ===== التطبيق الرئيسي =====
export default function App() {
const [tickets,setTickets]=useState(()=>loadFromStorage()||INIT_TICKETS);
const [activeTab,setActiveTab]=useState("dashboard");
const [showForm,setShowForm]=useState(false);
const [editTicket,setEditTicket]=useState(null);
const [viewTicket,setViewTicket]=useState(null);
const [closeTicket,setCloseTicket]=useState(null);
const [saveMsg,setSaveMsg]=useState("");

const update=(next)=>{setTickets(next);saveToStorage(next);};

const saveTicket=(t)=>{
update(tickets.findIndex(x=>x.id===t.id)>=0
? tickets.map(x=>x.id===t.id?t:x)
: [t,...tickets]
);
setShowForm(false);setEditTicket(null);
};

const deleteTicket=(id)=>update(tickets.filter(t=>t.id!==id));

const closeTicketConfirm=(reason)=>{
const now=new Date().toISOString();
update(tickets.map(t=>t.id===closeTicket.id?{...t,closedAt:now,closeReason:reason}:t));
setCloseTicket(null);
};

const exportBackup=()=>{
const a=document.createElement("a");
a.href=URL.createObjectURL(new Blob([JSON.stringify({tickets,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"}));
a.download=`backup_${todayStr()}.json`;a.click();
setSaveMsg("✅ تم الحفظ!");setTimeout(()=>setSaveMsg(""),3000);
};

const importBackup=(e)=>{
const file=e.target.files[0];if(!file)return;
const r=new FileReader();
r.onload=(ev)=>{
try{
const d=JSON.parse(ev.target.result);
const imp=d.tickets||d;
if(Array.isArray(imp)){update(imp);setSaveMsg(`✅ استُورد ${imp.length} بلاغ`);setTimeout(()=>setSaveMsg(""),3000);}
}catch{alert("خطأ في الملف");}
};
r.readAsText(file);e.target.value="";
};

const breachedCount=tickets.filter(t=>{const s=calcSLAInfo(t);return s&&s.breached&&!t.closedAt;}).length;

const TABS=[{id:"dashboard",icon:"📊",label:"لوحة التحكم"},{id:"tickets",icon:"📋",label:"سجل البلاغات"},{id:"reports",icon:"📈",label:"التقارير"}];

return (
<div style={{minHeight:"100vh",background:C.bg,fontFamily:"Calibri,sans-serif",direction:"rtl"}}>
<header style={{background:`linear-gradient(135deg,${C.b1},${C.b2})`,padding:"0 22px",display:"flex",alignItems:"center",gap:12,height:62,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,.2)"}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{width:36,height:36,background:C.b5,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎛</div>
<div style={{color:"#fff"}}>
<div style={{fontSize:15,fontWeight:900,lineHeight:1,fontFamily:"Calibri,sans-serif"}}>متابعة البلاغات التقنية</div>
<div style={{fontSize:10,opacity:.65}}>Technical Ticket Management</div>
</div>
</div>
<nav style={{display:"flex",gap:3,marginRight:"auto"}}>
{TABS.map(t=>(
<button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"7px 16px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:"Calibri,sans-serif",background:activeTab===t.id?"rgba(255,255,255,.25)":"transparent",color:activeTab===t.id?"#fff":"rgba(255,255,255,.65)"}}>
{t.icon} {t.label}
</button>
))}
</nav>
{breachedCount>0&&<div style={{background:C.red,color:"#fff",padding:"5px 12px",borderRadius:9,fontSize:11,fontWeight:800,animation:"pulse 2s infinite"}}>⚠ {breachedCount} تجاوز SLA</div>}
{saveMsg&&<div style={{background:C.b5,color:C.b1,padding:"5px 12px",borderRadius:9,fontSize:11,fontWeight:800}}>{saveMsg}</div>}
<button onClick={exportBackup} style={{padding:"7px 12px",background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>💾 حفظ</button>
<label style={{padding:"7px 12px",background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>
📂 استيراد<input type="file" accept=".json" onChange={importBackup} style={{display:"none"}}/>
</label>
<button onClick={()=>{setEditTicket(null);setShowForm(true);}} style={{padding:"9px 18px",background:C.b5,color:C.b1,border:"none",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:900,whiteSpace:"nowrap",fontFamily:"Calibri,sans-serif"}}>＋ بلاغ جديد</button>
</header>

<main style={{maxWidth:1200,margin:"0 auto",padding:"22px 14px"}}>
{activeTab==="dashboard"&&<DashboardView tickets={tickets}/>}
{activeTab==="tickets"&&<TicketsList tickets={tickets} onEdit={t=>{setEditTicket(t);setShowForm(true);}} onView={t=>setViewTicket(t)} onDelete={deleteTicket} onClose={t=>setCloseTicket(t)}/>}
{activeTab==="reports"&&<ReportsView tickets={tickets}/>}
</main>

{showForm&&<TicketForm ticket={editTicket} onSave={saveTicket} onClose={()=>{setShowForm(false);setEditTicket(null);}}/>}
{viewTicket&&<TicketDetail ticket={viewTicket} onClose={()=>setViewTicket(null)}/>}
{closeTicket&&<CloseTicketModal ticket={closeTicket} onClose={()=>setCloseTicket(null)} onConfirm={closeTicketConfirm}/>}

<style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}} *{font-family:Calibri,sans-serif;}`}</style>
</div>
);
}
