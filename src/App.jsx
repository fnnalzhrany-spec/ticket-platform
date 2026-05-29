import { useState, useMemo } from "react";

// =========================================
// LAYER 1: CONFIG — كل الثوابت في مكان واحد
// =========================================
const CONFIG = {
platforms: ["الهيئة", "أسهل", "تواصل اجتماعي"],
channels: ["أسهل", "بريد إلكتروني"],
entities: ["آي سوفت", "أعمالي", "علم", "قسم الفحص الفني"],
assignees: ["أفنان الزهراني", "نوف العويس"],
escalationTargets: ["رئيس البلاغات", "قسم الفحص الفني"],
closeReasons: [
"تمت المعالجة من الجهة المعنية",
"لا يوجد تجاوب من الجهة المعنية وتم التواصل مع المستفيد وأُشعر بالمعالجة",
],
priority: {
labels: { high:"عالي", medium:"متوسط", low:"منخفض" },
colors: { high:"#c2410c", medium:"#b45309", low:"#0369a1" },
},
sla: { days: 3 },
storage: { key: "tickets_v4", version: 4, version: 4 },
};

// =========================================
// LAYER 2: DESIGN TOKENS — نظام التصميم
// =========================================
const T = {
// Palette
primary: "#0a1f44",
primary2: "#1a3a6b",
primary3: "#2351a3",
primary4: "#4a7fd4",
primary5: "#a8c4e8",
primaryL: "#dce8f7",
primaryLL: "#f2f7fd",
success: "#2e7d32",
successL: "#e8f5e9",
warning: "#e65100",
warningL: "#fff3e0",
danger: "#c62828",
dangerL: "#ffebee",
gold: "#c8952a",
goldL: "#fdf4e3",
neutral: "#4a5568",
neutralL: "#edf2f7",
bg: "#eef3f9",
white: "#ffffff",
// Typography
font: "Calibri, sans-serif",
// Shadows
card: "0 2px 8px rgba(0,0,0,.07)",
modal: "0 20px 60px rgba(0,0,0,.2)",
// Radii
sm: 8, md: 12, lg: 16, xl: 20,
};

// Style factories — تقليل التكرار
const S = {
card: (extra={}) => ({ background:T.white, borderRadius:T.lg, padding:22, boxShadow:T.card, ...extra }),
section: (extra={}) => ({ background:T.primaryLL, borderRadius:T.md, padding:"16px 18px", marginBottom:14, border:`1.5px solid ${T.primary5}`, ...extra }),
header: (extra={}) => ({ fontSize:13, fontWeight:800, color:T.primary, marginTop:0, marginBottom:14, paddingBottom:8, borderBottom:`2px solid ${T.primary5}`, fontFamily:T.font, ...extra }),
input: (extra={}) => ({ padding:"9px 13px", borderRadius:T.sm, border:"1.5px solid #b0bec5", fontSize:13, fontFamily:T.font, direction:"rtl", background:"#fafafa", width:"100%", boxSizing:"border-box", ...extra }),
btn: (bg, color, extra={}) => ({ padding:"9px 18px", borderRadius:T.sm, border:"none", background:bg, color, cursor:"pointer", fontSize:12, fontWeight:800, fontFamily:T.font, whiteSpace:"nowrap", ...extra }),
row: (extra={}) => ({ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${T.primaryL}`, ...extra }),
};

// =========================================
// LAYER 3: SLA ENGINE — محرك SLA منعزل
// =========================================
const SLAEngine = {
// حساب أيام العمل (الأحد - الخميس)
workingDaysBetween(start, end) {
try {
let count = 0;
const cur = new Date(start); cur.setHours(0,0,0,0);
const fin = new Date(end); fin.setHours(0,0,0,0);
if (isNaN(cur)||isNaN(fin)) return 0;
let guard = 0;
while (cur < fin && guard++ < 400) {
const d = cur.getDay();
if (d !== 5 && d !== 6) count++;
cur.setDate(cur.getDate() + 1);
}
return count;
} catch { return 0; }
},

// المرجع الزمني: آخر تحويل أو تاريخ الرفع
getRefDate(ticket) {
const transfers = ticket.transfers || [];
if (transfers.length > 0) {
const last = transfers[transfers.length - 1];
const d = new Date(last.date);
if (!isNaN(d)) return last.date;
}
return ticket.submittedAt || null;
},

// تحليل SLA الكامل
analyze(ticket) {
const refDate = SLAEngine.getRefDate(ticket);
if (!refDate) return null;

const ref = new Date(refDate);
if (isNaN(ref)) return null;

const now = new Date();
const hours = Math.max(0, Math.floor((now - ref) / 3_600_000));
const workDays = SLAEngine.workingDaysBetween(refDate, now);
const breached = workDays >= CONFIG.sla.days;
const overDays = breached ? workDays - CONFIG.sla.days : 0;

// اللون والتسمية
let color, bg, label;
if (hours < 24) { color=T.success; bg=T.successL; label = hours === 0 ? "أقل من ساعة" : `${hours} ساعة`; }
else if (workDays < 2) { color=T.success; bg=T.successL; label = `${workDays} يوم`; }
else if (workDays < 3) { color=T.warning; bg=T.warningL; label = `${workDays} يوم ⚠`; }
else { color=T.danger; bg=T.dangerL; label = `${workDays} يوم ✗`; }

return { hours, workDays, breached, overDays, color, bg, label, refDate };
},
};

// =========================================
// LAYER 4: TICKET SERVICE — منطق الأعمال
// =========================================
const TicketService = {
validate(form) {
const e = [];
if (!form.id?.trim()) e.push("رقم البلاغ مطلوب");
if (!form.title?.trim()) e.push("عنوان البلاغ مطلوب");
if (!form.beneficiary?.trim()) e.push("اسم المستفيد مطلوب");
return e;
},

getStatus(ticket) {
if (ticket.closedAt) return { label:"مغلق", color:T.neutral, bg:T.neutralL };
if (!ticket.submittedAt) return { label:"لم يُرفع للجهة بعد", color:T.neutral, bg:T.neutralL };
const sla = SLAEngine.analyze(ticket);
if (!sla) return { label:"لم يُرفع للجهة بعد", color:T.neutral, bg:T.neutralL };
if (sla.breached) return { label:`تجاوز SLA — ${sla.overDays} يوم`, color:T.danger, bg:T.dangerL };
if (sla.workDays >= 2) return { label:"قارب انتهاء SLA", color:T.warning, bg:T.warningL };
return { label:"ضمن SLA", color:T.success, bg:T.successL };
},

createTransfer(fromEntity, toEntity) {
return { id: Date.now().toString(), from: fromEntity, to: toEntity, date: new Date().toISOString() };
},

createEscalation(data, assignee) {
return { id: Date.now().toString(), escalatedTo: data.escalatedTo, date: data.date,
notes: data.notes || "", by: assignee, addedAt: new Date().toISOString() };
},

summarize(tickets) {
const open = tickets.filter(t => !t.closedAt);
const breached = open.filter(t => SLAEngine.analyze(t)?.breached);
return {
total: tickets.length,
open: open.length,
closed: tickets.filter(t => t.closedAt).length,
breached: breached.length,
withinSLA: Math.max(0, open.length - breached.length),
escalated: tickets.filter(t => (t.escalationCount||0) > 0).length,
totalEsc: tickets.reduce((s,t) => s + (t.escalationCount||0), 0),
};
},
};

// =========================================
// LAYER 5: STORAGE SERVICE — طبقة التخزين
// =========================================
const StorageService = {
_v: 4,
load() {
try {
const raw = localStorage.getItem(CONFIG.storage.key);
if (!raw) return null;
const { data, version } = JSON.parse(raw);
return version === this._v ? data : null;
} catch { return null; }
},

save(tickets) {
try {
localStorage.setItem(CONFIG.storage.key, JSON.stringify(
{ data: tickets, version: CONFIG.storage.version, savedAt: new Date().toISOString() }
));
return true;
} catch { return false; }
},

exportJSON(tickets) {
const url = URL.createObjectURL(new Blob(
[JSON.stringify({ tickets, exportedAt: new Date().toISOString(), count: tickets.length }, null, 2)],
{ type: "application/json" }
));
Object.assign(document.createElement("a"), {
href: url, download: `backup_${new Date().toISOString().slice(0,10)}.json`
}).click();
URL.revokeObjectURL(url);
},

importJSON(file) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = ({ target }) => {
try {
const parsed = JSON.parse(target.result);
const raw = parsed.tickets || parsed;
if (!Array.isArray(raw)) throw new Error("تنسيق غير صحيح");
const valid = raw.filter(t => t.id && t.title && t.entity);
if (!valid.length) throw new Error("لا توجد بيانات صالحة");
resolve(valid);
} catch (e) { reject(e); }
};
reader.onerror = () => reject(new Error("فشل قراءة الملف"));
reader.readAsText(file);
});
},
};

// =========================================
// LAYER 6: SEED DATA — بيانات أولية
// =========================================
const d = (n) => { const x = new Date(); x.setDate(x.getDate()-n); return x.toISOString().slice(0,10); };
const SEED_TICKETS = [
{ id:"2025-001", title:"خطأ في عملية التحقق", platform:"الهيئة", followChannel:"أسهل", beneficiary:"محمد العمري", entity:"آي سوفت", assignee:"أفنان الزهراني", priority:"high", createdAt:d(7), submittedAt:d(7), closedAt:null, closeReason:null, notes:"يؤثر على عمليات الهيئة", escalationCount:1, transfers:[], escalations:[] },
{ id:"2025-002", title:"تأخر استجابة النظام", platform:"أسهل", followChannel:"بريد إلكتروني", beneficiary:"سلطان الغامدي", entity:"أعمالي", assignee:"نوف العويس", priority:"medium", createdAt:d(4), submittedAt:d(4), closedAt:null, closeReason:null, notes:"", escalationCount:0, transfers:[], escalations:[] },
{ id:"2025-003", title:"مشكلة في رفع المستندات", platform:"تواصل اجتماعي", followChannel:"أسهل", beneficiary:"هند الشهري", entity:"علم", assignee:"أفنان الزهراني", priority:"low", createdAt:d(10), submittedAt:d(9), closedAt:d(6), closeReason:"تمت المعالجة من الجهة المعنية", notes:"تم الحل", escalationCount:0, transfers:[], escalations:[] },
{ id:"2025-004", title:"خلل في واجهة الدفع", platform:"أسهل", followChannel:"أسهل", beneficiary:"ريم القحطاني", entity:"آي سوفت", assignee:"أفنان الزهراني", priority:"high", createdAt:d(5), submittedAt:d(5), closedAt:null, closeReason:null, notes:"قيد التحقيق", escalationCount:0, transfers:[], escalations:[] },
{ id:"2025-005", title:"عدم إرسال رمز التحقق", platform:"الهيئة", followChannel:"بريد إلكتروني", beneficiary:"فيصل الحربي", entity:"أعمالي", assignee:"نوف العويس", priority:"medium", createdAt:d(1), submittedAt:null, closedAt:null, closeReason:null, notes:"", escalationCount:0, transfers:[], escalations:[] },
];

// =========================================
// LAYER 7: SHARED COMPONENTS — مكونات مشتركة
// =========================================
const Badge = ({ color, bg, label, size=12 }) => (
<span style={{ background:bg, color, padding:"3px 10px", borderRadius:20, fontSize:size,
fontWeight:700, whiteSpace:"nowrap", border:`1px solid ${color}33` }}>
{label}
</span>
);

const SLABadge = ({ ticket }) => {
const sla = SLAEngine.analyze(ticket);
if (!sla) return <Badge color={T.neutral} bg={T.neutralL} label="لم يُرفع بعد" />;
return <Badge color={sla.color} bg={sla.bg} label={sla.label} />;
};

const StatusBadge = ({ ticket }) => {
const s = TicketService.getStatus(ticket);
return <Badge color={s.color} bg={s.bg} label={s.label} />;
};

const Field = ({ label, children }) => (
<div style={{ display:"flex", flexDirection:"column", gap:5 }}>
<label style={{ fontSize:12, fontWeight:700, color:T.neutral, fontFamily:T.font }}>{label}</label>
{children}
</div>
);

const Timeline = ({ items, color, emptyMsg }) => (
items.length === 0
? <p style={{ color:"#90a4ae", fontSize:12, textAlign:"center", padding:"8px 0" }}>{emptyMsg}</p>
: <div style={{ position:"relative", paddingRight:20 }}>
<div style={{ position:"absolute", right:8, top:0, bottom:0, width:2, background:`${color}55` }}/>
{items.map((item, i) => (
<div key={item.id||i} style={{ position:"relative", marginBottom:12, paddingRight:16 }}>
<div style={{ position:"absolute", right:-4, top:4, width:10, height:10,
borderRadius:"50%", background:color, border:`2px solid ${T.white}` }}/>
<div style={{ background:T.white, borderRadius:T.sm, padding:"10px 14px",
border:`1px solid ${color}44` }}>
{item.render()}
</div>
</div>
))}
</div>
);

// =========================================
// LAYER 8: FORM COMPONENTS — مكونات النماذج
// =========================================
const TransferSection = ({ form, setForm }) => {
const [target, setTarget] = useState("");
const available = CONFIG.entities.filter(e => e !== form.entity);

const apply = () => {
if (!target || target === form.entity) return;
const tr = TicketService.createTransfer(form.entity, target);
setForm(p => ({ ...p, entity: target, transfers: [...(p.transfers||[]), tr] }));
setTarget("");
};

return (
<div>
<div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
<select style={{ ...S.input(), flex:1, cursor:"pointer" }} value={target} onChange={e=>setTarget(e.target.value)}>
<option value="">— اختر الجهة الجديدة —</option>
{available.map(e => <option key={e}>{e}</option>)}
</select>
<button onClick={apply} disabled={!target}
style={S.btn(target ? T.primary2 : "#ccc", T.white)}>
تحويل الآن
</button>
</div>
{(form.transfers||[]).length > 0 && (
<div style={{ fontSize:11, color:T.neutral }}>
{form.transfers.map((t,i) => (
<div key={t.id||i} style={{ padding:"4px 10px", background:T.white, borderRadius:6,
marginBottom:4, border:`1px solid ${T.primary5}` }}>
📌 من <strong>{t.from}</strong> → <strong>{t.to}</strong>
</div>
))}
</div>
)}
</div>
);
};

const EscalationSection = ({ form, setForm }) => {
const [data, setData] = useState({ date: new Date().toISOString().slice(0,10),
escalatedTo: CONFIG.escalationTargets[0], notes: "" });
const add = () => {
if (!data.escalatedTo) return;
const esc = TicketService.createEscalation(data, form.assignee);
setForm(p => ({ ...p, escalationCount:(p.escalationCount||0)+1,
escalations: [...(p.escalations||[]), esc] }));
setData(p => ({ ...p, notes:"" }));
};

return (
<div>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
<Field label="تاريخ التصعيد">
<input type="date" style={S.input()} value={data.date}
onChange={e => setData(p=>({...p,date:e.target.value}))} />
</Field>
<Field label="إلى من؟">
<select style={{ ...S.input(), cursor:"pointer" }} value={data.escalatedTo}
onChange={e => setData(p=>({...p,escalatedTo:e.target.value}))}>
{CONFIG.escalationTargets.map(t => <option key={t}>{t}</option>)}
</select>
</Field>
<div style={{ gridColumn:"1/-1" }}>
<Field label="سبب التصعيد">
<input style={S.input()} value={data.notes} placeholder="سبب التصعيد..."
onChange={e => setData(p=>({...p,notes:e.target.value}))} />
</Field>
</div>
</div>
<button onClick={add} style={S.btn(T.danger, T.white)}>+ تسجيل التصعيد</button>
</div>
);
};

// =========================================
// LAYER 9: TICKET FORM — نموذج البلاغ
// =========================================
const EMPTY_TICKET = {
id:"", title:"", platform:CONFIG.platforms[0], followChannel:CONFIG.channels[0],
beneficiary:"", entity:CONFIG.entities[0], assignee:CONFIG.assignees[0],
priority:"medium", createdAt:new Date().toISOString().slice(0,10),
submittedAt:"", closedAt:"", closeReason:null,
notes:"", escalationCount:0, transfers:[], escalations:[],
};

const TicketForm = ({ ticket, onSave, onClose }) => {
const [form, setForm] = useState(ticket ? { ...EMPTY_TICKET, ...ticket } : EMPTY_TICKET);
const isEdit = !!ticket;
const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

const sI = S.input();
const sec = S.section();
const hdr = S.header();

return (
<div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000,
display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
<div style={{ background:T.white, borderRadius:T.xl, width:"100%", maxWidth:660,
maxHeight:"93vh", overflowY:"auto", direction:"rtl", boxShadow:T.modal }}>
{/* Header */}
<div style={{ background:`linear-gradient(135deg,${T.primary},${T.primary2})`,
padding:"20px 26px", borderRadius:`${T.xl}px ${T.xl}px 0 0`,
color:T.white, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div>
<div style={{ fontSize:11, opacity:.7, marginBottom:3 }}>{form.id || "بلاغ جديد"}</div>
<h2 style={{ margin:0, fontSize:18, fontWeight:900, fontFamily:T.font }}>
{isEdit ? "✏️ تعديل البلاغ" : "➕ إضافة بلاغ جديد"}
</h2>
</div>
<button onClick={onClose} aria-label="إغلاق"
style={{ background:"rgba(255,255,255,.15)", border:"none", color:T.white,
width:34, height:34, borderRadius:T.sm, cursor:"pointer", fontSize:17 }}>✕</button>
</div>

<div style={{ padding:"22px 26px" }}>
{/* بيانات البلاغ */}
<div style={sec}>
<h3 style={hdr}>📋 بيانات البلاغ</h3>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
<Field label="رقم البلاغ *">
<input style={sI} value={form.id} onChange={e=>set("id",e.target.value)} placeholder="مثال: 2025-001"/>
</Field>
<Field label="منصة البلاغ">
<select style={{...sI,cursor:"pointer"}} value={form.platform} onChange={e=>set("platform",e.target.value)}>
{CONFIG.platforms.map(p=><option key={p}>{p}</option>)}
</select>
</Field>
<Field label="اسم المستفيد *">
<input style={sI} value={form.beneficiary} onChange={e=>set("beneficiary",e.target.value)} placeholder="اسم المستفيد..."/>
</Field>
<Field label="أين يتابع البلاغ؟">
<select style={{...sI,cursor:"pointer"}} value={form.followChannel} onChange={e=>set("followChannel",e.target.value)}>
{CONFIG.channels.map(c=><option key={c}>{c}</option>)}
</select>
</Field>
<div style={{ gridColumn:"1/-1" }}>
<Field label="عنوان / وصف البلاغ *">
<input style={sI} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="وصف مختصر..."/>
</Field>
</div>
<Field label="المسؤول">
<select style={{...sI,cursor:"pointer"}} value={form.assignee} onChange={e=>set("assignee",e.target.value)}>
{CONFIG.assignees.map(a=><option key={a}>{a}</option>)}
</select>
</Field>
<Field label="الأولوية">
<select style={{...sI,cursor:"pointer"}} value={form.priority} onChange={e=>set("priority",e.target.value)}>
{Object.entries(CONFIG.priority.labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
</select>
</Field>
</div>
</div>

{/* الجهة المعنية */}
<div style={sec}>
<h3 style={hdr}>🏢 الجهة المعنية</h3>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
<Field label="الجهة المعنية">
<select style={{...sI,cursor:"pointer"}} value={form.entity} onChange={e=>set("entity",e.target.value)}>
{CONFIG.entities.map(e=><option key={e}>{e}</option>)}
</select>
</Field>
<Field label="تاريخ الرفع للجهة (بداية SLA)">
<input type="date" style={sI} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/>
</Field>
</div>
</div>

{/* التواريخ */}
<div style={sec}>
<h3 style={hdr}>📅 التواريخ</h3>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
<Field label="تاريخ إنشاء البلاغ من المستفيد">
<input type="date" style={sI} value={form.createdAt} onChange={e=>set("createdAt",e.target.value)}/>
</Field>
<Field label="تاريخ رفع البلاغ">
<input type="date" style={sI} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/>
</Field>
<Field label="تاريخ الإغلاق / المعالجة">
<input type="date" style={sI} value={form.closedAt||""} onChange={e=>set("closedAt",e.target.value)}/>
</Field>
<div style={{ display:"flex", alignItems:"center", background:T.primaryL, borderRadius:T.sm,
padding:"10px 14px", border:`1px solid ${T.primary5}` }}>
<span style={{ fontSize:11, color:T.primary2, fontWeight:700, lineHeight:1.7 }}>
⏱ SLA: 3 أيام عمل (أحد–خميس)<br/>
🟢 &lt;24س | 🟠 يومان | 🔴 3 أيام+
</span>
</div>
</div>
</div>

{/* التحويل والتصعيد — في التعديل فقط */}
{isEdit && (
<div style={sec}>
<h3 style={hdr}>🔄 تحويل البلاغ لجهة أخرى</h3>
<TransferSection form={form} setForm={setForm} />
</div>
)}
{isEdit && (
<div style={sec}>
<h3 style={hdr}>🔺 تسجيل تصعيد جديد</h3>
<EscalationSection form={form} setForm={setForm} />
</div>
)}

{/* ملاحظات */}
<div style={sec}>
<h3 style={hdr}>📝 ملاحظات داخلية</h3>
<textarea style={{ ...sI, minHeight:70, resize:"vertical" }}
value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="ملاحظات إضافية..."/>
</div>

<div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
<button onClick={onClose} style={{ padding:"10px 24px", borderRadius:T.sm, border:"1.5px solid #b0bec5",
background:T.white, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:T.font }}>إلغاء</button>
<button onClick={()=>onSave(form)}
style={S.btn(`linear-gradient(135deg,${T.primary},${T.primary2})`, T.white, { padding:"10px 28px" })}>
💾 حفظ البلاغ
</button>
</div>
</div>
</div>
</div>
);
};

// =========================================
// LAYER 10: TICKET DETAIL — نافذة العرض
// =========================================
const TicketDetail = ({ ticket, onClose }) => {
const sla = SLAEngine.analyze(ticket);
const status = TicketService.getStatus(ticket);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit"}) : "—";
const fmtDT = (d) => d ? new Date(d).toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—";

const transferItems = (ticket.transfers||[]).map(t => ({
id: t.id,
render: () => (
<>
<div style={{ fontSize:12, color:T.primary2, fontWeight:700 }}>
من <strong>{t.from}</strong> → <strong>{t.to}</strong>
</div>
<div style={{ fontSize:11, color:T.neutral, marginTop:3 }}>{fmtDT(t.date)}</div>
</>
),
}));

const escalationItems = (ticket.escalations||[]).map((e,i) => ({
id: e.id,
render: () => (
<>
<div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
<strong style={{ color:T.danger, fontSize:13 }}>تصعيد #{i+1} → {e.escalatedTo}</strong>
<span style={{ color:T.neutral, fontSize:11 }}>{fmtDate(e.date)}</span>
</div>
{e.notes && <p style={{ margin:0, fontSize:12, color:T.neutral }}>{e.notes}</p>}
</>
),
}));

const sec = S.section();
const hdr = S.header();
const row = S.row();

return (
<div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000,
display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
<div style={{ background:T.white, borderRadius:T.xl, width:"100%", maxWidth:700,
maxHeight:"92vh", overflowY:"auto", direction:"rtl", boxShadow:T.modal }}>
{/* Header */}
<div style={{ background:`linear-gradient(135deg,${T.primary},${T.primary2})`,
padding:"22px 28px", borderRadius:`${T.xl}px ${T.xl}px 0 0`, color:T.white }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
<div>
<div style={{ fontSize:11, opacity:.7, marginBottom:4 }}>{ticket.id}</div>
<h2 style={{ fontSize:19, fontWeight:900, margin:0, fontFamily:T.font }}>{ticket.title}</h2>
<div style={{ fontSize:12, opacity:.75, marginTop:4 }}>
👤 {ticket.beneficiary} · 📲 {ticket.platform}
</div>
</div>
<button onClick={onClose} aria-label="إغلاق"
style={{ background:"rgba(255,255,255,.15)", border:"none", color:T.white,
width:34, height:34, borderRadius:T.sm, cursor:"pointer", fontSize:17 }}>✕</button>
</div>
<div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
<Badge color={status.color} bg="rgba(255,255,255,.2)" label={status.label} />
{sla && <Badge color={sla.color} bg="rgba(255,255,255,.2)" label={`⏱ ${sla.label}`} />}
{(ticket.escalationCount||0) > 0 &&
<Badge color={T.white} bg="rgba(198,40,40,.4)" label={`🔺 ${ticket.escalationCount} تصعيد`} />}
</div>
</div>

<div style={{ padding:24 }}>
{/* تفاصيل */}
<div style={sec}>
<h3 style={hdr}>📋 تفاصيل البلاغ</h3>
{[
["الجهة الحالية", ticket.entity],
["المسؤول", ticket.assignee],
["المنصة", ticket.platform],
["قناة المتابعة", ticket.followChannel],
["تاريخ الإنشاء", fmtDate(ticket.createdAt)],
["تاريخ الرفع (بداية SLA)", fmtDate(ticket.submittedAt)],
["تاريخ الإغلاق", fmtDate(ticket.closedAt)],
["سبب الإغلاق", ticket.closeReason],
].map(([l,v]) => (
<div key={l} style={row}>
<span style={{ color:T.neutral, fontSize:13 }}>{l}</span>
<strong style={{ fontSize:13 }}>{v || "—"}</strong>
</div>
))}
</div>

{/* ملاحظات */}
{ticket.notes && (
<div style={{ ...sec, background:T.primaryL, border:`1px solid ${T.primary5}` }}>
<h3 style={hdr}>📝 ملاحظات</h3>
<p style={{ margin:0, color:"#374151", fontSize:13, lineHeight:1.8 }}>{ticket.notes}</p>
</div>
)}

{/* سجل التحويلات */}
<div style={sec}>
<h3 style={hdr}>🔄 سجل التحويلات ({(ticket.transfers||[]).length})</h3>
<Timeline items={transferItems} color={T.primary3} emptyMsg="لا توجد تحويلات" />
</div>

{/* سجل التصعيدات */}
<div style={sec}>
<h3 style={hdr}>🔺 سجل التصعيدات ({(ticket.escalations||[]).length})</h3>
<Timeline items={escalationItems} color={T.danger} emptyMsg="لا توجد تصعيدات" />
</div>
</div>
</div>
</div>
);
};

// =========================================
// LAYER 11: CLOSE TICKET MODAL
// =========================================
const CloseTicketModal = ({ ticket, onClose, onConfirm }) => {
const [reason, setReason] = useState(CONFIG.closeReasons[0]);
return (
<div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1100,
display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
<div style={{ background:T.white, borderRadius:T.lg, width:"100%", maxWidth:480,
direction:"rtl", boxShadow:T.modal }}>
<div style={{ background:`linear-gradient(135deg,${T.neutral},#455a64)`,
padding:"18px 24px", borderRadius:`${T.lg}px ${T.lg}px 0 0`,
color:T.white, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<h3 style={{ margin:0, fontSize:16, fontWeight:800, fontFamily:T.font }}>🔒 إغلاق البلاغ</h3>
<button onClick={onClose} aria-label="إغلاق"
style={{ background:"rgba(255,255,255,.15)", border:"none", color:T.white,
width:30, height:30, borderRadius:T.sm, cursor:"pointer", fontSize:16 }}>✕</button>
</div>
<div style={{ padding:24 }}>
<p style={{ fontSize:13, color:T.neutral, marginTop:0 }}>
اختر سبب إغلاق البلاغ: <strong>{ticket.id}</strong>
</p>
<div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
{CONFIG.closeReasons.map(r => (
<label key={r} style={{ display:"flex", alignItems:"flex-start", gap:10,
padding:"12px 14px", borderRadius:T.sm, cursor:"pointer", fontSize:13, fontFamily:T.font,
border:`2px solid ${reason===r ? T.primary3 : "#e0e0e0"}`,
background: reason===r ? T.primaryL : T.white }}>
<input type="radio" name="reason" value={r} checked={reason===r}
onChange={()=>setReason(r)} style={{ marginTop:2, accentColor:T.primary3 }}/>
{r}
</label>
))}
</div>
<div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
<button onClick={onClose}
style={{ padding:"9px 20px", borderRadius:T.sm, border:"1.5px solid #b0bec5",
background:T.white, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:T.font }}>
إلغاء
</button>
<button onClick={()=>onConfirm(reason)} style={S.btn(T.neutral, T.white)}>
🔒 تأكيد الإغلاق
</button>
</div>
</div>
</div>
</div>
);
};

// =========================================
// LAYER 12: DASHBOARD VIEW
// =========================================
const DashboardView = ({ tickets }) => {
const stats = TicketService.summarize(tickets);

const KPI = ({ icon, label, value, color, sub }) => (
<div style={{ ...S.card(), borderTop:`4px solid ${color}` }}>
<div style={{ fontSize:26 }}>{icon}</div>
<div style={{ fontSize:32, fontWeight:900, color:"#1a1a1a", lineHeight:1, marginTop:6 }}>{value}</div>
<div style={{ fontSize:13, color:T.neutral, fontWeight:700, marginTop:4 }}>{label}</div>
{sub && <div style={{ fontSize:11, color:"#90a4ae", marginTop:2 }}>{sub}</div>}
</div>
);

// Pie Chart SVG
const PieChart = ({ data, colors }) => {
const total = data.reduce((s,d)=>s+d.value,0) || 1;
let cum = 0;
return (
<svg viewBox="0 0 100 100" width="160" height="160">
{data.map((d,i) => {
const pct = d.value / total;
const sa = cum * 2 * Math.PI; cum += pct;
const ea = cum * 2 * Math.PI;
if (pct === 0) return null;
if (pct >= 1) return <circle key={i} cx="50" cy="50" r="40" fill={colors[i]}/>;
const x1=50+40*Math.sin(sa), y1=50-40*Math.cos(sa);
const x2=50+40*Math.sin(ea), y2=50-40*Math.cos(ea);
return <path key={i} d={`M50,50 L${x1},${y1} A40,40 0 ${pct>.5?1:0},1 ${x2},${y2} Z`} fill={colors[i]}/>;
})}
<circle cx="50" cy="50" r="22" fill={T.white}/>
<text x="50" y="54" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1a1a1a">{total}</text>
</svg>
);
};

const pieData = [{ label:"ضمن SLA", value:stats.withinSLA }, { label:"تجاوز SLA", value:stats.breached }].filter(d=>d.value>0);
const pieColors = [T.success, T.danger];

const entityData = CONFIG.entities.map(e => ({
name: e.replace("قسم الفحص الفني","الفحص الفني"),
total: tickets.filter(t=>t.entity===e).length,
open: tickets.filter(t=>t.entity===e && !t.closedAt).length,
})).filter(e=>e.total>0);
const maxVal = Math.max(...entityData.map(e=>e.total), 1);

const slaTickets = tickets.filter(t => !t.closedAt && t.submittedAt);

return (
<div style={{ direction:"rtl", fontFamily:T.font }}>
{/* KPIs */}
<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:24 }}>
<KPI icon="📋" label="إجمالي البلاغات" value={stats.total} color={T.primary2} />
<KPI icon="🔄" label="قيد المعالجة" value={stats.open} color={T.primary3} sub={`${Math.round(stats.open/Math.max(stats.total,1)*100)}%`}/>
<KPI icon="✅" label="مغلقة" value={stats.closed} color={T.neutral} />
<KPI icon="🔺" label="بلاغات مصعدة" value={stats.escalated} color={T.danger} />
<KPI icon="⏰" label="تجاوزت SLA" value={stats.breached} color={T.warning} />
<KPI icon="📌" label="إجمالي التصعيدات"value={stats.totalEsc} color={T.gold} />
</div>

<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
{/* Pie */}
<div style={S.card()}>
<h3 style={{ fontSize:14, fontWeight:800, color:"#1a1a1a", marginTop:0, marginBottom:18 }}>
توزيع البلاغات (SLA)
</h3>
<div style={{ display:"flex", alignItems:"center", gap:20 }}>
<PieChart data={pieData} colors={pieColors} />
<div style={{ display:"flex", flexDirection:"column", gap:12 }}>
{pieData.map((d,i) => (
<div key={d.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
<div style={{ width:14, height:14, borderRadius:4, background:pieColors[i] }}/>
<span style={{ fontSize:13, color:T.neutral }}>{d.label}</span>
<strong style={{ fontSize:15, color:pieColors[i] }}>{d.value}</strong>
</div>
))}
</div>
</div>
</div>

{/* Bar */}
<div style={S.card()}>
<h3 style={{ fontSize:14, fontWeight:800, color:"#1a1a1a", marginTop:0, marginBottom:18 }}>
البلاغات حسب الجهة
</h3>
{entityData.map(e => (
<div key={e.name} style={{ marginBottom:13 }}>
<div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
<span style={{ fontWeight:700 }}>{e.name}</span>
<span style={{ color:T.neutral }}>{e.open} مفتوح / {e.total}</span>
</div>
<div style={{ background:T.primaryL, borderRadius:T.sm, height:10, position:"relative", overflow:"hidden" }}>
<div style={{ width:`${(e.total/maxVal)*100}%`, height:"100%", background:T.primary5, borderRadius:T.sm }}/>
<div style={{ position:"absolute", top:0, right:0, width:`${(e.open/maxVal)*100}%`,
height:"100%", background:T.primary2, borderRadius:T.sm }}/>
</div>
</div>
))}
</div>

{/* SLA Timers */}
<div style={{ ...S.card(), gridColumn:"1/-1" }}>
<h3 style={{ fontSize:14, fontWeight:800, color:"#1a1a1a", marginTop:0, marginBottom:14 }}>
⏰ مؤقتات SLA
</h3>
{slaTickets.length === 0
? <p style={{ color:T.success, fontWeight:700, textAlign:"center", padding:16,
background:T.successL, borderRadius:T.sm }}>✅ جميع البلاغات ضمن SLA</p>
: <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:10 }}>
{slaTickets.map(t => {
const sla = SLAEngine.analyze(t);
if (!sla) return null;
return (
<div key={t.id} style={{ display:"flex", justifyContent:"space-between",
alignItems:"center", padding:"12px 16px", background:sla.bg,
borderRadius:T.sm, border:`1.5px solid ${sla.color}33` }}>
<div>
<strong style={{ fontSize:13 }}>{t.title}</strong>
<div style={{ fontSize:11, color:T.neutral, marginTop:2 }}>{t.entity} · {t.assignee}</div>
</div>
<div style={{ textAlign:"center" }}>
<div style={{ fontSize:18, fontWeight:900, color:sla.color }}>{sla.label}</div>
<div style={{ fontSize:10, color:T.neutral }}>{sla.breached ? "تجاوز SLA" : "ضمن SLA"}</div>
</div>
</div>
);
})}
</div>
}
</div>
</div>
</div>
);
};

// =========================================
// LAYER 13: TICKETS LIST
// =========================================
const TicketsList = ({ tickets, onEdit, onView, onDelete, onClose }) => {
const [search, setSearch] = useState("");
const [filterE, setFilterE] = useState("all");
const [filterA, setFilterA] = useState("all");
const [sortBy, setSortBy] = useState("createdAt");

const filtered = useMemo(() => {
let list = tickets.filter(t => {
if (filterE !== "all" && t.entity !== filterE) return false;
if (filterA !== "all" && t.assignee !== filterA) return false;
if (search && ![t.title, t.id, t.beneficiary].some(f => f?.includes(search))) return false;
return true;
});
list.sort((a, b) => {
if (sortBy === "sla") {
const sa = SLAEngine.analyze(a), sb = SLAEngine.analyze(b);
return (sb?.workDays||0) - (sa?.workDays||0);
}
if (sortBy === "escalations") return (b.escalationCount||0) - (a.escalationCount||0);
return new Date(b.createdAt) - new Date(a.createdAt);
});
return list;
}, [tickets, search, filterE, filterA, sortBy]);

const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit"}) : "—";
const sF = S.input({ padding:"8px 12px" });

return (
<div style={{ direction:"rtl", fontFamily:T.font }}>
{/* Filters */}
<div style={{ ...S.card({ padding:14 }), marginBottom:14, display:"flex", gap:10, flexWrap:"wrap" }}>
<input style={{ ...sF, flex:1, minWidth:180 }} placeholder="🔍 بحث..."
value={search} onChange={e=>setSearch(e.target.value)}/>
<select style={{ ...sF, cursor:"pointer" }} value={filterE} onChange={e=>setFilterE(e.target.value)}>
<option value="all">جميع الجهات</option>
{CONFIG.entities.map(e=><option key={e}>{e}</option>)}
</select>
<select style={{ ...sF, cursor:"pointer" }} value={filterA} onChange={e=>setFilterA(e.target.value)}>
<option value="all">جميع المسؤولين</option>
{CONFIG.assignees.map(a=><option key={a}>{a}</option>)}
</select>
<select style={{ ...sF, cursor:"pointer" }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
<option value="createdAt">الأحدث</option>
<option value="sla">حسب SLA</option>
<option value="escalations">التصعيدات</option>
</select>
</div>

{/* List */}
<div style={{ display:"flex", flexDirection:"column", gap:10 }}>
{filtered.map(t => {
const sla = SLAEngine.analyze(t);
const status = TicketService.getStatus(t);
return (
<div key={t.id} style={{ background:T.white, borderRadius:T.md, padding:"14px 18px",
boxShadow:T.card, borderRight:`4px solid ${sla?.color||T.neutral}`,
display:"flex", gap:14, alignItems:"flex-start", flexWrap:"wrap" }}>
<div style={{ flex:1, minWidth:0 }}>
<div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:6 }}>
<span style={{ fontSize:11, fontWeight:800, color:T.neutral,
background:T.neutralL, padding:"2px 8px", borderRadius:6 }}>{t.id}</span>
<StatusBadge ticket={t} />
{sla && <SLABadge ticket={t} />}
{(t.escalationCount||0) > 0 &&
<Badge color={T.danger} bg={T.dangerL} label={`🔺 ${t.escalationCount}`} />}
{(t.transfers||[]).length > 0 &&
<Badge color={T.primary3} bg={T.primaryL} label={`🔄 ${t.transfers.length} تحويل`} />}
{t.closedAt &&
<Badge color={T.neutral} bg={T.neutralL} label="🔒 مغلق" />}
</div>
<h4 style={{ margin:0, fontSize:14, fontWeight:800, color:"#1a1a1a", marginBottom:5 }}>
{t.title}
</h4>
<div style={{ fontSize:12, color:T.neutral, display:"flex", gap:12, flexWrap:"wrap" }}>
<span>👤 {t.beneficiary}</span>
<span>🏢 {t.entity}</span>
<span>📲 {t.platform}</span>
<span>🧑‍💼 {t.assignee}</span>
<span>📅 {fmtDate(t.createdAt)}</span>
{t.submittedAt && <span>📤 {fmtDate(t.submittedAt)}</span>}
</div>
</div>
<div style={{ display:"flex", gap:7, flexShrink:0 }}>
<button onClick={()=>onView(t)} aria-label="عرض تفاصيل البلاغ"
style={S.btn(T.primaryL, T.primary, { padding:"6px 13px", fontWeight:700 })}>عرض</button>
<button onClick={()=>onEdit(t)} aria-label="تعديل البلاغ"
style={S.btn(T.successL, T.success, { padding:"6px 13px", fontWeight:700 })}>تعديل</button>
{!t.closedAt &&
<button onClick={()=>onClose(t)} aria-label="إغلاق البلاغ"
style={S.btn(T.neutralL, T.neutral, { padding:"6px 13px", fontWeight:700 })}>🔒 إغلاق</button>}
<button onClick={()=>{ if(confirm("حذف البلاغ؟")) onDelete(t.id); }}
aria-label="حذف البلاغ"
style={S.btn(T.dangerL, T.danger, { padding:"6px 13px", fontWeight:700 })}>حذف</button>
</div>
</div>
);
})}
{filtered.length === 0 && (
<div style={{ textAlign:"center", padding:48, color:"#90a4ae" }}>
<div style={{ fontSize:44, marginBottom:10 }}>📭</div>
<div style={{ fontSize:15, fontWeight:700 }}>لا توجد بلاغات</div>
</div>
)}
</div>
</div>
);
};

// =========================================
// LAYER 14: REPORTS VIEW
// =========================================
const ReportsView = ({ tickets }) => {
const [filter, setFilter] = useState({ entity:"all", assignee:"all", status:"all", from:"", to:"" });
const setF = (k,v) => setFilter(p => ({ ...p, [k]:v }));

const filtered = useMemo(() => tickets.filter(t => {
if (filter.entity !== "all" && t.entity !== filter.entity) return false;
if (filter.assignee !== "all" && t.assignee !== filter.assignee) return false;
if (filter.status === "open" && t.closedAt) return false;
if (filter.status === "closed" && !t.closedAt) return false;
if (filter.from && t.createdAt < filter.from) return false;
if (filter.to && t.createdAt > filter.to) return false;
return true;
}), [tickets, filter]);

const stats = TicketService.summarize(filtered);
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit"}) : "—";

const exportCSV = () => {
const headers = ["رقم البلاغ","العنوان","المستفيد","المنصة","الجهة","المسؤول",
"تاريخ الإنشاء","تاريخ الرفع","تاريخ الإغلاق","سبب الإغلاق",
"الحالة","SLA (أيام عمل)","تصعيدات","تحويلات"];
const rows = filtered.map(t => {
const sla = SLAEngine.analyze(t);
const status = TicketService.getStatus(t);
return [t.id, t.title, t.beneficiary, t.platform, t.entity, t.assignee,
t.createdAt, t.submittedAt||"", t.closedAt||"", t.closeReason||"",
status.label, sla?.workDays??0, t.escalationCount||0, (t.transfers||[]).length];
});
const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
const url = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8" }));
Object.assign(document.createElement("a"), { href:url, download:"تقرير_البلاغات.csv" }).click();
URL.revokeObjectURL(url);
};

const sF = S.input({ padding:"8px 12px" });

return (
<div style={{ direction:"rtl", fontFamily:T.font }}>
{/* Filters */}
<div style={{ ...S.card({ padding:18 }), marginBottom:18 }}>
<h3 style={{ fontSize:14, fontWeight:800, color:"#1a1a1a", marginTop:0, marginBottom:14 }}>🔍 تصفية التقرير</h3>
<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10 }}>
<select style={{...sF,cursor:"pointer"}} value={filter.entity} onChange={e=>setF("entity", e.target.value)}>
<option value="all">جميع الجهات</option>
{CONFIG.entities.map(e=><option key={e}>{e}</option>)}
</select>
<select style={{...sF,cursor:"pointer"}} value={filter.assignee} onChange={e=>setF("assignee",e.target.value)}>
<option value="all">جميع المسؤولين</option>
{CONFIG.assignees.map(a=><option key={a}>{a}</option>)}
</select>
<select style={{...sF,cursor:"pointer"}} value={filter.status} onChange={e=>setF("status", e.target.value)}>
<option value="all">جميع الحالات</option>
<option value="open">مفتوحة</option>
<option value="closed">مغلقة</option>
</select>
<input type="date" style={sF} value={filter.from} onChange={e=>setF("from",e.target.value)}/>
<input type="date" style={sF} value={filter.to} onChange={e=>setF("to", e.target.value)}/>
<button onClick={()=>setFilter({entity:"all",assignee:"all",status:"all",from:"",to:""})}
style={{...sF,cursor:"pointer",background:T.white}}>↺ إعادة تعيين</button>
</div>
</div>

{/* Summary Cards */}
<div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
{[["📋 إجمالي",stats.total,T.primary2],["✅ مغلقة",stats.closed,T.neutral],
["🔺 تصعيدات",stats.totalEsc,T.danger],["⏰ تجاوز SLA",stats.breached,T.warning]].map(([l,v,c])=>(
<div key={l} style={{ background:T.white, borderRadius:T.md, padding:16,
textAlign:"center", boxShadow:T.card, borderTop:`3px solid ${c}` }}>
<div style={{ fontSize:26, fontWeight:900, color:"#1a1a1a" }}>{v}</div>
<div style={{ fontSize:12, color:T.neutral, marginTop:4 }}>{l}</div>
</div>
))}
</div>

{/* Table */}
<div style={{ background:T.white, borderRadius:T.lg, overflow:"hidden", boxShadow:T.card }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
padding:"14px 18px", background:`linear-gradient(135deg,${T.primary},${T.primary2})`, color:T.white }}>
<h3 style={{ fontSize:14, fontWeight:800, margin:0, fontFamily:T.font }}>
نتائج التقرير ({filtered.length} بلاغ)
</h3>
<button onClick={exportCSV} style={S.btn("rgba(255,255,255,.2)", T.white,
{ border:"1px solid rgba(255,255,255,.4)" })}>⬇ تصدير Excel</button>
</div>
<div style={{ overflowX:"auto" }}>
<table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:T.font }}>
<thead>
<tr style={{ background:T.primaryLL }}>
{["رقم البلاغ","العنوان","المستفيد","الجهة","المسؤول",
"تاريخ الإنشاء","تاريخ الرفع","الحالة","SLA","تصعيدات","تحويلات"].map(h=>(
<th key={h} style={{ padding:"12px 13px", textAlign:"right", fontWeight:800,
color:T.primary, borderBottom:`2px solid ${T.primary5}`, whiteSpace:"nowrap" }}>{h}</th>
))}
</tr>
</thead>
<tbody>
{filtered.map((t,i) => {
const sla = SLAEngine.analyze(t);
const status = TicketService.getStatus(t);
return (
<tr key={`r-${t.id}`} style={{ background:i%2===0?T.white:T.primaryLL,
borderBottom:`1px solid ${T.primaryL}` }}>
<td style={{ padding:"10px 13px", fontWeight:800, color:T.primary3, whiteSpace:"nowrap" }}>{t.id}</td>
<td style={{ padding:"10px 13px", maxWidth:180 }}>{t.title}</td>
<td style={{ padding:"10px 13px" }}>{t.beneficiary}</td>
<td style={{ padding:"10px 13px", whiteSpace:"nowrap" }}>{t.entity}</td>
<td style={{ padding:"10px 13px", whiteSpace:"nowrap" }}>{t.assignee}</td>
<td style={{ padding:"10px 13px", color:T.neutral, whiteSpace:"nowrap" }}>{fmtDate(t.createdAt)}</td>
<td style={{ padding:"10px 13px", color:T.neutral, whiteSpace:"nowrap" }}>{fmtDate(t.submittedAt)}</td>
<td style={{ padding:"10px 13px" }}><Badge color={status.color} bg={status.bg} label={status.label}/></td>
<td style={{ padding:"10px 13px" }}>{sla ? <Badge color={sla.color} bg={sla.bg} label={sla.label}/> : "—"}</td>
<td style={{ padding:"10px 13px", textAlign:"center", fontWeight:800,
color:(t.escalationCount||0)>0?T.danger:T.success }}>{t.escalationCount||0}</td>
<td style={{ padding:"10px 13px", textAlign:"center", fontWeight:800,
color:(t.transfers||[]).length>0?T.primary3:T.neutral }}>{(t.transfers||[]).length}</td>
</tr>
);
})}
</tbody>
</table>
{filtered.length===0 && <p style={{textAlign:"center",color:"#90a4ae",padding:32}}>لا توجد بيانات</p>}
</div>
</div>
</div>
);
};

// =========================================
// LAYER 15: APP — التطبيق الرئيسي (routing only)
// =========================================
export default function App() {
const [tickets, setTickets] = useState(() => StorageService.load() || SEED_TICKETS);
const [activeTab, setActiveTab] = useState("dashboard");
const [showForm, setShowForm] = useState(false);
const [editTicket, setEditTicket] = useState(null);
const [viewTicket, setViewTicket] = useState(null);
const [closeTicket, setCloseTicket] = useState(null);
const [toast, setToast] = useState("");

const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 3000); };

// CRUD — كل عملية تحفظ تلقائياً
const commit = (next) => { setTickets(next); StorageService.save(next); };

const handleSave = (form) => {
const errors = TicketService.validate(form);
if (errors.length) { alert(errors.join("\n")); return; }
const idx = tickets.findIndex(x => x.id === form.id);
commit(idx >= 0 ? tickets.map((x,i) => i===idx ? form : x) : [form, ...tickets]);
setShowForm(false); setEditTicket(null);
};

const handleDelete = (id) => commit(tickets.filter(t => t.id !== id));

const handleClose = (reason) => {
commit(tickets.map(t => t.id === closeTicket.id
? { ...t, closedAt: new Date().toISOString(), closeReason: reason } : t
));
setCloseTicket(null);
};

const handleExport = () => { StorageService.exportJSON(tickets); showToast("✅ تم الحفظ!"); };

const handleImport = async (e) => {
const file = e.target.files[0]; if (!file) return;
try {
const valid = await StorageService.importJSON(file);
commit(valid);
showToast(`✅ استُورد ${valid.length} بلاغ`);
} catch (err) { alert("خطأ: " + err.message); }
e.target.value = "";
};

const breachedCount = tickets.filter(t => !t.closedAt && SLAEngine.analyze(t)?.breached).length;

const TABS = [
{ id:"dashboard", icon:"📊", label:"لوحة التحكم" },
{ id:"tickets", icon:"📋", label:"سجل البلاغات" },
{ id:"reports", icon:"📈", label:"التقارير" },
];

return (
<div lang="ar" style={{ minHeight:"100vh", background:T.bg, fontFamily:T.font, direction:"rtl" }}>
{/* Header */}
<header style={{ background:`linear-gradient(135deg,${T.primary},${T.primary2})`,
padding:"0 22px", display:"flex", alignItems:"center", gap:12, height:62,
position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px rgba(0,0,0,.2)" }}>

{/* Brand */}
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
<div style={{ width:36, height:36, background:T.primary5, borderRadius:T.sm,
display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🎛</div>
<div style={{ color:T.white }}>
<div style={{ fontSize:15, fontWeight:900, lineHeight:1, fontFamily:T.font }}>
متابعة البلاغات التقنية
</div>
<div style={{ fontSize:10, opacity:.65 }}>Technical Ticket Management</div>
</div>
</div>

{/* Nav */}
<nav style={{ display:"flex", gap:3, marginRight:"auto" }}>
{TABS.map(t => (
<button key={t.id} onClick={() => setActiveTab(t.id)}
style={{ padding:"7px 16px", borderRadius:T.sm, border:"none", cursor:"pointer",
fontSize:12, fontWeight:800, fontFamily:T.font,
background: activeTab===t.id ? "rgba(255,255,255,.25)" : "transparent",
color: activeTab===t.id ? T.white : "rgba(255,255,255,.65)" }}>
{t.icon} {t.label}
</button>
))}
</nav>

{/* Alerts */}
{breachedCount > 0 &&
<div style={{ background:T.danger, color:T.white, padding:"5px 12px", borderRadius:T.sm,
fontSize:11, fontWeight:800, animation:"pulse 2s infinite" }}>
⚠ {breachedCount} تجاوز SLA
</div>}
{toast &&
<div style={{ background:T.primary5, color:T.primary, padding:"5px 12px",
borderRadius:T.sm, fontSize:11, fontWeight:800 }}>{toast}</div>}

{/* Actions */}
<button onClick={handleExport}
style={{ padding:"7px 12px", background:"rgba(255,255,255,.15)", color:T.white,
border:"1px solid rgba(255,255,255,.3)", borderRadius:T.sm, cursor:"pointer",
fontSize:12, fontWeight:700, fontFamily:T.font }}>💾 حفظ</button>

<label style={{ padding:"7px 12px", background:"rgba(255,255,255,.15)", color:T.white,
border:"1px solid rgba(255,255,255,.3)", borderRadius:T.sm, cursor:"pointer",
fontSize:12, fontWeight:700, fontFamily:T.font }}>
📂 استيراد
<input type="file" accept=".json" onChange={handleImport} style={{ display:"none" }}/>
</label>

<button onClick={() => { setEditTicket(null); setShowForm(true); }}
style={S.btn(T.primary5, T.primary, { padding:"9px 18px" })}>
＋ بلاغ جديد
</button>
</header>

{/* Main */}
<main style={{ maxWidth:1200, margin:"0 auto", padding:"22px 14px" }}>
{activeTab === "dashboard" && <DashboardView tickets={tickets} />}
{activeTab === "tickets" && (
<TicketsList tickets={tickets}
onEdit={t => { setEditTicket(t); setShowForm(true); }}
onView={t => setViewTicket(t)}
onDelete={handleDelete}
onClose={t => setCloseTicket(t)} />
)}
{activeTab === "reports" && <ReportsView tickets={tickets} />}
</main>

{/* Modals */}
{showForm && <TicketForm ticket={editTicket} onSave={handleSave}
onClose={() => { setShowForm(false); setEditTicket(null); }} />}
{viewTicket && <TicketDetail ticket={viewTicket} onClose={() => setViewTicket(null)} />}
{closeTicket && <CloseTicketModal ticket={closeTicket}
onClose={() => setCloseTicket(null)} onConfirm={handleClose} />}

<style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}} *{font-family:Calibri,sans-serif;box-sizing:border-box;}`}</style>
</div>
);
}
