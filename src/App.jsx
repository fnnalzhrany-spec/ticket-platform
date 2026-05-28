import React from "react";

import { useState, useMemo } from "react";

const today = new Date();
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); };

const TICKET_PLATFORMS = ["الهيئة", "أسهل", "تواصل اجتماعي"];
const FOLLOW_CHANNELS  = ["أسهل", "بريد إلكتروني"];
const ENTITIES         = ["آي سوفت", "أعمالي", "علم", "قسم الفحص الفني"];
const ASSIGNEES        = ["أفنان الزهراني", "نوف العويس"];
const ESCALATION_TARGETS = ["رئيس البلاغات", "قسم الفحص الفني"];
const PRIORITY_LABELS  = { critical:"حرج", high:"عالي", medium:"متوسط", low:"منخفض" };
const PRIORITY_COLORS  = { critical:"#b91c1c", high:"#c2410c", medium:"#b45309", low:"#15803d" };
const STATUS_LABELS    = { new:"جديد", in_progress:"تحت المعالجة", waiting:"بانتظار الرد", escalated:"تم التصعيد", resolved:"معالج", closed:"مغلق" };
const STATUS_COLORS    = { new:"#1d4ed8", in_progress:"#0369a1", waiting:"#b45309", escalated:"#b91c1c", resolved:"#15803d", closed:"#374151" };
const STATUS_BG        = { new:"#eff6ff", in_progress:"#e0f2fe", waiting:"#fef3c7", escalated:"#fee2e2", resolved:"#dcfce7", closed:"#f3f4f6" };
const SA_GREEN="#006c35", SA_GOLD="#c8a951", SA_DARK="#1a2e1a", SA_LIGHT="#f0f7f2";

const calcWorkingDays = (s, e) => { let c=0; const cur=new Date(s); cur.setHours(0,0,0,0); const end=new Date(e); end.setHours(0,0,0,0); while(cur<end){const d=cur.getDay(); if(d!==5&&d!==6)c++; cur.setDate(cur.getDate()+1);} return c; };
const calcSLAStatus = (t) => { if(t.status==="closed"||t.status==="resolved") return "met"; const r=t.transferredAt||t.submittedAt; if(!r) return "pending"; const d=calcWorkingDays(r,new Date()); if(d>=3) return "breached"; if(d>=2) return "warning"; return "ok"; };
const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit"}) : "—";
const todayStr = () => new Date().toISOString().slice(0,10);
const genId = () => { const y=new Date().getFullYear(); return `TKT-${y}-${String(Math.floor(Math.random()*9000)+1000)}`; };

const INIT_TICKETS = [
  {id:"TKT-2025-1001",title:"خطأ في عملية التحقق",platform:"الهيئة",followChannel:"أسهل",beneficiary:"محمد العمري",entity:"آي سوفت",assignee:"أفنان الزهراني",priority:"critical",status:"escalated",createdAt:daysAgo(7),submittedAt:daysAgo(7),transferredAt:null,transferredEntity:null,closedAt:null,notes:"يؤثر على عمليات الهيئة",escalationCount:2},
  {id:"TKT-2025-1002",title:"تأخر استجابة النظام",platform:"أسهل",followChannel:"بريد إلكتروني",beneficiary:"سلطان الغامدي",entity:"أعمالي",assignee:"نوف العويس",priority:"high",status:"in_progress",createdAt:daysAgo(4),submittedAt:daysAgo(4),transferredAt:null,transferredEntity:null,closedAt:null,notes:"",escalationCount:1},
  {id:"TKT-2025-1003",title:"مشكلة في رفع المستندات",platform:"تواصل اجتماعي",followChannel:"أسهل",beneficiary:"هند الشهري",entity:"علم",assignee:"أفنان الزهراني",priority:"medium",status:"resolved",createdAt:daysAgo(10),submittedAt:daysAgo(9),transferredAt:null,transferredEntity:null,closedAt:daysAgo(6),notes:"تم الحل",escalationCount:0},
  {id:"TKT-2025-1004",title:"عدم ظهور بيانات المستخدم",platform:"الهيئة",followChannel:"بريد إلكتروني",beneficiary:"عبدالله الدوسري",entity:"قسم الفحص الفني",assignee:"نوف العويس",priority:"low",status:"closed",createdAt:daysAgo(12),submittedAt:daysAgo(12),transferredAt:null,transferredEntity:null,closedAt:daysAgo(9),notes:"",escalationCount:0},
  {id:"TKT-2025-1005",title:"خلل في واجهة الدفع",platform:"أسهل",followChannel:"أسهل",beneficiary:"ريم القحطاني",entity:"آي سوفت",assignee:"أفنان الزهراني",priority:"critical",status:"in_progress",createdAt:daysAgo(5),submittedAt:daysAgo(5),transferredAt:null,transferredEntity:null,closedAt:null,notes:"قيد التحقيق",escalationCount:1},
  {id:"TKT-2025-1006",title:"عدم إرسال رمز التحقق",platform:"الهيئة",followChannel:"بريد إلكتروني",beneficiary:"فيصل الحربي",entity:"أعمالي",assignee:"نوف العويس",priority:"medium",status:"new",createdAt:daysAgo(1),submittedAt:null,transferredAt:null,transferredEntity:null,closedAt:null,notes:"",escalationCount:0},
];
const INIT_ESCALATIONS = [
  {id:1,ticketId:"TKT-2025-1001",date:daysAgo(5),escalatedTo:"رئيس البلاغات",by:"أفنان الزهراني",notes:"لا يوجد رد"},
  {id:2,ticketId:"TKT-2025-1001",date:daysAgo(3),escalatedTo:"قسم الفحص الفني",by:"أفنان الزهراني",notes:"تصعيد ثانٍ"},
  {id:3,ticketId:"TKT-2025-1002",date:daysAgo(2),escalatedTo:"رئيس البلاغات",by:"نوف العويس",notes:""},
  {id:4,ticketId:"TKT-2025-1005",date:daysAgo(3),escalatedTo:"قسم الفحص الفني",by:"أفنان الزهراني",notes:""},
];

const Badge = ({color,bg,label}) => <span style={{background:bg,color,padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,whiteSpace:"nowrap",border:`1px solid ${color}22`}}>{label}</span>;
const SLABadge = ({status}) => { const map={met:["#15803d","#dcfce7","✓ ضمن SLA"],ok:["#0369a1","#e0f2fe","⏱ ضمن الوقت"],warning:["#b45309","#fef3c7","⚠ قارب الانتهاء"],breached:["#b91c1c","#fee2e2","✗ تجاوز SLA"],pending:["#6b7280","#f3f4f6","لم يُرفع بعد"]}; const [c,bg,label]=map[status]||map.pending; return <Badge color={c} bg={bg} label={label}/>; };
const Field = ({label,children}) => <div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:700,color:"#374151"}}>{label}</label>{children}</div>;
const iS = {padding:"9px 13px",borderRadius:9,border:"1.5px solid #d1d5db",fontSize:13,fontFamily:"inherit",direction:"rtl",background:"#fafafa",width:"100%",boxSizing:"border-box"};

const TicketForm = ({ticket,onSave,onClose}) => {
  const empty = {id:"",title:"",platform:TICKET_PLATFORMS[0],followChannel:FOLLOW_CHANNELS[0],beneficiary:"",entity:ENTITIES[0],assignee:ASSIGNEES[0],priority:"medium",status:"new",createdAt:todayStr(),submittedAt:"",closedAt:"",notes:"",escalationCount:0,transferredAt:null,transferredEntity:null};
  const [form,setForm] = useState(ticket?{...empty,...ticket}:empty);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const save = () => { if(!form.title.trim()) return alert("يرجى إدخال عنوان البلاغ"); if(!form.beneficiary.trim()) return alert("يرجى إدخال اسم المستفيد"); onSave(form.id?form:{...form,id:genId()}); };
  const sec = {background:"#f8fafc",borderRadius:12,padding:"16px 18px",marginBottom:14};
  const hdr = {fontSize:13,fontWeight:800,color:SA_GREEN,marginTop:0,marginBottom:14,paddingBottom:8,borderBottom:`2px solid ${SA_GREEN}22`};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:640,maxHeight:"93vh",overflowY:"auto",direction:"rtl",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{background:`linear-gradient(135deg,${SA_DARK},${SA_GREEN})`,padding:"20px 26px",borderRadius:"20px 20px 0 0",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:11,opacity:.7,marginBottom:3}}>{form.id||"بلاغ جديد"}</div><h2 style={{margin:0,fontSize:18,fontWeight:900}}>{ticket?"✏️ تعديل البلاغ":"➕ إضافة بلاغ جديد"}</h2></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:17}}>✕</button>
        </div>
        <div style={{padding:"22px 26px"}}>
          <div style={sec}><h3 style={hdr}>📋 بيانات البلاغ</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="رقم البلاغ"><input style={{...iS,background:"#f1f5f9",color:"#6b7280"}} value={form.id||"يُولَّد تلقائياً"} readOnly/></Field>
              <Field label="منصة البلاغ"><select style={{...iS,cursor:"pointer"}} value={form.platform} onChange={e=>set("platform",e.target.value)}>{TICKET_PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></Field>
              <Field label="اسم المستفيد *"><input style={iS} value={form.beneficiary} onChange={e=>set("beneficiary",e.target.value)} placeholder="أدخل اسم المستفيد..."/></Field>
              <Field label="أين يتابع البلاغ؟"><select style={{...iS,cursor:"pointer"}} value={form.followChannel} onChange={e=>set("followChannel",e.target.value)}>{FOLLOW_CHANNELS.map(c=><option key={c}>{c}</option>)}</select></Field>
              <div style={{gridColumn:"1/-1"}}><Field label="عنوان / وصف البلاغ *"><input style={iS} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="وصف مختصر للمشكلة..."/></Field></div>
            </div>
          </div>
          <div style={sec}><h3 style={hdr}>🏢 الجهة المعنية والمسؤول</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="الجهة المعنية"><select style={{...iS,cursor:"pointer"}} value={form.entity} onChange={e=>set("entity",e.target.value)}>{ENTITIES.map(e=><option key={e}>{e}</option>)}</select></Field>
              <Field label="المسؤول"><select style={{...iS,cursor:"pointer"}} value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{ASSIGNEES.map(a=><option key={a}>{a}</option>)}</select></Field>
              <Field label="الأولوية"><select style={{...iS,cursor:"pointer"}} value={form.priority} onChange={e=>set("priority",e.target.value)}>{Object.entries(PRIORITY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="الحالة"><select style={{...iS,cursor:"pointer"}} value={form.status} onChange={e=>set("status",e.target.value)}>{Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
            </div>
          </div>
          <div style={sec}><h3 style={hdr}>📅 التواريخ</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="تاريخ الإنشاء"><input type="date" style={iS} value={form.createdAt} onChange={e=>set("createdAt",e.target.value)}/></Field>
              <Field label="تاريخ الرفع للجهة"><input type="date" style={iS} value={form.submittedAt||""} onChange={e=>set("submittedAt",e.target.value)}/></Field>
              <Field label="تاريخ الإغلاق"><input type="date" style={iS} value={form.closedAt||""} onChange={e=>set("closedAt",e.target.value)}/></Field>
              <div style={{display:"flex",alignItems:"center",background:"#f0fdf4",borderRadius:9,padding:"10px 14px",border:"1.5px solid #86efac"}}><span style={{fontSize:12,color:"#15803d",fontWeight:700}}>⏱ SLA: 3 أيام عمل (الأحد—الخميس)</span></div>
            </div>
          </div>
          <div style={sec}><h3 style={hdr}>🔄 تحويل لجهة أخرى</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="الجهة الجديدة"><select style={{...iS,cursor:"pointer"}} value={form.transferredEntity||""} onChange={e=>set("transferredEntity",e.target.value||null)}><option value="">— لا يوجد —</option>{ENTITIES.map(e=><option key={e}>{e}</option>)}</select></Field>
              <Field label="تاريخ التحويل"><input type="date" style={{...iS,background:form.transferredEntity?"#fafafa":"#f3f4f6"}} value={form.transferredAt||""} onChange={e=>set("transferredAt",e.target.value||null)} disabled={!form.transferredEntity}/></Field>
            </div>
          </div>
          <div style={sec}><h3 style={hdr}>📝 ملاحظات</h3><textarea style={{...iS,minHeight:75,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="ملاحظات إضافية..."/></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{padding:"10px 24px",borderRadius:10,border:"1.5px solid #d1d5db",background:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>إلغاء</button>
            <button onClick={save} style={{padding:"10px 28px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${SA_DARK},${SA_GREEN})`,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:800}}>💾 حفظ</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TicketDetail = ({ticket,escalations,onClose,onAddEscalation}) => {
  const [escForm,setEscForm] = useState({date:todayStr(),escalatedTo:ESCALATION_TARGETS[0],notes:""});
  const [showEsc,setShowEsc] = useState(false);
  const mine = escalations.filter(e=>e.ticketId===ticket.id);
  const addEsc = () => { onAddEscalation({...escForm,id:Date.now(),ticketId:ticket.id,by:ticket.assignee}); setShowEsc(false); setEscForm({date:todayStr(),escalatedTo:ESCALATION_TARGETS[0],notes:""}); };
  const row = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #f1f5f9"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:680,maxHeight:"92vh",overflowY:"auto",direction:"rtl",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{background:`linear-gradient(135deg,${SA_DARK},${SA_GREEN})`,padding:"22px 28px",borderRadius:"20px 20px 0 0",color:"#fff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontSize:11,opacity:.7,marginBottom:4}}>{ticket.id}</div><h2 style={{fontSize:19,fontWeight:900,margin:0}}>{ticket.title}</h2><div style={{fontSize:12,opacity:.75,marginTop:4}}>المستفيد: {ticket.beneficiary} · {ticket.platform}</div></div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:17}}>✕</button>
          </div>
          <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
            <Badge color={STATUS_COLORS[ticket.status]} bg="rgba(255,255,255,.18)" label={STATUS_LABELS[ticket.status]}/>
            <Badge color={PRIORITY_COLORS[ticket.priority]} bg="rgba(255,255,255,.18)" label={PRIORITY_LABELS[ticket.priority]}/>
            <SLABadge status={calcSLAStatus(ticket)}/>
          </div>
        </div>
        <div style={{padding:26}}>
          <div style={{background:"#f8fafc",borderRadius:12,padding:18,marginBottom:14}}>
            <h3 style={{fontSize:13,fontWeight:800,color:SA_GREEN,marginTop:0,marginBottom:12}}>📋 تفاصيل البلاغ</h3>
            {[["الجهة",ticket.entity],["المسؤول",ticket.assignee],["المنصة",ticket.platform],["قناة المتابعة",ticket.followChannel],["تاريخ الإنشاء",formatDate(ticket.createdAt)],["تاريخ الرفع",formatDate(ticket.submittedAt)],["تاريخ الإغلاق",formatDate(ticket.closedAt)],["عدد التصعيدات",ticket.escalationCount]].map(([l,v])=>(
              <div key={l} style={row}><span style={{color:"#6b7280",fontSize:13}}>{l}</span><strong style={{fontSize:13}}>{v??'—'}</strong></div>
            ))}
            {ticket.transferredEntity&&<><div style={row}><span style={{color:"#b45309",fontSize:13}}>محوّل إلى</span><strong style={{fontSize:13,color:"#b45309"}}>{ticket.transferredEntity}</strong></div><div style={{...row,borderBottom:"none"}}><span style={{color:"#b45309",fontSize:13}}>تاريخ التحويل</span><strong style={{fontSize:13,color:"#b45309"}}>{formatDate(ticket.transferredAt)}</strong></div></>}
          </div>
          {ticket.notes&&<div style={{background:"#fffbeb",borderRadius:12,padding:16,marginBottom:14,border:"1.5px solid #fde68a"}}><h3 style={{fontSize:13,fontWeight:800,color:"#92400e",marginTop:0,marginBottom:8}}>📝 ملاحظات</h3><p style={{margin:0,color:"#374151",fontSize:13,lineHeight:1.8}}>{ticket.notes}</p></div>}
          <div style={{background:"#f8fafc",borderRadius:12,padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h3 style={{fontSize:13,fontWeight:800,color:SA_GREEN,margin:0}}>🔺 سجل التصعيدات ({mine.length})</h3>
              <button onClick={()=>setShowEsc(!showEsc)} style={{padding:"6px 14px",background:"#fee2e2",color:"#b91c1c",border:"1.5px solid #fca5a5",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:800}}>+ تصعيد جديد</button>
            </div>
            {showEsc&&<div style={{background:"#fff",borderRadius:10,padding:16,border:"1.5px solid #fca5a5",marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <Field label="تاريخ التصعيد"><input type="date" style={iS} value={escForm.date} onChange={e=>setEscForm(p=>({...p,date:e.target.value}))}/></Field>
                <Field label="إلى من؟"><select style={{...iS,cursor:"pointer"}} value={escForm.escalatedTo} onChange={e=>setEscForm(p=>({...p,escalatedTo:e.target.value}))}>{ESCALATION_TARGETS.map(t=><option key={t}>{t}</option>)}</select></Field>
                <div style={{gridColumn:"1/-1"}}><Field label="ملاحظات"><input style={iS} value={escForm.notes} onChange={e=>setEscForm(p=>({...p,notes:e.target.value}))} placeholder="سبب التصعيد..."/></Field></div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setShowEsc(false)} style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid #d1d5db",background:"#fff",cursor:"pointer",fontSize:12}}>إلغاء</button>
                <button onClick={addEsc} style={{padding:"7px 18px",borderRadius:8,border:"none",background:"#b91c1c",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:800}}>تسجيل</button>
              </div>
            </div>}
            {mine.length===0?<p style={{color:"#9ca3af",fontSize:13,textAlign:"center",padding:"14px 0"}}>لا توجد تصعيدات</p>:
            <div style={{display:"flex",flexDirection:"column",gap:10}}>{mine.map((e,i)=>(
              <div key={e.id} style={{background:"#fff",border:"1.5px solid #fca5a5",borderRadius:10,padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><strong style={{color:"#b91c1c",fontSize:13}}>تصعيد #{i+1}</strong><span style={{color:"#6b7280",fontSize:12}}>{formatDate(e.date)}</span></div>
                <p style={{margin:"4px 0",fontSize:13}}>إلى: <strong>{e.escalatedTo}</strong></p>
                {e.notes&&<p style={{margin:"4px 0",fontSize:12,color:"#6b7280"}}>{e.notes}</p>}
              </div>
            ))}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({tickets,escalations}) => {
  const total=tickets.length, open=tickets.filter(t=>!["closed","resolved"].includes(t.status)).length;
  const resolved=tickets.filter(t=>["closed","resolved"].includes(t.status)).length;
  const escalated=tickets.filter(t=>t.status==="escalated").length;
  const breached=tickets.filter(t=>calcSLAStatus(t)==="breached").length;
  const statusDist=Object.entries(STATUS_LABELS).map(([k,v])=>({label:v,count:tickets.filter(t=>t.status===k).length,color:STATUS_COLORS[k]})).filter(s=>s.count>0);
  const entityStats=ENTITIES.map(e=>({name:e,total:tickets.filter(t=>t.entity===e).length,open:tickets.filter(t=>t.entity===e&&!["closed","resolved"].includes(t.status)).length})).filter(e=>e.total>0).sort((a,b)=>b.open-a.open);
  const maxBar=Math.max(...entityStats.map(e=>e.total),1);
  const KPI=({icon,label,value,color})=><div style={{background:"#fff",borderRadius:14,padding:"18px 20px",boxShadow:"0 1px 6px rgba(0,0,0,.08)",borderTop:`4px solid ${color}`}}><div style={{fontSize:26}}>{icon}</div><div style={{fontSize:30,fontWeight:900,color:"#111",lineHeight:1}}>{value}</div><div style={{fontSize:13,color:"#6b7280",fontWeight:700}}>{label}</div></div>;
  return (
    <div style={{direction:"rtl"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:24}}>
        <KPI icon="📋" label="إجمالي البلاغات" value={total} color={SA_GREEN}/>
        <KPI icon="🔵" label="مفتوحة" value={open} color="#0369a1"/>
        <KPI icon="✅" label="مغلقة/معالجة" value={resolved} color="#15803d"/>
        <KPI icon="🔺" label="تم تصعيدها" value={escalated} color="#b91c1c"/>
        <KPI icon="⚠" label="تجاوزت SLA" value={breached} color="#b45309"/>
        <KPI icon="📌" label="إجمالي التصعيدات" value={escalations.length} color={SA_GOLD}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 6px rgba(0,0,0,.08)"}}>
          <h3 style={{fontSize:14,fontWeight:800,color:"#111",marginTop:0,marginBottom:18}}>توزيع الحالات</h3>
          {statusDist.map(s=><div key={s.label} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{fontWeight:700}}>{s.label}</span><span style={{fontWeight:900,color:s.color}}>{s.count}</span></div><div style={{background:"#f1f5f9",borderRadius:8,height:9,overflow:"hidden"}}><div style={{width:`${(s.count/total)*100}%`,height:"100%",background:s.color,borderRadius:8}}/></div></div>)}
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 6px rgba(0,0,0,.08)"}}>
          <h3 style={{fontSize:14,fontWeight:800,color:"#111",marginTop:0,marginBottom:18}}>البلاغات حسب الجهة</h3>
          {entityStats.map(e=><div key={e.name} style={{marginBottom:13}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{fontWeight:700}}>{e.name}</span><span style={{color:"#6b7280"}}>{e.open}/{e.total}</span></div><div style={{background:"#f1f5f9",borderRadius:8,height:9,position:"relative",overflow:"hidden"}}><div style={{width:`${(e.total/maxBar)*100}%`,height:"100%",background:"#d1d5db",borderRadius:8}}/><div style={{position:"absolute",top:0,right:0,width:`${(e.open/maxBar)*100}%`,height:"100%",background:SA_GREEN,borderRadius:8}}/></div></div>)}
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 6px rgba(0,0,0,.08)",gridColumn:"1/-1"}}>
          <h3 style={{fontSize:14,fontWeight:800,color:"#111",marginTop:0,marginBottom:14}}>⏰ تنبيهات SLA</h3>
          {tickets.filter(t=>["breached","warning"].includes(calcSLAStatus(t))).length===0?<p style={{color:"#15803d",fontWeight:700,textAlign:"center",padding:16,background:"#f0fdf4",borderRadius:10}}>✅ جميع البلاغات ضمن SLA</p>:
          tickets.filter(t=>["breached","warning"].includes(calcSLAStatus(t))).map(t=>{const s=calcSLAStatus(t);return(<div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:s==="breached"?"#fee2e2":"#fef3c7",borderRadius:10,border:`1.5px solid ${s==="breached"?"#fca5a5":"#fde68a"}`,marginBottom:8}}><div><strong style={{fontSize:13}}>{t.title}</strong><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{t.entity} · {t.assignee}</div></div><SLABadge status={s}/></div>);})}
        </div>
      </div>
    </div>
  );
};

const TicketsList = ({tickets,escalations,onEdit,onView,onDelete}) => {
  const [search,setSearch]=useState(""); const [fS,setFS]=useState("all"); const [fE,setFE]=useState("all"); const [sort,setSort]=useState("createdAt");
  const filtered=useMemo(()=>{let l=tickets.filter(t=>{if(fS!=="all"&&t.status!==fS)return false;if(fE!=="all"&&t.entity!==fE)return false;if(search&&!t.title.includes(search)&&!t.id.includes(search)&&!t.beneficiary.includes(search))return false;return true;});l.sort((a,b)=>{if(sort==="priority"){const o={critical:0,high:1,medium:2,low:3};return o[a.priority]-o[b.priority];}if(sort==="createdAt")return new Date(b.createdAt)-new Date(a.createdAt);return b.escalationCount-a.escalationCount;});return l;},[tickets,search,fS,fE,sort]);
  const sI={padding:"8px 12px",borderRadius:9,border:"1.5px solid #d1d5db",fontSize:12,fontFamily:"inherit",direction:"rtl",background:"#fafafa"};
  return(
    <div style={{direction:"rtl"}}>
      <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
        <input style={{...sI,flex:1,minWidth:180}} placeholder="🔍 بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={sI} value={fS} onChange={e=>setFS(e.target.value)}><option value="all">جميع الحالات</option>{Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <select style={sI} value={fE} onChange={e=>setFE(e.target.value)}><option value="all">جميع الجهات</option>{ENTITIES.map(e=><option key={e}>{e}</option>)}</select>
        <select style={sI} value={sort} onChange={e=>setSort(e.target.value)}><option value="createdAt">الأحدث</option><option value="priority">الأولوية</option><option value="escalations">التصعيدات</option></select>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(t=>{const sla=calcSLAStatus(t);return(
          <div key={t.id} style={{background:"#fff",borderRadius:13,padding:"14px 18px",boxShadow:"0 1px 5px rgba(0,0,0,.07)",borderRight:`4px solid ${PRIORITY_COLORS[t.priority]}`,display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:6}}>
                <span style={{fontSize:11,fontWeight:800,color:"#6b7280",background:"#f1f5f9",padding:"2px 8px",borderRadius:6}}>{t.id}</span>
                <Badge color={STATUS_COLORS[t.status]} bg={STATUS_BG[t.status]} label={STATUS_LABELS[t.status]}/>
                <Badge color={PRIORITY_COLORS[t.priority]} bg={`${PRIORITY_COLORS[t.priority]}18`} label={PRIORITY_LABELS[t.priority]}/>
                <SLABadge status={sla}/>
                {t.escalationCount>0&&<Badge color="#b91c1c" bg="#fee2e2" label={`🔺 ${t.escalationCount}`}/>}
              </div>
              <h4 style={{margin:0,fontSize:14,fontWeight:800,color:"#111",marginBottom:5}}>{t.title}</h4>
              <div style={{fontSize:12,color:"#6b7280",display:"flex",gap:12,flexWrap:"wrap"}}>
                <span>👤 {t.beneficiary}</span><span>🏢 {t.entity}</span><span>📲 {t.platform}</span><span>🧑‍💼 {t.assignee}</span><span>📅 {formatDate(t.createdAt)}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:7,flexShrink:0}}>
              <button onClick={()=>onView(t)} style={{padding:"6px 13px",background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>عرض</button>
              <button onClick={()=>onEdit(t)} style={{padding:"6px 13px",background:"#f0fdf4",color:"#15803d",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>تعديل</button>
              <button onClick={()=>{if(confirm("حذف البلاغ؟"))onDelete(t.id);}} style={{padding:"6px 13px",background:"#fee2e2",color:"#b91c1c",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>حذف</button>
            </div>
          </div>
        );})}
        {filtered.length===0&&<div style={{textAlign:"center",padding:48,color:"#9ca3af"}}><div style={{fontSize:44,marginBottom:10}}>📭</div><div style={{fontSize:15,fontWeight:700}}>لا توجد بلاغات</div></div>}
      </div>
    </div>
  );
};

const ReportsView = ({tickets}) => {
  const [filter,setFilter]=useState({status:"all",entity:"all",assignee:"all",from:"",to:""});
  const setF=(k,v)=>setFilter(p=>({...p,[k]:v}));
  const filtered=useMemo(()=>tickets.filter(t=>{if(filter.status!=="all"&&t.status!==filter.status)return false;if(filter.entity!=="all"&&t.entity!==filter.entity)return false;if(filter.assignee!=="all"&&t.assignee!==filter.assignee)return false;if(filter.from&&t.createdAt<filter.from)return false;if(filter.to&&t.createdAt>filter.to)return false;return true;}),[tickets,filter]);
  const sI={padding:"8px 12px",borderRadius:9,border:"1.5px solid #d1d5db",fontSize:12,fontFamily:"inherit",direction:"rtl",background:"#fafafa"};
  const exportCSV=()=>{const h=["رقم البلاغ","العنوان","المستفيد","المنصة","الجهة","المسؤول","الأولوية","الحالة","تاريخ الرفع","SLA","تصعيدات"];const rows=filtered.map(t=>[t.id,t.title,t.beneficiary,t.platform,t.entity,t.assignee,PRIORITY_LABELS[t.priority],STATUS_LABELS[t.status],t.submittedAt||"",calcSLAStatus(t),t.escalationCount]);const csv=[h,...rows].map(r=>r.join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));a.download="تقرير.csv";a.click();};
  return(
    <div style={{direction:"rtl"}}>
      <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:18,boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
        <h3 style={{fontSize:14,fontWeight:800,color:"#111",marginTop:0,marginBottom:14}}>🔍 تصفية</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
          <select style={sI} value={filter.status} onChange={e=>setF("status",e.target.value)}><option value="all">جميع الحالات</option>{Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
          <select style={sI} value={filter.entity} onChange={e=>setF("entity",e.target.value)}><option value="all">جميع الجهات</option>{ENTITIES.map(e=><option key={e}>{e}</option>)}</select>
          <select style={sI} value={filter.assignee} onChange={e=>setF("assignee",e.target.value)}><option value="all">جميع المسؤولين</option>{ASSIGNEES.map(a=><option key={a}>{a}</option>)}</select>
          <input type="date" style={sI} value={filter.from} onChange={e=>setF("from",e.target.value)}/>
          <input type="date" style={sI} value={filter.to} onChange={e=>setF("to",e.target.value)}/>
          <button onClick={()=>setFilter({status:"all",entity:"all",assignee:"all",from:"",to:""})} style={{...sI,cursor:"pointer"}}>↺ إعادة تعيين</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        {[["📋 إجمالي",filtered.length,SA_GREEN],["✅ مُنجز",filtered.filter(t=>["resolved","closed"].includes(t.status)).length,"#15803d"],["🔺 تصعيدات",filtered.reduce((s,t)=>s+t.escalationCount,0),"#b91c1c"],["⏰ تجاوز SLA",filtered.filter(t=>calcSLAStatus(t)==="breached").length,"#b45309"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",borderRadius:12,padding:16,textAlign:"center",boxShadow:"0 1px 5px rgba(0,0,0,.07)",borderTop:`3px solid ${c}`}}><div style={{fontSize:26,fontWeight:900,color:"#111"}}>{v}</div><div style={{fontSize:12,color:"#6b7280",marginTop:4}}>{l}</div></div>
        ))}
      </div>
      <div style={{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.07)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:"1px solid #f1f5f9"}}>
          <h3 style={{fontSize:14,fontWeight:800,color:"#111",margin:0}}>النتائج ({filtered.length})</h3>
          <button onClick={exportCSV} style={{padding:"8px 18px",background:SA_GREEN,color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:800}}>⬇ تصدير CSV</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f8fafc"}}>{["رقم البلاغ","العنوان","المستفيد","الجهة","المسؤول","الحالة","تاريخ الرفع","SLA","تصعيدات"].map(h=><th key={h} style={{padding:"11px 13px",textAlign:"right",fontWeight:800,color:"#6b7280",borderBottom:"1px solid #f1f5f9",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((t,i)=><tr key={t.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"9px 13px",fontWeight:800,color:"#0369a1",whiteSpace:"nowrap"}}>{t.id}</td>
              <td style={{padding:"9px 13px"}}>{t.title}</td>
              <td style={{padding:"9px 13px"}}>{t.beneficiary}</td>
              <td style={{padding:"9px 13px",whiteSpace:"nowrap"}}>{t.entity}</td>
              <td style={{padding:"9px 13px",whiteSpace:"nowrap"}}>{t.assignee}</td>
              <td style={{padding:"9px 13px"}}><Badge color={STATUS_COLORS[t.status]} bg={STATUS_BG[t.status]} label={STATUS_LABELS[t.status]}/></td>
              <td style={{padding:"9px 13px",whiteSpace:"nowrap",color:"#6b7280"}}>{formatDate(t.submittedAt)}</td>
              <td style={{padding:"9px 13px"}}><SLABadge status={calcSLAStatus(t)}/></td>
              <td style={{padding:"9px 13px",textAlign:"center",fontWeight:800,color:t.escalationCount>0?"#b91c1c":"#15803d"}}>{t.escalationCount}</td>
            </tr>)}</tbody>
          </table>
          {filtered.length===0&&<p style={{textAlign:"center",color:"#9ca3af",padding:32}}>لا توجد بيانات</p>}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [tickets,setTickets]=useState(INIT_TICKETS);
  const [escalations,setEscalations]=useState(INIT_ESCALATIONS);
  const [activeTab,setActiveTab]=useState("dashboard");
  const [showForm,setShowForm]=useState(false);
  const [editTicket,setEditTicket]=useState(null);
  const [viewTicket,setViewTicket]=useState(null);
  const saveTicket=(t)=>{setTickets(prev=>{const i=prev.findIndex(x=>x.id===t.id);if(i>=0){const n=[...prev];n[i]=t;return n;}return[t,...prev];});setShowForm(false);setEditTicket(null);};
  const deleteTicket=(id)=>setTickets(prev=>prev.filter(t=>t.id!==id));
  const addEscalation=(esc)=>{setEscalations(prev=>[...prev,esc]);setTickets(prev=>prev.map(t=>t.id===esc.ticketId?{...t,escalationCount:t.escalationCount+1,status:"escalated"}:t));setViewTicket(prev=>prev?{...prev,escalationCount:prev.escalationCount+1,status:"escalated"}:prev);};
  const alertCount=tickets.filter(t=>calcSLAStatus(t)==="breached").length;
  const TABS=[{id:"dashboard",icon:"📊",label:"لوحة التحكم"},{id:"tickets",icon:"📋",label:"البلاغات"},{id:"reports",icon:"📈",label:"التقارير"}];
  return(
    <div style={{minHeight:"100vh",background:SA_LIGHT,fontFamily:"'Segoe UI',Tahoma,sans-serif",direction:"rtl"}}>
      <header style={{background:`linear-gradient(135deg,${SA_DARK},${SA_GREEN})`,padding:"0 22px",display:"flex",alignItems:"center",gap:16,height:62,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,.25)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:SA_GOLD,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎛</div>
          <div style={{color:"#fff"}}><div style={{fontSize:15,fontWeight:900,lineHeight:1}}>متابعة البلاغات التقنية</div><div style={{fontSize:10,opacity:.65}}>Technical Ticket Management</div></div>
        </div>
        <nav style={{display:"flex",gap:3,marginRight:"auto"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"7px 16px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:800,background:activeTab===t.id?"rgba(255,255,255,.22)":"transparent",color:activeTab===t.id?"#fff":"rgba(255,255,255,.6)"}}>{t.icon} {t.label}</button>)}
        </nav>
        {alertCount>0&&<div style={{background:"#b91c1c",color:"#fff",padding:"5px 12px",borderRadius:9,fontSize:11,fontWeight:800}}>⚠ {alertCount} تجاوز SLA</div>}
        <button onClick={()=>{setEditTicket(null);setShowForm(true);}} style={{padding:"9px 18px",background:SA_GOLD,color:SA_DARK,border:"none",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:900,whiteSpace:"nowrap"}}>＋ بلاغ جديد</button>
      </header>
      <main style={{maxWidth:1200,margin:"0 auto",padding:"22px 14px"}}>
        {activeTab==="dashboard"&&<DashboardView tickets={tickets} escalations={escalations}/>}
        {activeTab==="tickets"&&<TicketsList tickets={tickets} escalations={escalations} onEdit={t=>{setEditTicket(t);setShowForm(true);}} onView={t=>setViewTicket(t)} onDelete={deleteTicket}/>}
        {activeTab==="reports"&&<ReportsView tickets={tickets} escalations={escalations}/>}
      </main>
      {showForm&&<TicketForm ticket={editTicket} onSave={saveTicket} onClose={()=>{setShowForm(false);setEditTicket(null);}}/>}
      {viewTicket&&<TicketDetail ticket={viewTicket} escalations={escalations} onClose={()=>setViewTicket(null)} onAddEscalation={addEscalation}/>}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}`}</style>
    </div>
  );
}
