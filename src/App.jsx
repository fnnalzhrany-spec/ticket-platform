

// ============================================================
// DESIGN SYSTEM
// ============================================================
const DS = {
color: {
brand: "#0a1f44",
brand2: "#1a3a6b",
brand3: "#2351a3",
brandLight:"#dce8f7",
brandXL: "#f2f7fd",
success: "#1b5e20",
successBg: "#e8f5e9",
warn: "#bf360c",
warnBg: "#fbe9e7",
caution: "#e65100",
cautionBg: "#fff3e0",
danger: "#b71c1c",
dangerBg: "#ffebee",
neutral: "#37474f",
neutralBg: "#eceff1",
gold: "#f57f17",
goldBg: "#fff8e1",
bg: "#f0f4fa",
surface: "#ffffff",
border: "#cfd8dc",
text: "#1a1a2e",
textMuted: "#546e7a",
},
font: "Calibri, 'Segoe UI', sans-serif",
radius: { xs:4, sm:8, md:12, lg:16, xl:20, full:999 },
shadow: {
sm: "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)",
md: "0 4px 12px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.05)",
lg: "0 10px 30px rgba(0,0,0,.10), 0 4px 12px rgba(0,0,0,.07)",
modal: "0 24px 64px rgba(0,0,0,.18), 0 8px 24px rgba(0,0,0,.12)",
},
};

// Style helpers
const css = {
card: (o={}) => ({ background:DS.color.surface, borderRadius:DS.radius.lg, padding:22, boxShadow:DS.shadow.sm, ...o }),
sec: (o={}) => ({ background:DS.color.brandXL, borderRadius:DS.radius.md, padding:"16px 20px", marginBottom:14, border:`1px solid ${DS.color.brandLight}`, ...o }),
hdr: (o={}) => ({ fontSize:13, fontWeight:700, color:DS.color.brand, margin:"0 0 14px", paddingBottom:8, borderBottom:`2px solid ${DS.color.brandLight}`, fontFamily:DS.font, letterSpacing:".3px", ...o }),
input: (o={}) => ({ padding:"9px 13px", borderRadius:DS.radius.sm, border:`1.5px solid ${DS.color.border}`, fontSize:13, fontFamily:DS.font, direction:"rtl", background:"#fafbfc", width:"100%", boxSizing:"border-box", outline:"none", transition:"border-color .15s", ...o }),
btn: (bg, color, o={}) => ({ padding:"9px 18px", borderRadius:DS.radius.sm, border:"none", background:bg, color, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:DS.font, whiteSpace:"nowrap", transition:"opacity .15s", ...o }),
};

// ============================================================
// CONFIG — single source of truth
// ============================================================
const CFG = {
platforms: ["الهيئة", "أسهل", "تواصل اجتماعي"],
channels: ["أسهل", "بريد إلكتروني"],
entities: ["آي سوفت", "أعمالي", "علم", "قسم الفحص الفني"],
assignees: ["أفنان الزهراني", "نوف العويس"],
escalateTo: ["رئيس البلاغات", "قسم الفحص الفني"],
closeReasons: [
"تمت المعالجة من الجهة المعنية",
"لا يوجد تجاوب من الجهة المعنية وتم التواصل مع المستفيد وأُشعر بالمعالجة",
],
priorityLabels: { high:"عالي", medium:"متوسط", low:"منخفض" },
priorityColors: { high:DS.color.danger, medium:DS.color.caution, low:DS.color.brand3 },
sla: { workDays: 3 },
storage: { key:"tbv5", ver:5 },
};

// ============================================================
// SLA ENGINE
// ============================================================
const SLA = {
workDays(from, to = new Date()) {
try {
const s = new Date(from); s.setHours(0,0,0,0);
const e = new Date(to); e.setHours(0,0,0,0);
if (isNaN(s)|isNaN(e)) return 0;
let n = 0, g = 0;
for (const c = new Date(s); c < e && ++g < 500; c.setDate(c.getDate()+1))
if (c.getDay()!==5 && c.getDay()!==6) n++;
return n;
} catch { return 0; }
},

refDate(ticket) {
const tr = ticket.transfers || [];
if (tr.length) {
const last = new Date(tr[tr.length-1].date);
if (!isNaN(last)) return tr[tr.length-1].date;
}
return ticket.submittedAt || null;
},

calc(ticket) {
const ref = SLA.refDate(ticket);
if (!ref) return null;
const refD = new Date(ref);
if (isNaN(refD)) return null;
const now = new Date();
const hours = Math.max(0, (now - refD) / 36e5 | 0);
const days = SLA.workDays(ref);
const breached = days >= CFG.sla.workDays;
const over = breached ? days - CFG.sla.workDays : 0;
let clr, bg, label;
if (hours < 24) { clr=DS.color.success; bg=DS.color.successBg; label = hours<1 ? "أقل من ساعة" : `${hours}س`; }
else if (days < 2) { clr=DS.color.success; bg=DS.color.successBg; label = `${days} يوم`; }
else if (days < 3) { clr=DS.color.caution; bg=DS.color.cautionBg; label = `${days} يوم ⚠`; }
else { clr=DS.color.danger; bg=DS.color.dangerBg; label = `${days} يوم ✗`; }
return { hours, days, breached, over, clr, bg, label, ref };
},
};

// ============================================================
// TICKET SERVICE
// ============================================================
const TS = {
empty: () => ({
id:"", title:"", platform:CFG.platforms[0], channel:CFG.channels[0],
beneficiary:"", entity:CFG.entities[0], assignee:CFG.assignees[0],
priority:"medium", createdAt:new Date().toISOString().slice(0,10),
submittedAt:"", closedAt:"", closeReason:null,
notes:"", escalations:[], transfers:[], escalationCount:0,
}),

validate(t) {
return [
!t.id?.trim() && "رقم البلاغ مطلوب",
!t.title?.trim() && "عنوان البلاغ مطلوب",
!t.beneficiary?.trim() && "اسم المستفيد مطلوب",
!t.entity && "الجهة المعنية مطلوبة",
!t.assignee && "المسؤول عن المتابعة مطلوب",
].filter(Boolean);
},

status(ticket) {
const C = DS.color;
if (ticket.closedAt) return { label:"مغلق", clr:C.neutral, bg:C.neutralBg };
if (!ticket.submittedAt) return { label:"لم يُرفع للجهة بعد", clr:C.neutral, bg:C.neutralBg };
const s = SLA.calc(ticket);
if (!s) return { label:"لم يُرفع للجهة بعد", clr:C.neutral, bg:C.neutralBg };
if (s.breached) return { label:`تجاوز SLA بـ ${s.over} يوم`, clr:C.danger, bg:C.dangerBg };
if (s.days >= 2) return { label:"قارب انتهاء SLA", clr:C.caution, bg:C.cautionBg };
return { label:"ضمن SLA", clr:C.success, bg:C.successBg };
},

stats(tickets) {
const open = tickets.filter(t => !t.closedAt);
const br = open.filter(t => SLA.calc(t)?.breached);
return {
total: tickets.length,
open: open.length,
closed: tickets.length - open.length,
breached: br.length,
within: Math.max(0, open.length - br.length),
escalated:tickets.filter(t => (t.escalationCount||0)>0).length,
totalEsc: tickets.reduce((s,t) => s+(t.escalationCount||0), 0),
};
},

transfer(from, to) {
return { id:`tr-${Date.now()}`, from, to, date:new Date().toISOString() };
},

escalate(data, by) {
return { id:`esc-${Date.now()}`, ...data, by, addedAt:new Date().toISOString() };
},
};

// ============================================================
// STORAGE SERVICE
// ============================================================
const Store = {
load() {
try {
const raw = localStorage.getItem(CFG.storage.key);
if (!raw) return null;
const p = JSON.parse(raw);
return p.ver === CFG.storage.ver ? p.data : null;
} catch { return null; }
},
save(data) {
try { localStorage.setItem(CFG.storage.key, JSON.stringify({ data, ver:CFG.storage.ver, at:Date.now() })); return true; }
catch { return false; }
},
export(tickets) {
const url = URL.createObjectURL(new Blob(
[JSON.stringify({ tickets, at:new Date().toISOString(), n:tickets.length }, null, 2)],
{ type:"application/json" }
));
Object.assign(document.createElement("a"), { href:url, download:`backup-${Date.now()}.json` }).click();
setTimeout(() => URL.revokeObjectURL(url), 1000);
},
import(file) {
return new Promise((res, rej) => {
const r = new FileReader();
r.onload = ({ target }) => {
try {
const p = JSON.parse(target.result);
const arr = p.tickets || p;
if (!Array.isArray(arr)) throw new Error("تنسيق غير صحيح");
const valid = arr.filter(t => t.id && t.title && t.entity);
if (!valid.length) throw new Error("لا توجد بيانات صالحة");
res(valid);
} catch(e) { rej(e); }
};
r.onerror = () => rej(new Error("فشل قراءة الملف"));
r.readAsText(file);
});
},
};

// ============================================================
// SEED DATA
// ============================================================
const ago = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };
const SEED = [
{ id:"2025-001", title:"خطأ في عملية التحقق", platform:"الهيئة", channel:"أسهل", beneficiary:"محمد العمري", entity:"آي سوفت", assignee:"أفنان الزهراني", priority:"high", createdAt:ago(7), submittedAt:ago(7), closedAt:null, closeReason:null, notes:"يؤثر على عمليات الهيئة", escalationCount:1, transfers:[], escalations:[] },
{ id:"2025-002", title:"تأخر استجابة النظام", platform:"أسهل", channel:"بريد إلكتروني", beneficiary:"سلطان الغامدي",entity:"أعمالي", assignee:"نوف العويس", priority:"medium", createdAt:ago(4), submittedAt:ago(4), closedAt:null, closeReason:null, notes:"", escalationCount:0, transfers:[], escalations:[] },
{ id:"2025-003", title:"مشكلة في رفع المستندات", platform:"تواصل اجتماعي", channel:"أسهل", beneficiary:"هند الشهري", entity:"علم", assignee:"أفنان الزهراني", priority:"low", createdAt:ago(10),submittedAt:ago(9), closedAt:ago(6),closeReason:CFG.closeReasons[0], notes:"تم الحل", escalationCount:0, transfers:[], escalations:[] },
{ id:"2025-004", title:"خلل في واجهة الدفع", platform:"أسهل", channel:"أسهل", beneficiary:"ريم القحطاني", entity:"آي سوفت", assignee:"أفنان الزهراني", priority:"high", createdAt:ago(5), submittedAt:ago(5), closedAt:null, closeReason:null, notes:"قيد التحقيق", escalationCount:0, transfers:[], escalations:[] },
{ id:"2025-005", title:"عدم إرسال رمز التحقق", platform:"الهيئة", channel:"بريد إلكتروني", beneficiary:"فيصل الحربي", entity:"أعمالي", assignee:"نوف العويس", priority:"medium", createdAt:ago(1), submittedAt:null, closedAt:null, closeReason:null, notes:"", escalationCount:0, transfers:[], escalations:[] },
];

// ============================================================
// STATE MANAGEMENT — useReducer للـ tickets
// ============================================================
const reducer = (state, action) => {
switch (action.type) {
case "SET": return action.tickets;
case "UPSERT": {
const i = state.findIndex(t => t.id === action.ticket.id);
return i >= 0 ? state.map((t,j) => j===i ? action.ticket : t) : [action.ticket, ...state];
}
case "DELETE": return state.filter(t => t.id !== action.id);
case "CLOSE": return state.map(t => t.id===action.id ? {...t, closedAt:new Date().toISOString(), closeReason:action.reason} : t);
default: return state;
}
};

// ============================================================
// SHARED ATOMS
// ============================================================
const Badge = ({ clr, bg, label, sz=11 }) => (
<span style={{ background:bg, color:clr, padding:"3px 10px", borderRadius:DS.radius.full,
fontSize:sz, fontWeight:700, whiteSpace:"nowrap", border:`1px solid ${clr}25`,
letterSpacing:".2px", display:"inline-flex", alignItems:"center", gap:3 }}>{label}</span>
);

const SLABadge = ({ ticket }) => { const s=SLA.calc(ticket); return s ? <Badge clr={s.clr} bg={s.bg} label={s.label}/> : <Badge clr={DS.color.neutral} bg={DS.color.neutralBg} label="لم يُرفع"/>; };
const StatBadge = ({ ticket }) => { const s=TS.status(ticket); return <Badge clr={s.clr} bg={s.bg} label={s.label}/>; };

const Field = ({ label, required, children }) => (
<div style={{ display:"flex", flexDirection:"column", gap:4 }}>
<label style={{ fontSize:11, fontWeight:700, color:DS.color.textMuted, fontFamily:DS.font, letterSpacing:".3px" }}>
{label}{required && <span style={{ color:DS.color.danger, marginRight:2 }}>*</span>}
</label>
{children}
</div>
);

const Divider = ({ title }) => (
<div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0 14px", color:DS.color.brand, fontSize:12, fontWeight:700 }}>
<div style={{ flex:1, height:1, background:DS.color.brandLight }}/>
{title}
<div style={{ flex:1, height:1, background:DS.color.brandLight }}/>
</div>
);

const Timeline = ({ items, accentColor, emptyMsg }) => {
if (!items.length) return (
<div style={{ textAlign:"center", padding:"16px 0", color:"#90a4ae", fontSize:12 }}>{emptyMsg}</div>
);
return (
<div style={{ position:"relative", paddingRight:22 }}>
<div style={{ position:"absolute", right:9, top:6, bottom:6, width:2, background:`${accentColor}30`, borderRadius:2 }}/>
{items.map((item, i) => (
<div key={item.id||i} style={{ position:"relative", marginBottom:10, paddingRight:18 }}>
<div style={{ position:"absolute", right:-3, top:5, width:10, height:10, borderRadius:"50%",
background:accentColor, border:`2px solid ${DS.color.surface}`, boxShadow:`0 0 0 2px ${accentColor}30` }}/>
<div style={{ background:DS.color.surface, borderRadius:DS.radius.sm, padding:"10px 14px",
border:`1px solid ${accentColor}20`, boxShadow:DS.shadow.sm }}>
{item.content}
</div>
</div>
))}
</div>
);
};

// ============================================================
// MODAL WRAPPER
// ============================================================
const Modal = ({ maxW=660, onClose, children }) => (
<div onClick={e => { if (e.target===e.currentTarget) onClose(); }}
style={{ position:"fixed", inset:0, background:"rgba(10,31,68,.45)", zIndex:1000,
display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(2px)" }}>
<div style={{ background:DS.color.surface, borderRadius:DS.radius.xl, width:"100%",
maxWidth:maxW, maxHeight:"93vh", overflowY:"auto", direction:"rtl", boxShadow:DS.shadow.modal }}>
{children}
</div>
</div>
);

const ModalHeader = ({ id, title, sub, onClose, badges=[] }) => (
<div style={{ background:`linear-gradient(135deg,${DS.color.brand},${DS.color.brand2})`,
padding:"22px 26px", borderRadius:`${DS.radius.xl}px ${DS.radius.xl}px 0 0`, color:DS.color.surface }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
<div>
{id && <div style={{ fontSize:11, opacity:.6, marginBottom:4, letterSpacing:".5px" }}>{id}</div>}
<h2 style={{ margin:0, fontSize:17, fontWeight:800, fontFamily:DS.font }}>{title}</h2>
{sub && <div style={{ fontSize:11, opacity:.7, marginTop:5 }}>{sub}</div>}
</div>
<button onClick={onClose} aria-label="إغلاق"
style={{ background:"rgba(255,255,255,.12)", border:"none", color:DS.color.surface,
width:32, height:32, borderRadius:DS.radius.sm, cursor:"pointer", fontSize:16,
display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
</div>
{badges.length > 0 && (
<div style={{ display:"flex", gap:7, marginTop:13, flexWrap:"wrap" }}>
{badges.map((b,i) => <Badge key={i} clr={DS.color.surface} bg="rgba(255,255,255,.18)" label={b}/>)}
</div>
)}
</div>
);

// ============================================================
// TRANSFER & ESCALATION SECTIONS
// ============================================================
const TransferSection = ({ form, setForm }) => {
const [target, setTarget] = useState("");
const options = CFG.entities.filter(e => e !== form.entity);
const apply = useCallback(() => {
if (!target || target === form.entity) return;
const tr = TS.transfer(form.entity, target);
setForm(p => ({ ...p, entity:target, transfers:[...(p.transfers||[]), tr] }));
setTarget("");
}, [target, form.entity, setForm]);

return (
<div>
<div style={{ display:"flex", gap:8, marginBottom:options.length?10:0 }}>
<select style={{ ...css.input(), flex:1, cursor:"pointer" }} value={target} onChange={e=>setTarget(e.target.value)}>
<option value="">— اختر الجهة الجديدة —</option>
{options.map(e=><option key={e}>{e}</option>)}
</select>
<button onClick={apply} disabled={!target}
style={css.btn(!target?"#ccc":DS.color.brand2, DS.color.surface, { opacity:!target?.6:1 })}>
تحويل الآن
</button>
</div>
{(form.transfers||[]).map((t,i) => (
<div key={t.id||i} style={{ fontSize:11, color:DS.color.textMuted, padding:"4px 10px",
background:DS.color.brandXL, borderRadius:DS.radius.xs, marginBottom:3,
border:`1px solid ${DS.color.brandLight}` }}>
📌 {new Date(t.date).toLocaleDateString("en-GB")} — من <b>{t.from}</b> ← <b>{t.to}</b>
</div>
))}
</div>
);
};

const EscalationSection = ({ form, setForm }) => {
const [data, setData] = useState({ date:new Date().toISOString().slice(0,10), escalatedTo:CFG.escalateTo[0], notes:"" });
const add = useCallback(() => {
const esc = TS.escalate(data, form.assignee);
setForm(p => ({ ...p, escalationCount:(p.escalationCount||0)+1, escalations:[...(p.escalations||[]),esc] }));
setData(p => ({ ...p, notes:"" }));
}, [data, form.assignee, setForm]);

return (
<div>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
<Field label="تاريخ التصعيد">
<input type="date" style={css.input()} value={data.date} onChange={e=>setData(p=>({...p,date:e.target.value}))}/>
</Field>
<Field label="إلى من؟">
<select style={{...css.input(),cursor:"pointer"}} value={data.escalatedTo} onChange={e=>setData(p=>({...p,escalatedTo:e.target.value}))}>
{CFG.escalateTo.map(t=><option key={t}>{t}</option>)}
</select>
</Field>
<div style={{ gridColumn:"1/-1" }}>
<Field label="سبب التصعيد">
<input style={css.input()} value={data.notes} placeholder="سبب التصعيد..." onChange={e=>setData(p=>({...p,notes:e.target.value}))}/>
</Field>
</div>
</div>
<button onClick={add} style={css.btn(DS.color.danger, DS.color.surface)}>+ تسجيل التصعيد</button>
</div>
);
};

// ============================================================
// TICKET FORM
// ============================================================
const TicketForm = ({ ticket, onSave, onClose }) => {
const [form, setForm] = useState(() => ticket ? { ...TS.empty(), ...ticket } : TS.empty());
const isEdit = !!ticket;
const set = useCallback((k,v) => setForm(p=>({...p,[k]:v})), []);
const sI = css.input();

const handleSave = () => onSave(form);

return (
<Modal maxW={660} onClose={onClose}>
<ModalHeader title={isEdit?"✏️ تعديل البلاغ":"➕ إضافة بلاغ جديد"}
id={form.id||"بلاغ جديد"} onClose={onClose}/>
<div style={{ padding:"20px 26px" }}>

{/* بيانات البلاغ */}
<div style={css.sec()}>
<p style={css.hdr()}>📋 بيانات البلاغ</p>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:13 }}>
<Field label="رقم البلاغ" required>
<input style={sI} value={form.id} onChange={e=>set("id",e.target.value)} placeholder="مثال: 2025-001"/>
</Field>
<Field label="منصة البلاغ">
<select style={{...sI,cursor:"pointer"}} value={form.platform} onChange={e=>set("platform",e.target.value)}>
{CFG.platforms.map(p=><option key={p}>{p}</option>)}
</select>
</Field>
<Field label="اسم المستفيد" required>
<input style={sI} value={form.beneficiary} onChange={e=>set("beneficiary",e.target.value)} placeholder="اسم المستفيد..."/>
</Field>
<Field label="قناة المتابعة">
<select style={{...sI,cursor:"pointer"}} value={form.channel} onChange={e=>set("channel",e.target.value)}>
{CFG.channels.map(c=><option key={c}>{c}</option>)}
</select>
</Field>
<div style={{ gridColumn:"1/-1" }}>
<Field label="عنوان / وصف البلاغ" required>
<input style={sI} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="وصف مختصر للمشكلة..."/>
</Field>
</div>
</div>
</div>

{/* الجهة والمسؤول */}
<div style={css.sec()}>
<p style={css.hdr()}>🏢 الجهة المعنية والمسؤول</p>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:13 }}>
<Field label="الجهة المعنية">
<select style={{...sI,cursor:"pointer"}} value={form.entity} onChange={e=>set("entity",e.target.value)}>
{CFG.entities.map(e=><option key={e}>{e}</option>)}
</select>
</Field>
<Field label="المسؤول عن المتابعة">
<select style={{...sI,cursor:"pointer"}} value={form.assignee} onChange={e=>set("assignee",e.target.value)}>
{CFG.assignees.map(a=><option key={a}>{a}</option>)}
</select>
</Field>
<Field label="تاريخ الرفع للجهة (بداية SLA)">
<input type="date" style={sI} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/>
</Field>
<Field label="الأولوية">
<select style={{...sI,cursor:"pointer"}} value={form.priority} onChange={e=>set("priority",e.target.value)}>
{Object.entries(CFG.priorityLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
</select>
</Field>
</div>
</div>

{/* التواريخ */}
<div style={css.sec()}>
<p style={css.hdr()}>📅 التواريخ</p>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:13 }}>
<Field label="تاريخ إنشاء البلاغ من المستفيد">
<input type="date" style={sI} value={form.createdAt} onChange={e=>set("createdAt",e.target.value)}/>
</Field>
<Field label="تاريخ رفع البلاغ (بداية SLA)">
<input type="date" style={sI} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/>
</Field>
<Field label="تاريخ الإغلاق / المعالجة">
<input type="date" style={sI} value={form.closedAt||""} onChange={e=>set("closedAt",e.target.value)}/>
</Field>
<div style={{ display:"flex", alignItems:"center", background:DS.color.successBg,
borderRadius:DS.radius.sm, padding:"10px 14px", border:`1px solid ${DS.color.success}30` }}>
<span style={{ fontSize:11, color:DS.color.success, fontWeight:700, lineHeight:1.8 }}>
⏱ SLA: 3 أيام عمل<br/>
🟢 أقل من يومين · 🟠 يومان · 🔴 3+
</span>
</div>
</div>
</div>

{/* التحويل والتصعيد — في التعديل فقط */}
{isEdit && <>
<div style={css.sec()}>
<p style={css.hdr()}>🔄 تحويل البلاغ لجهة أخرى</p>
<TransferSection form={form} setForm={setForm}/>
</div>
<div style={css.sec()}>
<p style={css.hdr()}>🔺 تسجيل تصعيد جديد</p>
<EscalationSection form={form} setForm={setForm}/>
</div>
</>}

{/* ملاحظات */}
<div style={css.sec()}>
<p style={css.hdr()}>📝 ملاحظات داخلية</p>
<textarea style={{...sI,minHeight:70,resize:"vertical"}}
value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="ملاحظات إضافية..."/>
</div>

<div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4 }}>
<button onClick={onClose}
style={{ padding:"9px 22px", borderRadius:DS.radius.sm, border:`1.5px solid ${DS.color.border}`,
background:DS.color.surface, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:DS.font }}>
إلغاء
</button>
<button onClick={handleSave}
style={css.btn(`linear-gradient(135deg,${DS.color.brand},${DS.color.brand2})`, DS.color.surface,
{ padding:"9px 26px", boxShadow:`0 3px 12px ${DS.color.brand}40` })}>
💾 حفظ البلاغ
</button>
</div>
</div>
</Modal>
);
};

// ============================================================
// TICKET DETAIL
// ============================================================
const TicketDetail = ({ ticket, onClose }) => {
const sla = SLA.calc(ticket);
const stat = TS.status(ticket);
const fd = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const fdt = d => d ? new Date(d).toLocaleString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

const badges = [stat.label, ...(sla?[`⏱ ${sla.label}`]:[]), ...((ticket.escalationCount||0)>0?[`🔺 ${ticket.escalationCount} تصعيد`]:[])];

const infoRows = [
["الجهة الحالية", ticket.entity],
["المسؤول", ticket.assignee],
["المنصة", ticket.platform],
["قناة المتابعة", ticket.channel],
["تاريخ الإنشاء", fd(ticket.createdAt)],
["تاريخ الرفع (بداية SLA)", fd(ticket.submittedAt)],
["تاريخ الإغلاق", fd(ticket.closedAt)],
["سبب الإغلاق", ticket.closeReason],
].filter(([,v]) => v);

const transferItems = (ticket.transfers||[]).map(t => ({
id: t.id,
content: (
<div>
<div style={{ fontSize:12, fontWeight:700, color:DS.color.brand2 }}>
من <strong>{t.from}</strong> &nbsp;→&nbsp; <strong>{t.to}</strong>
</div>
<div style={{ fontSize:11, color:DS.color.textMuted, marginTop:3 }}>{fdt(t.date)}</div>
</div>
),
}));

const escalItems = (ticket.escalations||[]).map((e,i) => ({
id: e.id,
content: (
<div>
<div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
<strong style={{ color:DS.color.danger, fontSize:12 }}>تصعيد #{i+1} — {e.escalatedTo}</strong>
<span style={{ color:DS.color.textMuted, fontSize:11 }}>{fd(e.date)}</span>
</div>
{e.notes && <div style={{ fontSize:11, color:DS.color.textMuted }}>{e.notes}</div>}
<div style={{ fontSize:10, color:DS.color.textMuted, marginTop:3, opacity:.7 }}>بواسطة: {e.by}</div>
</div>
),
}));

return (
<Modal maxW={700} onClose={onClose}>
<ModalHeader id={ticket.id} title={ticket.title}
sub={`👤 ${ticket.beneficiary} · 📲 ${ticket.platform}`}
badges={badges} onClose={onClose}/>
<div style={{ padding:"22px 26px" }}>

{/* معلومات */}
<div style={css.sec()}>
<p style={css.hdr()}>📋 تفاصيل البلاغ</p>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2px 0" }}>
{infoRows.map(([l,v]) => (
<div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0",
borderBottom:`1px solid ${DS.color.brandLight}`, gridColumn:"1/-1" }}>
<span style={{ color:DS.color.textMuted, fontSize:12 }}>{l}</span>
<strong style={{ fontSize:12, maxWidth:"60%", textAlign:"left" }}>{v}</strong>
</div>
))}
</div>
</div>

{/* ملاحظات */}
{ticket.notes && (
<div style={{ ...css.sec(), background:DS.color.brandLight, border:`1px solid ${DS.color.brandLight}` }}>
<p style={css.hdr()}>📝 ملاحظات</p>
<p style={{ margin:0, fontSize:13, color:DS.color.text, lineHeight:1.8 }}>{ticket.notes}</p>
</div>
)}

{/* تسلسل التحويلات */}
<div style={css.sec()}>
<p style={css.hdr()}>🔄 سجل التحويلات ({(ticket.transfers||[]).length})</p>
<Timeline items={transferItems} accentColor={DS.color.brand3} emptyMsg="لا توجد تحويلات بعد"/>
</div>

{/* سجل التصعيدات */}
<div style={css.sec()}>
<p style={css.hdr()}>🔺 سجل التصعيدات ({(ticket.escalations||[]).length})</p>
<Timeline items={escalItems} accentColor={DS.color.danger} emptyMsg="لا توجد تصعيدات بعد"/>
</div>
</div>
</Modal>
);
};

// ============================================================
// CLOSE TICKET
// ============================================================
const CloseModal = ({ ticket, onClose, onConfirm }) => {
const [reason, setReason] = useState(CFG.closeReasons[0]);
return (
<Modal maxW={480} onClose={onClose}>
<ModalHeader title="🔒 إغلاق البلاغ" id={ticket.id} onClose={onClose}/>
<div style={{ padding:24 }}>
<p style={{ fontSize:13, color:DS.color.textMuted, marginTop:0, marginBottom:16 }}>اختر سبب الإغلاق:</p>
<div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
{CFG.closeReasons.map(r => (
<label key={r} onClick={()=>setReason(r)}
style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px",
borderRadius:DS.radius.sm, cursor:"pointer", fontSize:13, fontFamily:DS.font,
border:`2px solid ${reason===r?DS.color.brand3:DS.color.border}`,
background:reason===r?DS.color.brandXL:DS.color.surface,
transition:"all .15s" }}>
<input type="radio" checked={reason===r} onChange={()=>setReason(r)}
style={{ marginTop:2, accentColor:DS.color.brand3 }}/>
{r}
</label>
))}
</div>
<div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
<button onClick={onClose}
style={{ padding:"9px 20px", borderRadius:DS.radius.sm, border:`1.5px solid ${DS.color.border}`,
background:DS.color.surface, cursor:"pointer", fontSize:13, fontFamily:DS.font }}>إلغاء</button>
<button onClick={()=>onConfirm(reason)} style={css.btn(DS.color.neutral, DS.color.surface)}>
🔒 تأكيد الإغلاق
</button>
</div>
</div>
</Modal>
);
};

// ============================================================
// DASHBOARD — لوحة تحكم احترافية
// ============================================================
const Dashboard = ({ tickets }) => {
const st = TS.stats(tickets);
const now = new Date();
const fd = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";

// ===== حسابات متقدمة =====
// متوسط أيام المعالجة (للمغلقة فقط)
const closedWithDates = tickets.filter(t => t.closedAt && t.createdAt);
const avgDays = closedWithDates.length
? (closedWithDates.reduce((s,t) => s + SLA.workDays(t.createdAt, t.closedAt), 0) / closedWithDates.length).toFixed(1)
: "—";

// نسبة الالتزام بـ SLA
const slaRate = st.total ? Math.round(((st.total - st.breached) / st.total) * 100) : 100;

// أعمار البلاغات المفتوحة
const openTickets = tickets.filter(t => !t.closedAt && t.submittedAt);
const ageBuckets = {
safe: openTickets.filter(t => (SLA.calc(t)?.days||0) < 2).length,
warning: openTickets.filter(t => { const d=SLA.calc(t)?.days||0; return d>=2&&d<3; }).length,
breach: openTickets.filter(t => (SLA.calc(t)?.days||0) >= 3).length,
pending: tickets.filter(t => !t.closedAt && !t.submittedAt).length,
};

// البلاغات حسب الجهة — مرتبة بالأكثر تأخراً
const byEntity = CFG.entities.map(e => {
const all = tickets.filter(t => t.entity === e);
const open = all.filter(t => !t.closedAt);
const br = open.filter(t => SLA.calc(t)?.breached);
const avgAge = open.length
? (open.reduce((s,t) => s + (SLA.calc(t)?.days||0), 0) / open.length).toFixed(1)
: 0;
return { name:e, total:all.length, open:open.length, breached:br.length, avgAge:Number(avgAge) };
}).filter(e => e.total > 0).sort((a,b) => b.breached - a.breached || b.avgAge - a.avgAge);

// إحصاء المسؤولين
const byAssignee = CFG.assignees.map(a => ({
name: a,
total: tickets.filter(t => t.assignee === a).length,
open: tickets.filter(t => t.assignee === a && !t.closedAt).length,
closed: tickets.filter(t => t.assignee === a && t.closedAt).length,
breached: tickets.filter(t => t.assignee === a && !t.closedAt && SLA.calc(t)?.breached).length,
}));

// آخر 5 بلاغات مضافة
const recent = [...tickets].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);

// أكثر التصعيدات
const topEsc = [...tickets].filter(t => (t.escalationCount||0)>0)
.sort((a,b) => (b.escalationCount||0)-(a.escalationCount||0)).slice(0,3);

// Pie SVG
const Pie = ({ segments, size=130 }) => {
const tot = segments.reduce((s,d)=>s+d.v,0)||1;
let c=0;
const cx=size/2, cy=size/2, r=size*0.38, ir=size*0.22;
return (
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
{segments.map((d,i)=>{
if(!d.v) return null;
const p=d.v/tot, sa=c*2*Math.PI; c+=p; const ea=c*2*Math.PI;
if(p>=1) return <circle key={i} cx={cx} cy={cy} r={r} fill={d.clr}/>;
const x1=cx+r*Math.sin(sa),y1=cy-r*Math.cos(sa);
const x2=cx+r*Math.sin(ea),y2=cy-r*Math.cos(ea);
return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${p>.5?1:0},1 ${x2},${y2}Z`} fill={d.clr}/>;
})}
<circle cx={cx} cy={cy} r={ir} fill={DS.color.surface}/>
<text x={cx} y={cy-4} textAnchor="middle" fontSize={size*.09} fontWeight="900" fill={DS.color.text}>{tot}</text>
<text x={cx} y={cy+10} textAnchor="middle" fontSize={size*.065} fill={DS.color.textMuted}>بلاغ</text>
</svg>
);
};

// Progress bar مكون
const Bar = ({ pct, clr, h=8 }) => (
<div style={{ background:`${clr}20`, borderRadius:99, height:h, overflow:"hidden", width:"100%" }}>
<div style={{ width:`${Math.min(100,pct)}%`, height:"100%", background:clr,
borderRadius:99, transition:"width .6s ease" }}/>
</div>
);

// KPI card
const KPI = ({ icon, label, value, sub, clr, trend }) => (
<div style={{ background:DS.color.surface, borderRadius:DS.radius.lg, padding:"16px 18px",
boxShadow:DS.shadow.sm, borderTop:`3px solid ${clr}`, position:"relative", overflow:"hidden" }}>
<div style={{ position:"absolute", left:14, top:14, fontSize:28, opacity:.12 }}>{icon}</div>
<div style={{ fontSize:11, color:DS.color.textMuted, fontWeight:700, marginBottom:6,
letterSpacing:".3px" }}>{label}</div>
<div style={{ fontSize:32, fontWeight:900, color:DS.color.text, lineHeight:1 }}>{value}</div>
{sub && <div style={{ fontSize:11, color:clr, fontWeight:700, marginTop:5 }}>{sub}</div>}
{trend !== undefined && (
<div style={{ position:"absolute", left:14, bottom:14, fontSize:11, fontWeight:700,
color: trend>=0 ? DS.color.success : DS.color.danger }}>
{trend>=0?"↑":"↓"} {Math.abs(trend)}%
</div>
)}
</div>
);

const slaPieSeg = [
{ v:ageBuckets.safe, clr:DS.color.success, label:"ضمن SLA" },
{ v:ageBuckets.warning, clr:DS.color.caution, label:"قارب الانتهاء" },
{ v:ageBuckets.breach, clr:DS.color.danger, label:"تجاوز SLA" },
{ v:ageBuckets.pending, clr:DS.color.neutral, label:"لم يُرفع" },
].filter(s=>s.v>0);

return (
<div style={{ direction:"rtl", fontFamily:DS.font }}>

{/* ===== ROW 1: KPIs ===== */}
<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:18 }}>
<KPI icon="📋" label="إجمالي البلاغات" value={st.total} clr={DS.color.brand2} sub={`منذ بداية العمل`}/>
<KPI icon="🔄" label="قيد المعالجة" value={st.open} clr={DS.color.brand3} sub={`${Math.round(st.open/Math.max(st.total,1)*100)}% من الإجمالي`}/>
<KPI icon="✅" label="تمت المعالجة" value={st.closed} clr={DS.color.success} sub={`متوسط ${avgDays} يوم`}/>
<KPI icon="🔺" label="بلاغات مصعدة" value={st.escalated} clr={DS.color.danger} sub={`${st.totalEsc} تصعيد إجمالي`}/>
<KPI icon="⏰" label="تجاوزت SLA" value={st.breached} clr={DS.color.caution} sub={st.breached>0?"تحتاج متابعة عاجلة":"لا تجاوزات ✓"}/>
<KPI icon="📊" label="الالتزام بـ SLA" value={`${slaRate}%`} clr={slaRate>=80?DS.color.success:DS.color.danger} sub={slaRate>=80?"أداء ممتاز":"يحتاج تحسين"}/>
</div>

{/* ===== ROW 2: Charts ===== */}
<div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:14, marginBottom:14 }}>

{/* توزيع SLA */}
<div style={{ background:DS.color.surface, borderRadius:DS.radius.lg, padding:20, boxShadow:DS.shadow.sm }}>
<div style={{ fontSize:13, fontWeight:800, color:DS.color.text, marginBottom:16 }}>
توزيع البلاغات المفتوحة
</div>
<div style={{ display:"flex", alignItems:"center", gap:16 }}>
<Pie segments={slaPieSeg} size={120}/>
<div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
{slaPieSeg.map(s=>(
<div key={s.label}>
<div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
<span style={{ fontSize:11, color:DS.color.textMuted }}>{s.label}</span>
<strong style={{ fontSize:11, color:s.clr }}>{s.v}</strong>
</div>
<Bar pct={(s.v/Math.max(st.open+ageBuckets.pending,1))*100} clr={s.clr} h={5}/>
</div>
))}
</div>
</div>
</div>

{/* الجهات — قلب لوحة التحكم */}
<div style={{ background:DS.color.surface, borderRadius:DS.radius.lg, padding:20, boxShadow:DS.shadow.sm }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
<span style={{ fontSize:13, fontWeight:800, color:DS.color.text }}>البلاغات حسب الجهة المعنية</span>
<span style={{ fontSize:10, color:DS.color.textMuted }}>مرتبة بالأكثر تأخراً</span>
</div>
<div style={{ display:"flex", flexDirection:"column", gap:0 }}>
{/* header */}
<div style={{ display:"grid", gridTemplateColumns:"1.4fr .6fr .6fr .6fr 1.2fr",
padding:"5px 10px", fontSize:10, color:DS.color.textMuted, fontWeight:700,
borderBottom:`1px solid ${DS.color.brandLight}`, marginBottom:4 }}>
<span>الجهة</span><span style={{textAlign:"center"}}>إجمالي</span>
<span style={{textAlign:"center"}}>مفتوح</span>
<span style={{textAlign:"center",color:DS.color.danger}}>تجاوز</span>
<span style={{textAlign:"center"}}>متوسط العمر</span>
</div>
{byEntity.map(e=>(
<div key={e.name} style={{ display:"grid", gridTemplateColumns:"1.4fr .6fr .6fr .6fr 1.2fr",
padding:"9px 10px", borderBottom:`1px solid ${DS.color.brandLight}`,
alignItems:"center", background: e.breached>0 ? `${DS.color.danger}05` : "transparent" }}>
<span style={{ fontSize:12, fontWeight:700, color:DS.color.text }}>{e.name}</span>
<span style={{ textAlign:"center", fontSize:12, fontWeight:700 }}>{e.total}</span>
<span style={{ textAlign:"center", fontSize:12, color:DS.color.brand3, fontWeight:700 }}>{e.open}</span>
<span style={{ textAlign:"center", fontSize:12, fontWeight:800,
color:e.breached>0?DS.color.danger:DS.color.success }}>{e.breached||"✓"}</span>
<div style={{ display:"flex", alignItems:"center", gap:6 }}>
<Bar pct={(e.avgAge/CFG.sla.workDays)*100}
clr={e.avgAge>=3?DS.color.danger:e.avgAge>=2?DS.color.caution:DS.color.success} h={6}/>
<span style={{ fontSize:10, color:DS.color.textMuted, whiteSpace:"nowrap",
minWidth:28 }}>{e.avgAge}ي</span>
</div>
</div>
))}
{byEntity.length===0 && (
<div style={{ textAlign:"center", padding:16, color:DS.color.textMuted, fontSize:12 }}>
لا توجد بيانات
</div>
)}
</div>
</div>
</div>

{/* ===== ROW 3: تفاصيل إضافية ===== */}
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:14 }}>

{/* مؤقتات SLA */}
<div style={{ background:DS.color.surface, borderRadius:DS.radius.lg, padding:18, boxShadow:DS.shadow.sm }}>
<div style={{ fontSize:13, fontWeight:800, color:DS.color.text, marginBottom:12 }}>⏰ تنبيهات SLA</div>
{openTickets.length===0
? <div style={{ textAlign:"center", padding:16, color:DS.color.success, fontSize:12,
background:DS.color.successBg, borderRadius:DS.radius.sm }}>✅ جميع البلاغات ضمن SLA</div>
: <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
{openTickets
.sort((a,b)=>(SLA.calc(b)?.days||0)-(SLA.calc(a)?.days||0))
.slice(0,5).map(t=>{
const s=SLA.calc(t);
return (
<div key={t.id} style={{ display:"flex", justifyContent:"space-between",
alignItems:"center", padding:"8px 10px", borderRadius:DS.radius.sm,
background:s?.bg, border:`1px solid ${s?.clr}25` }}>
<div>
<div style={{ fontSize:11, fontWeight:700, color:DS.color.text }}>{t.title}</div>
<div style={{ fontSize:10, color:DS.color.textMuted }}>{t.entity}</div>
</div>
<div style={{ fontSize:14, fontWeight:900, color:s?.clr }}>{s?.label}</div>
</div>
);
})}
</div>
}
</div>

{/* آخر البلاغات */}
<div style={{ background:DS.color.surface, borderRadius:DS.radius.lg, padding:18, boxShadow:DS.shadow.sm }}>
<div style={{ fontSize:13, fontWeight:800, color:DS.color.text, marginBottom:12 }}>🆕 آخر البلاغات المضافة</div>
<div style={{ display:"flex", flexDirection:"column", gap:7 }}>
{recent.map(t=>{
const st=TS.status(t);
return (
<div key={t.id} style={{ display:"flex", justifyContent:"space-between",
alignItems:"center", padding:"7px 10px", borderRadius:DS.radius.sm,
background:DS.color.brandXL, border:`1px solid ${DS.color.brandLight}` }}>
<div>
<div style={{ fontSize:11, fontWeight:700, color:DS.color.text }}>{t.title}</div>
<div style={{ fontSize:10, color:DS.color.textMuted }}>{t.entity} · {fd(t.createdAt)}</div>
</div>
<Badge clr={st.clr} bg={st.bg} label={st.label}/>
</div>
);
})}
</div>
</div>

{/* إنجاز المسؤولين */}
<div style={{ background:DS.color.surface, borderRadius:DS.radius.lg, padding:18, boxShadow:DS.shadow.sm }}>
<div style={{ fontSize:13, fontWeight:800, color:DS.color.text, marginBottom:14 }}>👤 إنجاز المسؤولين</div>
{byAssignee.map(a => (
<div key={a.name} style={{ marginBottom:14 }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
<span style={{ fontSize:12, fontWeight:800, color:DS.color.text }}>{a.name}</span>
<div style={{ display:"flex", gap:5 }}>
<Badge clr={DS.color.brand3} bg={DS.color.brandLight} label={`📋 ${a.total}`}/>
<Badge clr={DS.color.success} bg={DS.color.successBg} label={`✅ ${a.closed}`}/>
{a.breached>0 && <Badge clr={DS.color.danger} bg={DS.color.dangerBg} label={`⏰ ${a.breached}`}/>}
</div>
</div>
<div style={{ display:"flex", gap:2, height:8, borderRadius:99, overflow:"hidden" }}>
<div style={{ flex:a.closed, background:DS.color.success, minWidth:a.closed?2:0 }}/>
<div style={{ flex:a.open-a.breached, background:DS.color.brand3, minWidth:(a.open-a.breached)>0?2:0 }}/>
<div style={{ flex:a.breached, background:DS.color.danger, minWidth:a.breached?2:0 }}/>
<div style={{ flex:Math.max(0,a.total===0?1:0), background:DS.color.neutralBg }}/>
</div>
<div style={{ display:"flex", gap:10, marginTop:5, fontSize:10, color:DS.color.textMuted }}>
<span>✅ {a.closed} معالجة</span>
<span>🔄 {a.open} مفتوحة</span>
{a.breached>0 && <span style={{ color:DS.color.danger }}>⏰ {a.breached} تجاوز</span>}
</div>
</div>
))}
</div>

{/* أكثر التصعيدات + ملخص الإنجاز */}
<div style={{ display:"flex", flexDirection:"column", gap:14 }}>

{/* ملخص الإنجاز */}
<div style={{ background:`linear-gradient(135deg,${DS.color.brand},${DS.color.brand2})`,
borderRadius:DS.radius.lg, padding:18, boxShadow:DS.shadow.sm, color:DS.color.surface }}>
<div style={{ fontSize:13, fontWeight:800, marginBottom:12 }}>📈 ملخص الإنجاز</div>
{[
["تمت المعالجة", st.closed, DS.color.surface],
["الالتزام بـ SLA", `${slaRate}%`, DS.color.surface],
["متوسط المعالجة", `${avgDays} يوم`, DS.color.surface],
["إجمالي التصعيدات", st.totalEsc, DS.color.surface],
].map(([l,v,c])=>(
<div key={l} style={{ display:"flex", justifyContent:"space-between",
padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,.15)" }}>
<span style={{ fontSize:11, opacity:.8 }}>{l}</span>
<strong style={{ fontSize:12, color:c }}>{v}</strong>
</div>
))}
</div>

{/* أعلى تصعيدات */}
{topEsc.length>0 && (
<div style={{ background:DS.color.surface, borderRadius:DS.radius.lg, padding:18, boxShadow:DS.shadow.sm, flex:1 }}>
<div style={{ fontSize:13, fontWeight:800, color:DS.color.text, marginBottom:10 }}>🔺 أعلى تصعيدات</div>
{topEsc.map(t=>(
<div key={t.id} style={{ display:"flex", justifyContent:"space-between",
alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${DS.color.brandLight}` }}>
<span style={{ fontSize:11, color:DS.color.text, flex:1 }}>{t.title}</span>
<span style={{ fontSize:12, fontWeight:900, color:DS.color.danger,
background:DS.color.dangerBg, padding:"2px 8px", borderRadius:DS.radius.full }}>
{t.escalationCount}×
</span>
</div>
))}
</div>
)}
</div>
</div>

</div>
);
};

// ============================================================
// TICKETS LIST
// ============================================================
const TicketsList = ({ tickets, onEdit, onView, onDelete, onClose }) => {
const [q,setQ] = useState("");
const [fE,setFE] = useState("all");
const [fA,setFA] = useState("all");
const [ord,setOrd] = useState("date");

const list = useMemo(()=>{
const f = tickets.filter(t=>{
if (fE!=="all"&&t.entity!==fE) return false;
if (fA!=="all"&&t.assignee!==fA) return false;
if (q&&![t.id,t.title,t.beneficiary].some(x=>x?.toLowerCase().includes(q.toLowerCase()))) return false;
return true;
});
return [...f].sort((a,b)=>{
if (ord==="sla"){ const sa=SLA.calc(a),sb=SLA.calc(b); return (sb?.days||0)-(sa?.days||0); }
if (ord==="esc") return (b.escalationCount||0)-(a.escalationCount||0);
return new Date(b.createdAt)-new Date(a.createdAt);
});
},[tickets,q,fE,fA,ord]);

const fd = d=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
const sF = css.input({ padding:"8px 12px", width:"auto" });

return (
<div style={{ direction:"rtl", fontFamily:DS.font }}>
{/* Toolbar */}
<div style={{ ...css.card({ padding:13 }), marginBottom:13, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
<input style={{ ...sF, flex:1, minWidth:180 }} placeholder="🔍 بحث بالرقم أو العنوان أو المستفيد..."
value={q} onChange={e=>setQ(e.target.value)}/>
{[
[fE,setFE,"جميع الجهات", CFG.entities],
[fA,setFA,"جميع المسؤولين", CFG.assignees],
].map(([val,set,all,opts],i)=>(
<select key={i} style={{...sF,cursor:"pointer"}} value={val} onChange={e=>set(e.target.value)}>
<option value="all">{all}</option>
{opts.map(o=><option key={o}>{o}</option>)}
</select>
))}
<select style={{...sF,cursor:"pointer"}} value={ord} onChange={e=>setOrd(e.target.value)}>
<option value="date">الأحدث أولاً</option>
<option value="sla">حسب SLA</option>
<option value="esc">التصعيدات</option>
</select>
<span style={{ fontSize:11, color:DS.color.textMuted, marginRight:"auto" }}>{list.length} بلاغ</span>
</div>

{/* Cards */}
<div style={{ display:"flex", flexDirection:"column", gap:8 }}>
{list.map(t=>{
const s = SLA.calc(t);
const st = TS.status(t);
const pri = CFG.priorityColors[t.priority]||DS.color.brand;
return (
<div key={t.id} style={{ background:DS.color.surface, borderRadius:DS.radius.md, padding:"13px 16px",
boxShadow:DS.shadow.sm, borderRight:`3px solid ${s?.clr||DS.color.neutral}`,
display:"flex", gap:12, alignItems:"flex-start", flexWrap:"wrap",
transition:"box-shadow .15s" }}>
<div style={{ flex:1, minWidth:0 }}>
{/* Badges row */}
<div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
<span style={{ fontSize:10, fontWeight:800, color:DS.color.textMuted,
background:DS.color.neutralBg, padding:"2px 7px", borderRadius:DS.radius.xs }}>{t.id}</span>
<StatBadge ticket={t}/>
{s && <SLABadge ticket={t}/>}
{(t.escalationCount||0)>0 &&
<Badge clr={DS.color.danger} bg={DS.color.dangerBg} label={`🔺 ${t.escalationCount}`}/>}
{(t.transfers||[]).length>0 &&
<Badge clr={DS.color.brand3} bg={DS.color.brandLight} label={`🔄 ${t.transfers.length}`}/>}
{t.closedAt && <Badge clr={DS.color.neutral} bg={DS.color.neutralBg} label="🔒"/>}
<Badge clr={pri} bg={`${pri}15`} label={CFG.priorityLabels[t.priority]||""}/>
</div>
{/* Title */}
<div style={{ fontSize:13, fontWeight:800, color:DS.color.text, marginBottom:5 }}>{t.title}</div>
{/* Meta */}
<div style={{ fontSize:11, color:DS.color.textMuted, display:"flex", gap:10, flexWrap:"wrap" }}>
<span>👤 {t.beneficiary}</span>
<span>🏢 {t.entity}</span>
<span>📲 {t.platform}</span>
<span>🧑‍💼 {t.assignee}</span>
<span>📅 {fd(t.createdAt)}</span>
{t.submittedAt && <span style={{ color:DS.color.brand3 }}>📤 {fd(t.submittedAt)}</span>}
</div>
</div>
{/* Actions */}
<div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"flex-start" }}>
{[
["عرض", ()=>onView(t), DS.color.brandLight, DS.color.brand2],
["تعديل", ()=>onEdit(t), DS.color.successBg, DS.color.success],
...(!t.closedAt?[["إغلاق",()=>onClose(t),DS.color.neutralBg,DS.color.neutral]]: []),
["حذف", ()=>confirm("حذف البلاغ؟")&&onDelete(t.id), DS.color.dangerBg, DS.color.danger],
].map(([lbl,fn,bg,clr])=>(
<button key={lbl} onClick={fn} aria-label={lbl}
style={css.btn(bg,clr,{padding:"5px 11px",fontWeight:700,fontSize:11})}>
{lbl}
</button>
))}
</div>
</div>
);
})}
{list.length===0 && (
<div style={{ textAlign:"center", padding:52, color:"#90a4ae" }}>
<div style={{ fontSize:48, marginBottom:12 }}>📭</div>
<div style={{ fontSize:14, fontWeight:700 }}>لا توجد بلاغات</div>
</div>
)}
</div>
</div>
);
};

// ============================================================
// REPORTS
// ============================================================
const Reports = ({ tickets }) => {
const [f, setF] = useState({ entity:"all", assignee:"all", status:"all", from:"", to:"" });
const sf = (k,v) => setF(p=>({...p,[k]:v}));

const data = useMemo(()=>tickets.filter(t=>{
if (f.entity!=="all"&&t.entity!==f.entity) return false;
if (f.assignee!=="all"&&t.assignee!==f.assignee)return false;
if (f.status==="open"&&t.closedAt) return false;
if (f.status==="closed"&&!t.closedAt) return false;
if (f.from&&t.createdAt<f.from) return false;
if (f.to&&t.createdAt>f.to) return false;
return true;
}),[tickets,f]);

const st = TS.stats(data);
const fd = d=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
const sIF = css.input({ padding:"8px 12px", width:"auto" });

const exportCSV = () => {
const H = ["رقم البلاغ","العنوان","المستفيد","المنصة","الجهة","المسؤول","الأولوية",
"تاريخ الإنشاء","تاريخ الرفع","تاريخ الإغلاق","سبب الإغلاق",
"الحالة","SLA أيام","تصعيدات","تحويلات"];
const R = data.map(t=>{
const s=SLA.calc(t), st=TS.status(t);
return [t.id,t.title,t.beneficiary,t.platform,t.entity,t.assignee,
CFG.priorityLabels[t.priority]||"",t.createdAt,t.submittedAt||"",
t.closedAt||"",t.closeReason||"",st.label,s?.days??0,
t.escalationCount||0,(t.transfers||[]).length];
});
const csv=[H,...R].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
Object.assign(document.createElement("a"),{href:url,download:"تقرير_البلاغات.csv"}).click();
setTimeout(()=>URL.revokeObjectURL(url),1000);
};

const cols = ["رقم البلاغ","العنوان","المستفيد","الجهة","المسؤول","تاريخ الإنشاء","تاريخ الرفع","الحالة","SLA","تصعيدات","تحويلات"];

return (
<div style={{ direction:"rtl", fontFamily:DS.font }}>
{/* Filters */}
<div style={{ ...css.card({padding:16}), marginBottom:16 }}>
<p style={{ fontSize:13, fontWeight:800, color:DS.color.text, margin:"0 0 12px" }}>🔍 تصفية التقرير</p>
<div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
{[
[f.entity, v=>sf("entity",v), "جميع الجهات", CFG.entities],
[f.assignee,v=>sf("assignee",v),"جميع المسؤولين", CFG.assignees],
].map(([val,fn,all,opts],i)=>(
<select key={i} style={{...sIF,cursor:"pointer"}} value={val} onChange={e=>fn(e.target.value)}>
<option value="all">{all}</option>
{opts.map(o=><option key={o}>{o}</option>)}
</select>
))}
<select style={{...sIF,cursor:"pointer"}} value={f.status} onChange={e=>sf("status",e.target.value)}>
<option value="all">جميع الحالات</option>
<option value="open">مفتوحة</option>
<option value="closed">مغلقة</option>
</select>
<input type="date" style={sIF} value={f.from} onChange={e=>sf("from",e.target.value)}/>
<input type="date" style={sIF} value={f.to} onChange={e=>sf("to", e.target.value)}/>
<button onClick={()=>setF({entity:"all",assignee:"all",status:"all",from:"",to:""})}
style={{ ...sIF, cursor:"pointer", background:DS.color.surface, width:"auto" }}>↺</button>
</div>
</div>

{/* Summary */}
<div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
{[["📋 إجمالي",st.total,DS.color.brand2],["✅ مغلقة",st.closed,DS.color.neutral],
["🔺 تصعيدات",st.totalEsc,DS.color.danger],["⏰ تجاوز SLA",st.breached,DS.color.caution]].map(([l,v,c])=>(
<div key={l} style={{ background:DS.color.surface, borderRadius:DS.radius.md, padding:14,
textAlign:"center", boxShadow:DS.shadow.sm, borderTop:`3px solid ${c}` }}>
<div style={{ fontSize:28, fontWeight:900, color:DS.color.text }}>{v}</div>
<div style={{ fontSize:11, color:DS.color.textMuted, marginTop:4 }}>{l}</div>
</div>
))}
</div>

{/* Table */}
<div style={{ background:DS.color.surface, borderRadius:DS.radius.lg, overflow:"hidden", boxShadow:DS.shadow.sm }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 18px",
background:`linear-gradient(135deg,${DS.color.brand},${DS.color.brand2})`, color:DS.color.surface }}>
<span style={{ fontSize:13, fontWeight:800, fontFamily:DS.font }}>
نتائج التقرير ({data.length} بلاغ)
</span>
<button onClick={exportCSV}
style={css.btn("rgba(255,255,255,.18)", DS.color.surface,
{ border:"1px solid rgba(255,255,255,.35)", padding:"7px 16px" })}>
⬇ تصدير Excel
</button>
</div>
<div style={{ overflowX:"auto" }}>
<table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, fontFamily:DS.font }}>
<thead>
<tr style={{ background:DS.color.brandXL }}>
{cols.map(h=>(
<th key={h} style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color:DS.color.brand,
borderBottom:`2px solid ${DS.color.brandLight}`, whiteSpace:"nowrap", letterSpacing:".2px" }}>{h}</th>
))}
</tr>
</thead>
<tbody>
{data.map((t,i)=>{
const s=SLA.calc(t), st=TS.status(t);
return (
<tr key={`r-${t.id}`}
style={{ background:i%2?DS.color.brandXL:DS.color.surface, borderBottom:`1px solid ${DS.color.brandLight}` }}>
<td style={{ padding:"9px 12px", fontWeight:800, color:DS.color.brand3, whiteSpace:"nowrap" }}>{t.id}</td>
<td style={{ padding:"9px 12px", maxWidth:160 }}>{t.title}</td>
<td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>{t.beneficiary}</td>
<td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>{t.entity}</td>
<td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>{t.assignee}</td>
<td style={{ padding:"9px 12px", color:DS.color.textMuted, whiteSpace:"nowrap" }}>{fd(t.createdAt)}</td>
<td style={{ padding:"9px 12px", color:DS.color.textMuted, whiteSpace:"nowrap" }}>{fd(t.submittedAt)}</td>
<td style={{ padding:"9px 12px" }}><Badge clr={st.clr} bg={st.bg} label={st.label}/></td>
<td style={{ padding:"9px 12px" }}>{s?<Badge clr={s.clr} bg={s.bg} label={s.label}/>:"—"}</td>
<td style={{ padding:"9px 12px", textAlign:"center", fontWeight:800,
color:(t.escalationCount||0)>0?DS.color.danger:DS.color.success }}>{t.escalationCount||0}</td>
<td style={{ padding:"9px 12px", textAlign:"center", fontWeight:800,
color:(t.transfers||[]).length>0?DS.color.brand3:DS.color.textMuted }}>{(t.transfers||[]).length}</td>
</tr>
);
})}
</tbody>
</table>
{data.length===0 && (
<div style={{ textAlign:"center", padding:32, color:"#90a4ae", fontSize:13 }}>لا توجد بيانات</div>
)}
</div>
</div>
</div>
);
};

// ============================================================
// APP
// ============================================================
const TABS = [
{ id:"dash", icon:"📊", label:"لوحة التحكم" },
{ id:"tickets", icon:"📋", label:"سجل البلاغات" },
{ id:"reports", icon:"📈", label:"التقارير" },
];

export default function App() {
const [tickets, dispatch] = useReducer(reducer, null, () => Store.load() || SEED);
const [tab, setTab] = useState("dash");
const [form, setForm] = useState(null); // null | ticket | "new"
const [view, setView] = useState(null);
const [close,setClose]= useState(null);
const [toast,setToast]= useState("");

// Auto-save on every change
useEffect(() => { Store.save(tickets); }, [tickets]);

const notify = msg => { setToast(msg); setTimeout(()=>setToast(""),3000); };

const handleSave = useCallback(t => {
const errs = TS.validate(t);
if (errs.length) { alert(errs.join("\n")); return; }
dispatch({ type:"UPSERT", ticket:t });
setForm(null);
}, []);

const handleClose = useCallback(reason => {
dispatch({ type:"CLOSE", id:close.id, reason });
setClose(null);
}, [close]);

const handleExport = () => { Store.export(tickets); notify("✅ تم حفظ النسخة الاحتياطية"); };

const handleImport = async e => {
const file = e.target.files[0]; if (!file) return;
try {
const valid = await Store.import(file);
dispatch({ type:"SET", tickets:valid });
notify(`✅ استُورد ${valid.length} بلاغ`);
} catch(err) { alert("خطأ: "+err.message); }
e.target.value = "";
};

const breached = tickets.filter(t => !t.closedAt && SLA.calc(t)?.breached).length;

return (
<div lang="ar" style={{ minHeight:"100vh", background:DS.color.bg, fontFamily:DS.font, direction:"rtl" }}>
{/* HEADER */}
<header style={{ background:`linear-gradient(135deg,${DS.color.brand},${DS.color.brand2})`,
height:60, padding:"0 20px", display:"flex", alignItems:"center", gap:12,
position:"sticky", top:0, zIndex:999, boxShadow:DS.shadow.lg }}>

{/* Brand */}
<div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
<div style={{ width:34, height:34, background:"rgba(255,255,255,.15)", borderRadius:DS.radius.sm,
display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>🎛</div>
<div style={{ color:DS.color.surface, lineHeight:1.3 }}>
<div style={{ fontSize:14, fontWeight:800, whiteSpace:"nowrap" }}>متابعة البلاغات التقنية</div>
<div style={{ fontSize:9, opacity:.55, letterSpacing:".5px" }}>TICKET MANAGEMENT</div>
</div>
</div>

{/* Nav */}
<nav style={{ display:"flex", gap:2, marginRight:"auto" }}>
{TABS.map(t=>(
<button key={t.id} onClick={()=>setTab(t.id)}
style={{ padding:"6px 14px", borderRadius:DS.radius.sm, border:"none", cursor:"pointer",
fontSize:11, fontWeight:700, fontFamily:DS.font,
background: tab===t.id?"rgba(255,255,255,.22)":"transparent",
color: tab===t.id?DS.color.surface:"rgba(255,255,255,.6)",
transition:"all .15s" }}>
{t.icon} {t.label}
</button>
))}
</nav>

{/* Indicators */}
{breached>0 &&
<span style={{ background:DS.color.danger, color:DS.color.surface, padding:"4px 10px",
borderRadius:DS.radius.full, fontSize:10, fontWeight:800, animation:"pulse 2s infinite" }}>
⚠ {breached} تجاوز SLA
</span>}
{toast &&
<span style={{ background:"rgba(255,255,255,.2)", color:DS.color.surface,
padding:"4px 10px", borderRadius:DS.radius.full, fontSize:10, fontWeight:700 }}>
{toast}
</span>}

{/* Tools */}
<div style={{ display:"flex", gap:6 }}>
<button onClick={handleExport}
style={{ padding:"6px 12px", background:"rgba(255,255,255,.12)", color:DS.color.surface,
border:"1px solid rgba(255,255,255,.25)", borderRadius:DS.radius.sm, cursor:"pointer",
fontSize:11, fontWeight:700, fontFamily:DS.font }}>💾</button>
<label style={{ padding:"6px 12px", background:"rgba(255,255,255,.12)", color:DS.color.surface,
border:"1px solid rgba(255,255,255,.25)", borderRadius:DS.radius.sm, cursor:"pointer",
fontSize:11, fontWeight:700, fontFamily:DS.font }}>
📂<input type="file" accept=".json" onChange={handleImport} style={{ display:"none" }}/>
</label>
<button onClick={()=>setForm("new")}
style={{ padding:"6px 16px", background:"rgba(255,255,255,.18)", color:DS.color.surface,
border:"1px solid rgba(255,255,255,.3)", borderRadius:DS.radius.sm, cursor:"pointer",
fontSize:11, fontWeight:800, fontFamily:DS.font }}>＋ بلاغ جديد</button>
</div>
</header>

{/* MAIN */}
<main style={{ maxWidth:1180, margin:"0 auto", padding:"20px 14px" }}>
{tab==="dash" && <Dashboard tickets={tickets}/>}
{tab==="tickets" && (
<TicketsList tickets={tickets}
onEdit={t => setForm(t)}
onView={t => setView(t)}
onDelete={id => { if(confirm("حذف هذا البلاغ نهائياً؟")) dispatch({type:"DELETE",id}); }}
onClose={t => setClose(t)}/>
)}
{tab==="reports" && <Reports tickets={tickets}/>}
</main>

{/* MODALS */}
{form && <TicketForm ticket={form==="new"?null:form} onSave={handleSave} onClose={()=>setForm(null)}/>}
{view && <TicketDetail ticket={view} onClose={()=>setView(null)}/>}
{close && <CloseModal ticket={close} onClose={()=>setClose(null)} onConfirm={handleClose}/>}

<style>{`
* { box-sizing:border-box; font-family:Calibri,'Segoe UI',sans-serif; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.65} }
::-webkit-scrollbar { width:5px; height:5px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:#b0bec5; border-radius:3px; }
input[type=date]::-webkit-calendar-picker-indicator { opacity:.5; cursor:pointer; }
`}</style>
</div>
);
}
