import { useState, useMemo } from "react";

// =========================================
// الثوابت
// =========================================
const today = new Date();
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };

const TICKET_PLATFORMS = ["الهيئة", "أسهل", "تواصل اجتماعي"];
const FOLLOW_CHANNELS = ["أسهل", "بريد إلكتروني"];
const ENTITIES = ["آي سوفت", "أعمالي", "علم", "قسم الفحص الفني"];
const ASSIGNEES = ["أفنان الزهراني", "نوف العويس"];
const ESCALATION_TARGETS = ["رئيس البلاغات", "قسم الفحص الفني"];

const PRIORITY_LABELS = { high:"عالي", medium:"متوسط", low:"منخفض" };
const PRIORITY_COLORS = { high:"#e07b39", medium:"#d4a017", low:"#4a90a4" };

// حالتان فقط بناءً على SLA
const getTicketStatus = (ticket) => {
const sla = calcSLAInfo(ticket);
if (!sla) return { label:"قيد المعالجة ضمن SLA", color:"#2e7d32", bg:"#e8f5e9" };
if (sla.breached) return { label:`تجاوز SLA بـ ${sla.overDays} يوم`, color:"#c62828", bg:"#ffebee" };
return { label:"قيد المعالجة ضمن SLA", color:"#2e7d32", bg:"#e8f5e9" };
};

// ألوان فاتحة
const C = {
green: "#2e7d32",
greenL: "#e8f5e9",
green2: "#a5d6a7",
orange: "#e65100",
orangeL: "#fff3e0",
red: "#c62828",
redL: "#ffebee",
blue: "#1565c0",
blueL: "#e3f2fd",
gold: "#f9a825",
goldL: "#fffde7",
gray: "#546e7a",
grayL: "#eceff1",
bg: "#f5f7f5",
white: "#ffffff",
header1: "#1b5e20",
header2: "#2e7d32",
};

// =========================================
// حساب SLA
// =========================================
const calcWorkingDays = (startDate, endDate) => {
let count = 0;
const cur = new Date(startDate); cur.setHours(0,0,0,0);
const end = new Date(endDate); end.setHours(0,0,0,0);
while (cur < end) { const d = cur.getDay(); if (d!==5 && d!==6) count++; cur.setDate(cur.getDate()+1); }
return count;
};

const calcHoursDiff = (startDate) => {
const start = new Date(startDate);
const now = new Date();
return Math.floor((now - start) / 3600000);
};

const calcSLAInfo = (ticket) => {
if (!ticket) return null;
// نحسب SLA من تاريخ الرفع للجهة أو من تاريخ آخر تحويل
const transfers = ticket.transfers || [];
const lastTransfer = transfers.length > 0 ? transfers[transfers.length-1] : null;
const refDate = lastTransfer ? lastTransfer.date : ticket.submittedAt;
if (!refDate) return null;

const hours = calcHoursDiff(refDate);
const workDays = calcWorkingDays(refDate, new Date());
const SLA_DAYS = 3;
const breached = workDays >= SLA_DAYS;
const overDays = breached ? workDays - SLA_DAYS : 0;

let color = C.green;
let bg = C.greenL;
let label = "";
let warning = false;

if (hours < 24) {
color = C.green; bg = C.greenL;
const h = hours; label = `${h} ساعة`;
} else if (workDays < 2) {
color = C.green; bg = C.greenL;
label = `${workDays} يوم`;
} else if (workDays < 3) {
color = C.orange; bg = C.orangeL; warning = true;
label = `${workDays} يوم ⚠`;
} else {
color = C.red; bg = C.redL; warning = true;
label = `${workDays} يوم ✗`;
}

return { hours, workDays, breached, overDays, color, bg, label, warning, refDate };
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit"}) : "—";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—";
const todayStr = () => new Date().toISOString().slice(0,10);

// =========================================
// بيانات تجريبية
// =========================================
const INIT_TICKETS = [
{ id:"2025-001", title:"خطأ في عملية التحقق", platform:"الهيئة", followChannel:"أسهل", beneficiary:"محمد العمري", entity:"آي سوفت", assignee:"أفنان الزهراني", priority:"high", createdAt:daysAgo(7), submittedAt:daysAgo(7), closedAt:null, notes:"يؤثر على عمليات الهيئة", escalationCount:1, transfers:[], escalations:[] },
{ id:"2025-002", title:"تأخر استجابة النظام", platform:"أسهل", followChannel:"بريد إلكتروني", beneficiary:"سلطان الغامدي", entity:"أعمالي", assignee:"نوف العويس", priority:"medium", createdAt:daysAgo(4), submittedAt:daysAgo(4), closedAt:null, notes:"", escalationCount:0, transfers:[], escalations:[] },
{ id:"2025-003", title:"مشكلة في رفع المستندات", platform:"تواصل اجتماعي", followChannel:"أسهل", beneficiary:"هند الشهري", entity:"علم", assignee:"أفنان الزهراني", priority:"low", createdAt:daysAgo(10), submittedAt:daysAgo(9), closedAt:daysAgo(6), notes:"تم الحل بنجاح", escalationCount:0, transfers:[], escalations:[] },
{ id:"2025-004", title:"خلل في واجهة الدفع", platform:"أسهل", followChannel:"أسهل", beneficiary:"ريم القحطاني", entity:"آي سوفت", assignee:"أفنان الزهراني", priority:"high", createdAt:daysAgo(5), submittedAt:daysAgo(5), closedAt:null, notes:"قيد التحقيق", escalationCount:0, transfers:[], escalations:[] },
];

// =========================================
// مكونات مشتركة
// =========================================
const Badge = ({color, bg, label, size=12}) => (
<span style={{background:bg,color,padding:"3px 10px",borderRadius:20,fontSize:size,fontWeight:700,whiteSpace:"nowrap",border:`1px solid ${color}33`}}>{label}</span>
);

const SLATimer = ({ticket}) => {
const sla = calcSLAInfo(ticket);
if (!sla) return <Badge color={C.gray} bg={C.grayL} label="لم يُرفع بعد"/>;
return <Badge color={sla.color} bg={sla.bg} label={sla.label}/>;
};

const StatusBadge = ({ticket}) => {
const s = getTicketStatus(ticket);
return <Badge color={s.color} bg={s.bg} label={s.label}/>;
};

const Field = ({label, children}) => (
<div style={{display:"flex",flexDirection:"column",gap:5}}>
<label style={{fontSize:12,fontWeight:700,color:C.gray,fontFamily:"Calibri,sans-serif"}}>{label}</label>
{children}
</div>
);

const iS = {padding:"9px 13px",borderRadius:9,border:`1.5px solid #b0bec5`,fontSize:13,fontFamily:"Calibri,sans-serif",direction:"rtl",background:"#fafafa",width:"100%",boxSizing:"border-box"};

// =========================================
// نموذج البلاغ
// =========================================
const TicketForm = ({ticket, onSave, onClose}) => {
const empty = {id:"",title:"",platform:TICKET_PLATFORMS[0],followChannel:FOLLOW_CHANNELS[0],beneficiary:"",entity:ENTITIES[0],assignee:ASSIGNEES[0],priority:"medium",createdAt:todayStr(),submittedAt:"",closedAt:"",notes:"",escalationCount:0,transfers:[],escalations:[]};
const [form,setForm] = useState(ticket?{...empty,...ticket}:empty);
const [newTransferEntity,setNewTransferEntity] = useState("");
const set = (k,v) => setForm(p=>({...p,[k]:v}));

const handleTransfer = () => {
if (!newTransferEntity) return;
const now = new Date().toISOString();
const transfer = {from:form.entity, to:newTransferEntity, date:now};
setForm(p=>({...p, entity:newTransferEntity, transfers:[...(p.transfers||[]), transfer]}));
setNewTransferEntity("");
};

const save = () => {
if (!form.id.trim()) return alert("يرجى إدخال رقم البلاغ");
if (!form.title.trim()) return alert("يرجى إدخال عنوان البلاغ");
if (!form.beneficiary.trim()) return alert("يرجى إدخال اسم المستفيد");
onSave(form);
};

const sec = {background:"#f1f8f1",borderRadius:12,padding:"16px 18px",marginBottom:14,border:`1px solid #c8e6c9`};
const hdr = {fontSize:13,fontWeight:800,color:C.header1,marginTop:0,marginBottom:14,paddingBottom:8,borderBottom:`2px solid ${C.green2}`,fontFamily:"Calibri,sans-serif"};

return (
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:C.white,borderRadius:20,width:"100%",maxWidth:660,maxHeight:"93vh",overflowY:"auto",direction:"rtl",boxShadow:"0 20px 60px rgba(0,0,0,.2)",fontFamily:"Calibri,sans-serif"}}>
<div style={{background:`linear-gradient(135deg,${C.header1},${C.header2})`,padding:"20px 26px",borderRadius:"20px 20px 0 0",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<div style={{fontSize:11,opacity:.7,marginBottom:3}}>{form.id||"بلاغ جديد"}</div>
<h2 style={{margin:0,fontSize:18,fontWeight:900,fontFamily:"Calibri,sans-serif"}}>{ticket?"✏️ تعديل البلاغ":"➕ إضافة بلاغ جديد"}</h2>
</div>
<button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:17}}>✕</button>
</div>

<div style={{padding:"22px 26px"}}>
{/* بيانات البلاغ */}
<div style={sec}>
<h3 style={hdr}>📋 بيانات البلاغ</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
<Field label="رقم البلاغ *">
<input style={iS} value={form.id} onChange={e=>set("id",e.target.value)} placeholder="مثال: 2025-001"/>
</Field>
<Field label="منصة البلاغ">
<select style={{...iS,cursor:"pointer"}} value={form.platform} onChange={e=>set("platform",e.target.value)}>
{TICKET_PLATFORMS.map(p=><option key={p}>{p}</option>)}
</select>
</Field>
<Field label="اسم المستفيد *">
<input style={iS} value={form.beneficiary} onChange={e=>set("beneficiary",e.target.value)} placeholder="اسم المستفيد..."/>
</Field>
<Field label="أين يتابع البلاغ؟">
<select style={{...iS,cursor:"pointer"}} value={form.followChannel} onChange={e=>set("followChannel",e.target.value)}>
{FOLLOW_CHANNELS.map(c=><option key={c}>{c}</option>)}
</select>
</Field>
<div style={{gridColumn:"1/-1"}}>
<Field label="عنوان / وصف البلاغ *">
<input style={iS} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="وصف مختصر للمشكلة..."/>
</Field>
</div>
<Field label="المسؤول عن المتابعة">
<select style={{...iS,cursor:"pointer"}} value={form.assignee} onChange={e=>set("assignee",e.target.value)}>
{ASSIGNEES.map(a=><option key={a}>{a}</option>)}
</select>
</Field>
<Field label="الأولوية">
<select style={{...iS,cursor:"pointer"}} value={form.priority} onChange={e=>set("priority",e.target.value)}>
{Object.entries(PRIORITY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
</select>
</Field>
</div>
</div>

{/* الجهة المعنية */}
<div style={sec}>
<h3 style={hdr}>🏢 الجهة المعنية</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
<Field label="الجهة المعنية الحالية">
<select style={{...iS,cursor:"pointer"}} value={form.entity} onChange={e=>set("entity",e.target.value)}>
{ENTITIES.map(e=><option key={e}>{e}</option>)}
</select>
</Field>
<Field label="تاريخ الرفع للجهة المعنية">
<input type="date" style={iS} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/>
</Field>
</div>
{/* تحويل لجهة جديدة */}
<div style={{marginTop:14,padding:"12px 14px",background:C.goldL,borderRadius:10,border:`1px solid ${C.gold}`}}>
<div style={{fontSize:12,fontWeight:800,color:"#f57f17",marginBottom:8}}>🔄 تحويل البلاغ لجهة أخرى</div>
<div style={{display:"flex",gap:10,alignItems:"center"}}>
<select style={{...iS,flex:1}} value={newTransferEntity} onChange={e=>setNewTransferEntity(e.target.value)}>
<option value="">— اختر الجهة الجديدة —</option>
{ENTITIES.filter(e=>e!==form.entity).map(e=><option key={e}>{e}</option>)}
</select>
<button onClick={handleTransfer} disabled={!newTransferEntity} style={{padding:"9px 18px",background:newTransferEntity?C.header2:"#ccc",color:"#fff",border:"none",borderRadius:9,cursor:newTransferEntity?"pointer":"default",fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>تحويل الآن</button>
</div>
{form.transfers?.length>0 && (
<div style={{marginTop:10,fontSize:11,color:C.gray}}>
{form.transfers.map((t,i)=>(
<div key={i} style={{padding:"4px 0",borderBottom:`1px solid #ffe082`}}>
📌 من <strong>{t.from}</strong> إلى <strong>{t.to}</strong> — {formatDateTime(t.date)}
</div>
))}
</div>
)}
</div>
</div>

{/* التواريخ */}
<div style={sec}>
<h3 style={hdr}>📅 التواريخ</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
<Field label="تاريخ إنشاء البلاغ من المستفيد">
<input type="date" style={iS} value={form.createdAt} onChange={e=>set("createdAt",e.target.value)}/>
</Field>
<Field label="تاريخ رفع البلاغ (بداية SLA)">
<input type="date" style={iS} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/>
</Field>
<Field label="تاريخ الإغلاق / المعالجة">
<input type="date" style={iS} value={form.closedAt||""} onChange={e=>set("closedAt",e.target.value)}/>
</Field>
<div style={{display:"flex",alignItems:"center",background:C.greenL,borderRadius:9,padding:"10px 14px",border:`1px solid ${C.green2}`}}>
<span style={{fontSize:11,color:C.green,fontWeight:700,lineHeight:1.6}}>⏱ SLA: 3 أيام عمل<br/>🟢 24س | 🟠 48س | 🔴 72س<br/>(الأحد — الخميس فقط)</span>
</div>
</div>
</div>

{/* ملاحظات */}
<div style={sec}>
<h3 style={hdr}>📝 ملاحظات داخلية</h3>
<textarea style={{...iS,minHeight:70,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="ملاحظات إضافية..."/>
</div>

<div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
<button onClick={onClose} style={{padding:"10px 24px",borderRadius:10,border:`1.5px solid #b0bec5`,background:C.white,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>إلغاء</button>
<button onClick={save} style={{padding:"10px 28px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.header1},${C.header2})`,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>💾 حفظ البلاغ</button>
</div>
</div>
</div>
</div>
);
};

// =========================================
// نافذة عرض التفاصيل + التصعيد
// =========================================
const TicketDetail = ({ticket, onClose, onAddEscalation}) => {
const [escForm,setEscForm] = useState({date:todayStr(),escalatedTo:ESCALATION_TARGETS[0],notes:""});
const [showEsc,setShowEsc] = useState(false);
const sla = calcSLAInfo(ticket);
const status = getTicketStatus(ticket);

const addEsc = () => {
onAddEscalation({...escForm,id:Date.now(),ticketId:ticket.id,by:ticket.assignee});
setShowEsc(false);
setEscForm({date:todayStr(),escalatedTo:ESCALATION_TARGETS[0],notes:""});
};

const row = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid #e8f5e9`};

return (
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:C.white,borderRadius:20,width:"100%",maxWidth:700,maxHeight:"92vh",overflowY:"auto",direction:"rtl",boxShadow:"0 20px 60px rgba(0,0,0,.2)",fontFamily:"Calibri,sans-serif"}}>
{/* رأس */}
<div style={{background:`linear-gradient(135deg,${C.header1},${C.header2})`,padding:"22px 28px",borderRadius:"20px 20px 0 0",color:"#fff"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
<div>
<div style={{fontSize:11,opacity:.7,marginBottom:4}}>{ticket.id}</div>
<h2 style={{fontSize:19,fontWeight:900,margin:0,fontFamily:"Calibri,sans-serif"}}>{ticket.title}</h2>
<div style={{fontSize:12,opacity:.75,marginTop:4}}>المستفيد: {ticket.beneficiary} · {ticket.platform}</div>
</div>
<button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:17}}>✕</button>
</div>
<div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
<Badge color={status.color} bg="rgba(255,255,255,.2)" label={status.label}/>
{sla && <Badge color={sla.color} bg="rgba(255,255,255,.2)" label={`⏱ ${sla.label}`}/>}
{ticket.escalationCount>0 && <Badge color="#fff" bg="rgba(198,40,40,.5)" label={`🔺 ${ticket.escalationCount} تصعيد`}/>}
</div>
</div>

<div style={{padding:26}}>
{/* تفاصيل */}
<div style={{background:"#f1f8f1",borderRadius:12,padding:18,marginBottom:14,border:`1px solid #c8e6c9`}}>
<h3 style={{fontSize:13,fontWeight:800,color:C.header1,marginTop:0,marginBottom:12,fontFamily:"Calibri,sans-serif"}}>📋 تفاصيل البلاغ</h3>
{[
["الجهة المعنية الحالية", ticket.entity],
["المسؤول", ticket.assignee],
["المنصة", ticket.platform],
["قناة المتابعة", ticket.followChannel],
["تاريخ إنشاء البلاغ من المستفيد", formatDate(ticket.createdAt)],
["تاريخ رفع البلاغ (بداية SLA)", formatDate(ticket.submittedAt)],
["تاريخ الإغلاق", formatDate(ticket.closedAt)],
].map(([l,v])=>(
<div key={l} style={row}>
<span style={{color:C.gray,fontSize:13}}>{l}</span>
<strong style={{fontSize:13}}>{v||"—"}</strong>
</div>
))}
</div>

{/* تسلسل التحويلات */}
{ticket.transfers?.length>0 && (
<div style={{background:C.goldL,borderRadius:12,padding:18,marginBottom:14,border:`1px solid #ffe082`}}>
<h3 style={{fontSize:13,fontWeight:800,color:"#f57f17",marginTop:0,marginBottom:12,fontFamily:"Calibri,sans-serif"}}>🔄 تسلسل التحويلات</h3>
<div style={{fontSize:12,color:C.gray,lineHeight:2}}>
<div style={{padding:"6px 10px",background:C.white,borderRadius:8,marginBottom:6,border:`1px solid #ffe082`}}>
📌 البداية: <strong>{ticket.transfers[0]?.from||ticket.entity}</strong> — {formatDateTime(ticket.submittedAt)}
</div>
{ticket.transfers.map((t,i)=>(
<div key={i} style={{padding:"6px 10px",background:C.white,borderRadius:8,marginBottom:6,border:`1px solid #ffe082`}}>
↳ تحوّل من <strong>{t.from}</strong> إلى <strong>{t.to}</strong> — {formatDateTime(t.date)}
</div>
))}
</div>
</div>
)}

{/* ملاحظات */}
{ticket.notes && (
<div style={{background:C.blueL,borderRadius:12,padding:16,marginBottom:14,border:`1px solid #bbdefb`}}>
<h3 style={{fontSize:13,fontWeight:800,color:C.blue,marginTop:0,marginBottom:8,fontFamily:"Calibri,sans-serif"}}>📝 ملاحظات</h3>
<p style={{margin:0,color:"#374151",fontSize:13,lineHeight:1.8}}>{ticket.notes}</p>
</div>
)}

{/* سجل التصعيدات */}
<div style={{background:"#f1f8f1",borderRadius:12,padding:18,border:`1px solid #c8e6c9`}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
<h3 style={{fontSize:13,fontWeight:800,color:C.header1,margin:0,fontFamily:"Calibri,sans-serif"}}>🔺 سجل التصعيدات ({ticket.escalations?.length||0})</h3>
<button onClick={()=>setShowEsc(!showEsc)} style={{padding:"6px 14px",background:C.redL,color:C.red,border:`1.5px solid #ef9a9a`,borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>+ تسجيل تصعيد</button>
</div>

{showEsc && (
<div style={{background:C.white,borderRadius:10,padding:16,border:`1.5px solid #ef9a9a`,marginBottom:12}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
<Field label="تاريخ التصعيد">
<input type="date" style={iS} value={escForm.date} onChange={e=>setEscForm(p=>({...p,date:e.target.value}))}/>
</Field>
<Field label="إلى من؟">
<select style={{...iS,cursor:"pointer"}} value={escForm.escalatedTo} onChange={e=>setEscForm(p=>({...p,escalatedTo:e.target.value}))}>
{ESCALATION_TARGETS.map(t=><option key={t}>{t}</option>)}
</select>
</Field>
<div style={{gridColumn:"1/-1"}}>
<Field label="ملاحظات">
<input style={iS} value={escForm.notes} onChange={e=>setEscForm(p=>({...p,notes:e.target.value}))} placeholder="سبب التصعيد..."/>
</Field>
</div>
</div>
<div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
<button onClick={()=>setShowEsc(false)} style={{padding:"7px 16px",borderRadius:8,border:`1.5px solid #b0bec5`,background:C.white,cursor:"pointer",fontSize:12,fontFamily:"Calibri,sans-serif"}}>إلغاء</button>
<button onClick={addEsc} style={{padding:"7px 18px",borderRadius:8,border:"none",background:C.red,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>تسجيل</button>
</div>
</div>
)}

{(!ticket.escalations||ticket.escalations.length===0) ? (
<p style={{color:"#90a4ae",fontSize:13,textAlign:"center",padding:"14px 0"}}>لا توجد تصعيدات مسجلة</p>
) : (
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{ticket.escalations.map((e,i)=>(
<div key={e.id} style={{background:C.white,border:`1.5px solid #ef9a9a`,borderRadius:10,padding:"12px 16px"}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
<strong style={{color:C.red,fontSize:13}}>تصعيد #{i+1}</strong>
<span style={{color:C.gray,fontSize:12}}>{formatDate(e.date)}</span>
</div>
<p style={{margin:"4px 0",fontSize:13}}>إلى: <strong>{e.escalatedTo}</strong></p>
{e.notes&&<p style={{margin:"4px 0",fontSize:12,color:C.gray}}>{e.notes}</p>}
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

// =========================================
// لوحة التحكم
// =========================================
const DashboardView = ({tickets}) => {
const total = tickets.length;
const open = tickets.filter(t=>!t.closedAt).length;
const closed = tickets.filter(t=>t.closedAt).length;
const breached = tickets.filter(t=>{const s=calcSLAInfo(t);return s&&s.breached;}).length;
const escalated= tickets.filter(t=>t.escalationCount>0).length;
const totalEsc = tickets.reduce((s,t)=>s+(t.escalationCount||0),0);

// بيانات الرسم
const entityData = ENTITIES.map(e=>({
name:e.replace("قسم الفحص الفني","الفحص الفني"),
total:tickets.filter(t=>t.entity===e).length,
open:tickets.filter(t=>t.entity===e&&!t.closedAt).length,
})).filter(e=>e.total>0);

const maxVal = Math.max(...entityData.map(e=>e.total),1);

const KPI = ({icon,label,value,color,sub}) => (
<div style={{background:C.white,borderRadius:14,padding:"18px 20px",boxShadow:"0 2px 8px rgba(0,0,0,.06)",borderTop:`4px solid ${color}`,fontFamily:"Calibri,sans-serif"}}>
<div style={{fontSize:24}}>{icon}</div>
<div style={{fontSize:32,fontWeight:900,color:"#1a1a1a",lineHeight:1,marginTop:6}}>{value}</div>
<div style={{fontSize:13,color:C.gray,fontWeight:700,marginTop:4}}>{label}</div>
{sub&&<div style={{fontSize:11,color:"#90a4ae",marginTop:2}}>{sub}</div>}
</div>
);

// رسم بياني دائري بسيط
const PieChart = ({data}) => {
const total = data.reduce((s,d)=>s+d.value,0)||1;
let cumulative = 0;
const colors = [C.green,C.orange,C.red,C.blue,C.gold];
return (
<svg viewBox="0 0 100 100" width="160" height="160">
{data.map((d,i)=>{
const pct = d.value/total;
const startAngle = cumulative*360*Math.PI/180;
cumulative += pct;
const endAngle = cumulative*360*Math.PI/180;
const x1 = 50+40*Math.sin(startAngle);
const y1 = 50-40*Math.cos(startAngle);
const x2 = 50+40*Math.sin(endAngle);
const y2 = 50-40*Math.cos(endAngle);
const largeArc = pct>0.5?1:0;
if(pct===0)return null;
if(pct===1)return <circle key={i} cx="50" cy="50" r="40" fill={colors[i%colors.length]}/>;
return <path key={i} d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`} fill={colors[i%colors.length]}/>;
})}
<circle cx="50" cy="50" r="22" fill={C.white}/>
<text x="50" y="54" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1a1a1a">{total}</text>
</svg>
);
};

const pieData = [
{label:"مفتوحة",value:open},
{label:"مغلقة",value:closed},
{label:"تجاوزت SLA",value:breached},
].filter(d=>d.value>0);

const pieColors = [C.green,C.blue,C.red];

return (
<div style={{direction:"rtl",fontFamily:"Calibri,sans-serif"}}>
{/* KPIs */}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:24}}>
<KPI icon="📋" label="إجمالي البلاغات" value={total} color={C.green}/>
<KPI icon="🔵" label="مفتوحة" value={open} color={C.blue} sub={`${Math.round(open/Math.max(total,1)*100)}%`}/>
<KPI icon="✅" label="مغلقة" value={closed} color={C.green}/>
<KPI icon="🔺" label="بها تصعيد" value={escalated} color={C.red}/>
<KPI icon="⏰" label="تجاوزت SLA" value={breached} color={C.orange}/>
<KPI icon="📌" label="إجمالي التصعيدات" value={totalEsc} color={C.gold}/>
</div>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
{/* رسم دائري */}
<div style={{background:C.white,borderRadius:14,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",marginTop:0,marginBottom:18}}>توزيع البلاغات</h3>
<div style={{display:"flex",alignItems:"center",gap:20}}>
<PieChart data={pieData}/>
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{pieData.map((d,i)=>(
<div key={d.label} style={{display:"flex",alignItems:"center",gap:8}}>
<div style={{width:12,height:12,borderRadius:3,background:pieColors[i]}}/>
<span style={{fontSize:13,color:C.gray}}>{d.label}</span>
<strong style={{fontSize:13,color:pieColors[i]}}>{d.value}</strong>
</div>
))}
</div>
</div>
</div>

{/* رسم شريطي */}
<div style={{background:C.white,borderRadius:14,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",marginTop:0,marginBottom:18}}>البلاغات حسب الجهة</h3>
<div style={{display:"flex",flexDirection:"column",gap:12}}>
{entityData.map(e=>(
<div key={e.name}>
<div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
<span style={{fontWeight:700}}>{e.name}</span>
<span style={{color:C.gray}}>{e.open} مفتوح / {e.total}</span>
</div>
<div style={{background:"#e8f5e9",borderRadius:8,height:10,position:"relative",overflow:"hidden"}}>
<div style={{width:`${(e.total/maxVal)*100}%`,height:"100%",background:"#c8e6c9",borderRadius:8}}/>
<div style={{position:"absolute",top:0,right:0,width:`${(e.open/maxVal)*100}%`,height:"100%",background:C.green,borderRadius:8}}/>
</div>
</div>
))}
</div>
</div>

{/* SLA تنبيهات */}
<div style={{background:C.white,borderRadius:14,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,.06)",gridColumn:"1/-1"}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",marginTop:0,marginBottom:14}}>⏰ مؤقتات SLA</h3>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:10}}>
{tickets.filter(t=>!t.closedAt&&t.submittedAt).map(t=>{
const sla = calcSLAInfo(t);
if(!sla) return null;
return (
<div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:sla.bg,borderRadius:10,border:`1.5px solid ${sla.color}33`}}>
<div>
<strong style={{fontSize:13,color:"#1a1a1a"}}>{t.title}</strong>
<div style={{fontSize:11,color:C.gray,marginTop:2}}>{t.entity} · {t.assignee}</div>
</div>
<div style={{textAlign:"center"}}>
<div style={{fontSize:18,fontWeight:900,color:sla.color}}>{sla.label}</div>
<div style={{fontSize:10,color:C.gray}}>{sla.breached?"تجاوز SLA":"ضمن SLA"}</div>
</div>
</div>
);
})}
{tickets.filter(t=>!t.closedAt&&t.submittedAt).length===0 && (
<p style={{color:C.green,fontWeight:700,textAlign:"center",padding:16,background:C.greenL,borderRadius:10,gridColumn:"1/-1"}}>✅ جميع البلاغات ضمن SLA</p>
)}
</div>
</div>
</div>
</div>
);
};

// =========================================
// سجل البلاغات
// =========================================
const TicketsList = ({tickets,onEdit,onView,onDelete}) => {
const [search,setSearch]=useState("");
const [fE,setFE]=useState("all");
const [fA,setFA]=useState("all");
const [sort,setSort]=useState("createdAt");

const filtered = useMemo(()=>{
let l = tickets.filter(t=>{
if(fE!=="all"&&t.entity!==fE) return false;
if(fA!=="all"&&t.assignee!==fA) return false;
if(search&&!t.title.includes(search)&&!t.id.includes(search)&&!t.beneficiary.includes(search)) return false;
return true;
});
l.sort((a,b)=>{
if(sort==="createdAt") return new Date(b.createdAt)-new Date(a.createdAt);
if(sort==="sla"){ const sa=calcSLAInfo(a); const sb=calcSLAInfo(b); return (sb?.workDays||0)-(sa?.workDays||0); }
return (b.escalationCount||0)-(a.escalationCount||0);
});
return l;
},[tickets,search,fE,fA,sort]);

const sI={padding:"8px 12px",borderRadius:9,border:`1.5px solid #b0bec5`,fontSize:12,fontFamily:"Calibri,sans-serif",direction:"rtl",background:"#fafafa"};

return (
<div style={{direction:"rtl",fontFamily:"Calibri,sans-serif"}}>
<div style={{background:C.white,borderRadius:14,padding:14,marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
<input style={{...sI,flex:1,minWidth:180}} placeholder="🔍 بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
<select style={sI} value={fE} onChange={e=>setFE(e.target.value)}>
<option value="all">جميع الجهات</option>
{ENTITIES.map(e=><option key={e}>{e}</option>)}
</select>
<select style={sI} value={fA} onChange={e=>setFA(e.target.value)}>
<option value="all">جميع المسؤولين</option>
{ASSIGNEES.map(a=><option key={a}>{a}</option>)}
</select>
<select style={sI} value={sort} onChange={e=>setSort(e.target.value)}>
<option value="createdAt">الأحدث</option>
<option value="sla">حسب SLA</option>
<option value="escalations">التصعيدات</option>
</select>
</div>

<div style={{display:"flex",flexDirection:"column",gap:10}}>
{filtered.map(t=>{
const sla = calcSLAInfo(t);
const status = getTicketStatus(t);
return (
<div key={t.id} style={{background:C.white,borderRadius:13,padding:"14px 18px",boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderRight:`4px solid ${sla?.color||C.gray}`,display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
<div style={{flex:1,minWidth:0}}>
<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:6}}>
<span style={{fontSize:11,fontWeight:800,color:C.gray,background:C.grayL,padding:"2px 8px",borderRadius:6}}>{t.id}</span>
<StatusBadge ticket={t}/>
{sla&&<SLATimer ticket={t}/>}
{t.escalationCount>0&&<Badge color={C.red} bg={C.redL} label={`🔺 ${t.escalationCount}`}/>}
{t.transfers?.length>0&&<Badge color="#f57f17" bg={C.goldL} label={`🔄 محوّل ${t.transfers.length}×`}/>}
</div>
<h4 style={{margin:0,fontSize:14,fontWeight:800,color:"#1a1a1a",marginBottom:5}}>{t.title}</h4>
<div style={{fontSize:12,color:C.gray,display:"flex",gap:12,flexWrap:"wrap"}}>
<span>👤 {t.beneficiary}</span>
<span>🏢 {t.entity}</span>
<span>📲 {t.platform}</span>
<span>🧑‍💼 {t.assignee}</span>
<span>📅 {formatDate(t.createdAt)}</span>
{t.submittedAt&&<span>📤 رُفع: {formatDate(t.submittedAt)}</span>}
</div>
</div>
<div style={{display:"flex",gap:7,flexShrink:0}}>
<button onClick={()=>onView(t)} style={{padding:"6px 13px",background:C.blueL,color:C.blue,border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>عرض</button>
<button onClick={()=>onEdit(t)} style={{padding:"6px 13px",background:C.greenL,color:C.green,border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>تعديل</button>
<button onClick={()=>{if(confirm("حذف البلاغ؟"))onDelete(t.id);}} style={{padding:"6px 13px",background:C.redL,color:C.red,border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Calibri,sans-serif"}}>حذف</button>
</div>
</div>
);
})}
{filtered.length===0&&(
<div style={{textAlign:"center",padding:48,color:"#90a4ae"}}>
<div style={{fontSize:44,marginBottom:10}}>📭</div>
<div style={{fontSize:15,fontWeight:700}}>لا توجد بلاغات</div>
</div>
)}
</div>
</div>
);
};

// =========================================
// التقارير
// =========================================
const ReportsView = ({tickets}) => {
const [filter,setFilter]=useState({entity:"all",assignee:"all",from:"",to:""});
const setF=(k,v)=>setFilter(p=>({...p,[k]:v}));

const filtered = useMemo(()=>tickets.filter(t=>{
if(filter.entity!=="all"&&t.entity!==filter.entity) return false;
if(filter.assignee!=="all"&&t.assignee!==filter.assignee) return false;
if(filter.from&&t.createdAt<filter.from) return false;
if(filter.to&&t.createdAt>filter.to) return false;
return true;
}),[tickets,filter]);

const breached = filtered.filter(t=>{const s=calcSLAInfo(t);return s&&s.breached;}).length;
const closed = filtered.filter(t=>t.closedAt).length;
const totalEsc = filtered.reduce((s,t)=>s+(t.escalationCount||0),0);

const exportExcel = () => {
const h = ["رقم البلاغ","العنوان","المستفيد","المنصة","الجهة","المسؤول","الأولوية","الحالة","تاريخ الإنشاء","تاريخ الرفع","تاريخ الإغلاق","عدد التصعيدات","حالة SLA","أيام SLA"];
const rows = filtered.map(t=>{
const sla = calcSLAInfo(t);
const status = getTicketStatus(t);
return [t.id,t.title,t.beneficiary,t.platform,t.entity,t.assignee,PRIORITY_LABELS[t.priority]||"",status.label,t.createdAt,t.submittedAt||"",t.closedAt||"",t.escalationCount||0,sla?sla.label:"لم يُرفع",sla?.workDays||0];
});
const csv = [h,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="تقرير_البلاغات.csv"; a.click();
};

const sI={padding:"8px 12px",borderRadius:9,border:`1.5px solid #b0bec5`,fontSize:12,fontFamily:"Calibri,sans-serif",direction:"rtl",background:"#fafafa"};

return (
<div style={{direction:"rtl",fontFamily:"Calibri,sans-serif"}}>
<div style={{background:C.white,borderRadius:14,padding:18,marginBottom:18,boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",marginTop:0,marginBottom:14}}>🔍 تصفية التقرير</h3>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
<select style={sI} value={filter.entity} onChange={e=>setF("entity",e.target.value)}>
<option value="all">جميع الجهات</option>
{ENTITIES.map(e=><option key={e}>{e}</option>)}
</select>
<select style={sI} value={filter.assignee} onChange={e=>setF("assignee",e.target.value)}>
<option value="all">جميع المسؤولين</option>
{ASSIGNEES.map(a=><option key={a}>{a}</option>)}
</select>
<input type="date" style={sI} value={filter.from} onChange={e=>setF("from",e.target.value)}/>
<input type="date" style={sI} value={filter.to} onChange={e=>setF("to",e.target.value)}/>
<button onClick={()=>setFilter({entity:"all",assignee:"all",from:"",to:""})} style={{...sI,cursor:"pointer",background:C.white}}>↺ إعادة تعيين</button>
</div>
</div>

<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
{[["📋 إجمالي",filtered.length,C.green],["✅ مغلقة",closed,"#2e7d32"],["🔺 تصعيدات",totalEsc,C.red],["⏰ تجاوز SLA",breached,C.orange]].map(([l,v,c])=>(
<div key={l} style={{background:C.white,borderRadius:12,padding:16,textAlign:"center",boxShadow:"0 2px 6px rgba(0,0,0,.06)",borderTop:`3px solid ${c}`}}>
<div style={{fontSize:26,fontWeight:900,color:"#1a1a1a"}}>{v}</div>
<div style={{fontSize:12,color:C.gray,marginTop:4}}>{l}</div>
</div>
))}
</div>

<div style={{background:C.white,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid #e8f5e9`}}>
<h3 style={{fontSize:14,fontWeight:800,color:"#1a1a1a",margin:0}}>النتائج ({filtered.length} بلاغ)</h3>
<button onClick={exportExcel} style={{padding:"8px 18px",background:C.green,color:C.white,border:"none",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:800,fontFamily:"Calibri,sans-serif"}}>⬇ تصدير Excel</button>
</div>
<div style={{overflowX:"auto"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"Calibri,sans-serif"}}>
<thead>
<tr style={{background:"#f1f8f1"}}>
{["رقم البلاغ","العنوان","المستفيد","الجهة","المسؤول","تاريخ الإنشاء","تاريخ الرفع","الحالة","SLA","تصعيدات"].map(h=>(
<th key={h} style={{padding:"11px 13px",textAlign:"right",fontWeight:800,color:C.gray,borderBottom:`1px solid #c8e6c9`,whiteSpace:"nowrap"}}>{h}</th>
))}
</tr>
</thead>
<tbody>
{filtered.map((t,i)=>{
const sla=calcSLAInfo(t);
const status=getTicketStatus(t);
return (
<tr key={t.id} style={{background:i%2===0?C.white:"#f9fbe7"}}>
<td style={{padding:"9px 13px",fontWeight:800,color:C.blue,whiteSpace:"nowrap"}}>{t.id}</td>
<td style={{padding:"9px 13px",maxWidth:180}}>{t.title}</td>
<td style={{padding:"9px 13px"}}>{t.beneficiary}</td>
<td style={{padding:"9px 13px",whiteSpace:"nowrap"}}>{t.entity}</td>
<td style={{padding:"9px 13px",whiteSpace:"nowrap"}}>{t.assignee}</td>
<td style={{padding:"9px 13px",whiteSpace:"nowrap",color:C.gray}}>{formatDate(t.createdAt)}</td>
<td style={{padding:"9px 13px",whiteSpace:"nowrap",color:C.gray}}>{formatDate(t.submittedAt)}</td>
<td style={{padding:"9px 13px"}}><Badge color={status.color} bg={status.bg} label={status.label}/></td>
<td style={{padding:"9px 13px"}}>{sla?<Badge color={sla.color} bg={sla.bg} label={sla.label}/>:"—"}</td>
<td style={{padding:"9px 13px",textAlign:"center",fontWeight:800,color:(t.escalationCount||0)>0?C.red:C.green}}>{t.escalationCount||0}</td>
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

// =========================================
// التطبيق الرئيسي
// =========================================
export default function App() {
const [tickets,setTickets] = useState(INIT_TICKETS);
const [activeTab,setActiveTab] = useState("dashboard");
const [showForm,setShowForm] = useState(false);
const [editTicket,setEditTicket] = useState(null);
const [viewTicket,setViewTicket] = useState(null);

const saveTicket = (t) => {
setTickets(prev=>{
const i=prev.findIndex(x=>x.id===t.id);
if(i>=0){const n=[...prev];n[i]=t;return n;}
return [t,...prev];
});
setShowForm(false); setEditTicket(null);
};

const deleteTicket = (id) => setTickets(prev=>prev.filter(t=>t.id!==id));

const addEscalation = (esc) => {
setTickets(prev=>prev.map(t=>t.id===esc.ticketId
? {...t, escalationCount:(t.escalationCount||0)+1, escalations:[...(t.escalations||[]),esc]}
: t
));
setViewTicket(prev=>prev?{...prev,escalationCount:(prev.escalationCount||0)+1,escalations:[...(prev.escalations||[]),esc]}:prev);
};

const breachedCount = tickets.filter(t=>{const s=calcSLAInfo(t);return s&&s.breached;}).length;

const TABS = [
{id:"dashboard",icon:"📊",label:"لوحة التحكم"},
{id:"tickets",icon:"📋",label:"سجل البلاغات"},
{id:"reports",icon:"📈",label:"التقارير"},
];

return (
<div style={{minHeight:"100vh",background:C.bg,fontFamily:"Calibri,sans-serif",direction:"rtl"}}>
<header style={{background:`linear-gradient(135deg,${C.header1},${C.header2})`,padding:"0 22px",display:"flex",alignItems:"center",gap:16,height:62,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,.2)"}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{width:36,height:36,background:"#a5d6a7",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎛</div>
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

{breachedCount>0&&(
<div style={{background:C.red,color:"#fff",padding:"5px 12px",borderRadius:9,fontSize:11,fontWeight:800,animation:"pulse 2s infinite"}}>
⚠ {breachedCount} تجاوز SLA
</div>
)}

<button onClick={()=>{setEditTicket(null);setShowForm(true);}} style={{padding:"9px 18px",background:"#a5d6a7",color:C.header1,border:"none",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:900,whiteSpace:"nowrap",fontFamily:"Calibri,sans-serif"}}>
＋ بلاغ جديد
</button>
</header>

<main style={{maxWidth:1200,margin:"0 auto",padding:"22px 14px"}}>
{activeTab==="dashboard"&&<DashboardView tickets={tickets}/>}
{activeTab==="tickets"&&<TicketsList tickets={tickets} onEdit={t=>{setEditTicket(t);setShowForm(true);}} onView={t=>setViewTicket(t)} onDelete={deleteTicket}/>}
{activeTab==="reports"&&<ReportsView tickets={tickets}/>}
</main>

{showForm&&<TicketForm ticket={editTicket} onSave={saveTicket} onClose={()=>{setShowForm(false);setEditTicket(null);}}/>}
{viewTicket&&<TicketDetail ticket={viewTicket} onClose={()=>setViewTicket(null)} onAddEscalation={addEscalation}/>}

<style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}} * {font-family:Calibri,sans-serif;}`}</style>
</div>
);
}
