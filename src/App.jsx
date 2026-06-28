import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, TrendingUp, AlertTriangle, Briefcase, Building2, Store, Users, Euro, Clock } from "lucide-react";

const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const MINIJOB_GRENZE = 603;

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtEUR(n) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }
function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, "0")}`; }
function hoursBetween(from, to) {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let mins = (th * 60 + tm) - (fh * 60 + fm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

// --- localStorage helpers (synchron, funktioniert im normalen Browser) ---
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function persist(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

export default function Dashboard() {
  // Hauptarbeit (Festanstellung)
  const [mainSalary, setMainSalary] = useState(() => load("v4_mainSalary", 0));
  const [mainWeeklyHours, setMainWeeklyHours] = useState(() => load("v4_mainWeeklyHours", 38));
  // Minijob
  const [minijobRate, setMinijobRate] = useState(() => load("v4_minijobRate", 13));
  const [minijobEntries, setMinijobEntries] = useState(() => load("v4_minijobEntries", []));
  // Kleingewerbe (Klienten)
  const [clients, setClients] = useState(() => load("v4_clients", []));
  const [bizHours, setBizHours] = useState(() => load("v4_bizHours", {}));

  const [view, setView] = useState("haupt");
  const [now] = useState(new Date());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear, setSelYear] = useState(now.getFullYear());

  useEffect(() => persist("v4_mainSalary", mainSalary), [mainSalary]);
  useEffect(() => persist("v4_mainWeeklyHours", mainWeeklyHours), [mainWeeklyHours]);
  useEffect(() => persist("v4_minijobRate", minijobRate), [minijobRate]);
  useEffect(() => persist("v4_minijobEntries", minijobEntries), [minijobEntries]);
  useEffect(() => persist("v4_clients", clients), [clients]);
  useEffect(() => persist("v4_bizHours", bizHours), [bizHours]);

  const mk = monthKey(selYear, selMonth);

  // Hauptarbeit
  const mainMonthlyHours = Number(mainWeeklyHours || 0) * 4.33;
  const mainRate = mainMonthlyHours > 0 ? Number(mainSalary || 0) / mainMonthlyHours : 0;

  // Minijob
  const mini = useMemo(() => {
    const list = minijobEntries.filter(e => e.date.slice(0,7) === mk);
    const hours = list.reduce((s,e) => s + hoursBetween(e.from, e.to), 0);
    const pay = hours * Number(minijobRate || 0);
    return { list, hours, pay, over: pay > MINIJOB_GRENZE, near: pay > MINIJOB_GRENZE*0.85 && pay <= MINIJOB_GRENZE };
  }, [minijobEntries, minijobRate, mk]);

  // Kleingewerbe
  const bizTotal = clients.reduce((s,c) => s + Number(c.rate || 0), 0);
  const clientCount = clients.length;
  const bHours = Number(bizHours[mk] || 0);
  const bizRate = bHours > 0 ? bizTotal / bHours : 0;

  const grandPay = Number(mainSalary||0) + mini.pay + bizTotal;
  const grandHours = mainMonthlyHours + mini.hours + bHours;

  const history = useMemo(() => {
    const out = [];
    for (let i = 5; i >= 0; i--) {
      let m = selMonth - i, y = selYear;
      while (m < 0) { m += 12; y -= 1; }
      const k = monthKey(y, m);
      const mjPay = minijobEntries.filter(e=>e.date.slice(0,7)===k).reduce((s,e)=>s+hoursBetween(e.from,e.to),0) * Number(minijobRate||0);
      out.push({ key:k, label: MONTHS_DE[m].slice(0,3), total: Number(mainSalary||0) + mjPay + bizTotal });
    }
    return out;
  }, [mainSalary, minijobEntries, minijobRate, bizTotal, selMonth, selYear]);
  const maxHist = Math.max(1, ...history.map(h => h.total));

  // mutators
  const addME = () => setMinijobEntries([...minijobEntries, { id:uid(), date:new Date().toISOString().slice(0,10), from:"09:00", to:"13:00" }]);
  const updME = (id,p) => setMinijobEntries(minijobEntries.map(e=>e.id===id?{...e,...p}:e));
  const delME = (id) => setMinijobEntries(minijobEntries.filter(e=>e.id!==id));
  const addClient = () => setClients([...clients, { id: uid(), name: "", rate: 0 }]);
  const updClient = (id, p) => setClients(clients.map(c => c.id===id ? {...c,...p} : c));
  const delClient = (id) => setClients(clients.filter(c=>c.id!==id));
  const setBHours = (val) => setBizHours({ ...bizHours, [mk]: val });

  return (
    <div style={S.app}>
      <style>{CSS}</style>

      <header style={S.header}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, flexWrap:"wrap" }}>
          <span className="display" style={S.logo}>Ledger</span>
          <span style={S.tagline}>Hauptjob · Minijob · Kleingewerbe</span>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <select value={selMonth} onChange={e=>setSelMonth(+e.target.value)} style={S.select}>
            {MONTHS_DE.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e=>setSelYear(+e.target.value)} style={S.select}>
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      <nav style={S.tabs}>
        {[
          {id:"haupt", label:"Hauptarbeit", icon:Building2},
          {id:"minijob", label:"Minijob", icon:Briefcase},
          {id:"gewerbe", label:"Kleingewerbe", icon:Store},
          {id:"analyse", label:"Auswertung", icon:TrendingUp},
        ].map(t => {
          const Icon = t.icon, active = view===t.id;
          return (
            <button key={t.id} onClick={()=>setView(t.id)} style={{...S.tab, ...(active?S.tabActive:{})}}>
              <Icon size={15}/> <span className="tablabel">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <main style={S.main}>

        {view === "haupt" && (
          <>
            <SectionHint text="Deine Festanstellung: festes Monatsgehalt, unabhängig von Klienten." />
            <div style={S.card}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Festgehalt / Monat (€)">
                  <input type="number" step="50" placeholder="z.B. 2500" value={mainSalary||""} onChange={e=>setMainSalary(+e.target.value)} style={S.input}/>
                </Field>
                <Field label="Stunden / Woche">
                  <input type="number" step="1" value={mainWeeklyHours||""} onChange={e=>setMainWeeklyHours(+e.target.value)} style={S.input}/>
                </Field>
              </div>
              <div style={S.calcBox}>
                <span className="num" style={{ color:"#7d8a78", fontSize:13 }}>≈ {mainMonthlyHours.toFixed(0)} h/Monat</span>
                <span className="num" style={{ color:"#8fae7a", fontSize:18, fontWeight:600 }}>{mainRate>0?`${mainRate.toFixed(2)} €/h`:"–"}</span>
              </div>
              <div style={{ fontSize:11.5, color:"#5a6356", marginTop:8 }}>Monatsstunden grob aus Wochenstunden × 4,33 geschätzt.</div>
            </div>
          </>
        )}

        {view === "minijob" && (
          <>
            <SectionHint text="Stundenbasierter Nebenjob. Trage einzelne Arbeitstage mit Uhrzeit ein." />
            <div style={S.card}>
              <Field label="Stundenlohn (€)">
                <input type="number" value={minijobRate} step="0.5" onChange={e=>setMinijobRate(+e.target.value)} style={S.input}/>
              </Field>
              <div className="num" style={{ marginTop:12, fontSize:14, color: mini.over?"#e07a5f":"#6f9bd1" }}>
                {MONTHS_DE[selMonth]}: {mini.hours.toFixed(2)} h · {fmtEUR(mini.pay)} / {fmtEUR(MINIJOB_GRENZE)}
              </div>
              <div style={S.barTrack}>
                <div style={{ ...S.barFill, width:`${Math.min(100,(mini.pay/MINIJOB_GRENZE)*100)}%`, background: mini.over?"#e07a5f":"#6f9bd1" }}/>
              </div>
              {(mini.over||mini.near) && (
                <div style={{ ...S.warn, ...(mini.over?S.warnRed:S.warnYellow), marginTop:12 }}>
                  <AlertTriangle size={16} color={mini.over?"#e07a5f":"#d4b95c"} style={{flexShrink:0}}/>
                  <span>{mini.over ? `Grenze überschritten: ${fmtEUR(mini.pay)} über ${fmtEUR(MINIJOB_GRENZE)}.` : `Nähert sich der Grenze: ${fmtEUR(mini.pay)} von ${fmtEUR(MINIJOB_GRENZE)}.`}</span>
                </div>
              )}
            </div>
            <SubHead text={`Arbeitstage · ${MONTHS_DE[selMonth]}`} />
            {mini.list.length===0 && <div style={{ color:"#7d8a78", fontSize:13, padding:"8px 0 12px" }}>Noch keine Tage eingetragen.</div>}
            {mini.list.map(e => <TimeRow key={e.id} e={e} upd={updME} del={delME} />)}
            <button onClick={addME} style={S.btnAdd}><Plus size={14}/> Arbeitstag eintragen</button>
          </>
        )}

        {view === "gewerbe" && (
          <>
            <SectionHint text="Deine Klientenarbeit. Bezahlung pro Klient pro Monat." />
            <div style={S.statStrip}>
              <Stat icon={Users} label="Klienten" value={`${clientCount}`} accent="#8fae7a" />
              <Stat icon={Euro} label="Einnahmen / Monat" value={fmtEUR(bizTotal)} accent="#e8a23a" />
              <Stat icon={Clock} label="Stunden" value={`${bHours.toFixed(1)} h`} accent="#cfd6c8" />
              <Stat icon={TrendingUp} label="Stundenlohn" value={bizRate>0?`${bizRate.toFixed(2)} €/h`:"–"} accent="#6f9bd1" />
            </div>

            <div style={S.tableWrap}>
              <div style={{...S.trow, ...S.thead}}>
                <span style={S.colName}>Klient</span>
                <span style={S.colRate}>€ / Monat</span>
                <span style={S.colDel}></span>
              </div>
              {clients.length===0 && <div style={{ padding:"20px 14px", color:"#7d8a78", fontSize:13.5, textAlign:"center" }}>Noch keine Klienten. Füge deinen ersten hinzu.</div>}
              {clients.map(c => (
                <div key={c.id} style={S.trow}>
                  <input placeholder="Name" value={c.name} onChange={e=>updClient(c.id,{name:e.target.value})} style={{...S.cellInput, ...S.colName}}/>
                  <input type="number" placeholder="0" value={c.rate||""} onChange={e=>updClient(c.id,{rate:+e.target.value})} style={{...S.cellInput, ...S.colRate, textAlign:"right"}} className="num"/>
                  <button onClick={()=>delClient(c.id)} style={{...S.btnGhost, ...S.colDel}}><Trash2 size={15}/></button>
                </div>
              ))}
              <div style={{...S.trow, ...S.tfoot}}>
                <span style={{...S.colName, fontWeight:600}}>Summe</span>
                <span className="num" style={{...S.colRate, textAlign:"right", color:"#e8a23a", fontWeight:600}}>{fmtEUR(bizTotal)}</span>
                <span style={S.colDel}></span>
              </div>
            </div>
            <button onClick={addClient} style={S.btnPrimary}><Plus size={16}/> Klient hinzufügen</button>

            <div style={{ ...S.card, marginTop:18 }}>
              <Field label={`Gearbeitete Stunden im ${MONTHS_DE[selMonth]}`}>
                <input type="number" step="0.5" placeholder="z.B. 50" value={bizHours[mk] ?? ""} onChange={e=>setBHours(e.target.value===""?"":+e.target.value)} style={S.input}/>
              </Field>
              <div style={S.calcBox}>
                <span className="num" style={{ color:"#7d8a78", fontSize:13 }}>{fmtEUR(bizTotal)} ÷ {bHours.toFixed(1)} h</span>
                <span className="num" style={{ color:"#6f9bd1", fontSize:18, fontWeight:600 }}>{bizRate>0?`${bizRate.toFixed(2)} €/h`:"–"}</span>
              </div>
            </div>
          </>
        )}

        {view === "analyse" && (
          <>
            <div style={S.grid2}>
              <Card label="Gesamt diesen Monat" value={fmtEUR(grandPay)} accent="#e8a23a" />
              <Card label="Stunden gesamt" value={`${grandHours.toFixed(1)} h`} accent="#cfd6c8" />
            </div>
            <div style={{ height:12 }}/>
            <AnalysisRow name="Hauptarbeit" hours={mainMonthlyHours} pay={Number(mainSalary||0)} accent="#8fae7a" />
            <AnalysisRow name="Minijob" hours={mini.hours} pay={mini.pay} accent="#6f9bd1" />
            <AnalysisRow name="Kleingewerbe" hours={bHours} pay={bizTotal} accent="#d4a05c" />
            <div style={{ ...S.analysisRow, borderTop:"1px solid #2c342b", marginTop:6, paddingTop:14 }}>
              <div style={{ fontWeight:600 }}>Gesamt</div>
              <div style={{ display:"flex", gap:16, alignItems:"baseline" }}>
                <span className="num" style={{ color:"#7d8a78", fontSize:13 }}>{grandHours.toFixed(1)} h</span>
                <span className="num" style={{ color:"#e8a23a", fontWeight:600 }}>{fmtEUR(grandPay)}</span>
                <span className="num" style={{ color:"#cfd6c8", fontSize:13, minWidth:74, textAlign:"right" }}>{grandHours>0?`${(grandPay/grandHours).toFixed(2)} €/h`:"–"}</span>
              </div>
            </div>

            <div className="display" style={{ fontSize:15, fontWeight:700, margin:"24px 0 12px", color:"#cfd6c8" }}>Verlauf · letzte 6 Monate</div>
            <div style={S.chart}>
              {history.map(h => (
                <div key={h.key} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <div className="num" style={{ fontSize:10, color:"#7d8a78" }}>{h.total>0?Math.round(h.total):""}</div>
                  <div style={{ width:"68%", borderRadius:"4px 4px 0 0", background:h.key===mk?"#e8a23a":"#3a4339", height:Math.max(4,(h.total/maxHist)*84) }}/>
                  <div style={{ fontSize:11, color:"#7d8a78" }}>{h.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11.5, color:"#5a6356", marginTop:10 }}>Hinweis: Stunden der Hauptarbeit sind eine grobe Schätzung aus den Wochenstunden.</div>
          </>
        )}
      </main>
      <footer style={S.footer}>Daten werden lokal in deinem Browser gespeichert.</footer>
    </div>
  );
}

function Stat({ icon:Icon, label, value, accent }) {
  return (
    <div style={S.stat}>
      <Icon size={16} color={accent} style={{ marginBottom:6 }}/>
      <div style={{ fontSize:11, color:"#7d8a78", marginBottom:3 }}>{label}</div>
      <div className="num" style={{ fontSize:16, fontWeight:600, color:accent }}>{value}</div>
    </div>
  );
}

function TimeRow({ e, upd, del }) {
  return (
    <div style={S.timeRow}>
      <input type="date" value={e.date} onChange={ev=>upd(e.id,{date:ev.target.value})} style={{...S.input, flex:"1 1 130px"}}/>
      <div style={S.timePair}>
        <input type="time" value={e.from} onChange={ev=>upd(e.id,{from:ev.target.value})} style={S.inputTime}/>
        <span style={{ color:"#7d8a78" }}>–</span>
        <input type="time" value={e.to} onChange={ev=>upd(e.id,{to:ev.target.value})} style={S.inputTime}/>
      </div>
      <span className="num" style={S.hChip}>{hoursBetween(e.from,e.to).toFixed(2)}h</span>
      <button onClick={()=>del(e.id)} style={S.btnGhost}><Trash2 size={13}/></button>
    </div>
  );
}

function AnalysisRow({ name, hours, pay, accent }) {
  return (
    <div style={S.analysisRow}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:8, height:8, borderRadius:2, background:accent, display:"inline-block" }}/>{name}
      </div>
      <div style={{ display:"flex", gap:16, alignItems:"baseline" }}>
        <span className="num" style={{ color:"#7d8a78", fontSize:13 }}>{hours.toFixed(1)} h</span>
        <span className="num" style={{ color:accent, fontSize:14 }}>{fmtEUR(pay)}</span>
        <span className="num" style={{ color:"#cfd6c8", fontSize:13, minWidth:74, textAlign:"right" }}>{hours>0?`${(pay/hours).toFixed(2)} €/h`:"–"}</span>
      </div>
    </div>
  );
}

const Card = ({ label, value, accent }) => (
  <div style={S.card}>
    <div style={S.cardLabel}>{label}</div>
    <div className="num" style={{ fontSize:22, fontWeight:600, color:accent }}>{value}</div>
  </div>
);
const Field = ({ label, children }) => (<div><div style={{ fontSize:11, color:"#7d8a78", marginBottom:4 }}>{label}</div>{children}</div>);
const SubHead = ({ text }) => <div style={{ fontSize:12, color:"#7d8a78", margin:"6px 0", textTransform:"uppercase", letterSpacing:0.5 }}>{text}</div>;
const SectionHint = ({ text }) => <div style={{ fontSize:12.5, color:"#7d8a78", marginBottom:14, lineHeight:1.5 }}>{text}</div>;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
.num { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.display { font-family: 'Fraunces', serif; }
input, select { font-family: inherit; }
input:focus, select:focus { outline: 2px solid #e8a23a; outline-offset: -1px; }
::-webkit-scrollbar { height:6px; width:6px; }
::-webkit-scrollbar-thumb { background:#3a4339; border-radius:4px; }
@media (max-width: 480px) { .tablabel { display:none; } }
`;

const S = {
  app: { minHeight:"100vh", background:"#0f1410", color:"#e8e3d8", fontFamily:"'IBM Plex Sans', ui-sans-serif, system-ui" },
  header: { padding:"26px 20px 16px", borderBottom:"1px solid #232a23", maxWidth:760, margin:"0 auto" },
  logo: { fontSize:28, fontWeight:700, color:"#e8a23a" },
  tagline: { fontSize:12.5, color:"#7d8a78", letterSpacing:0.3 },
  select: { background:"#1a201a", color:"#e8e3d8", border:"1px solid #2c342b", borderRadius:8, padding:"8px 10px", fontSize:14 },
  tabs: { display:"flex", gap:2, padding:"12px 14px 0", borderBottom:"1px solid #232a23", maxWidth:760, margin:"0 auto", overflowX:"auto" },
  tab: { display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", color:"#7d8a78", padding:"10px 12px", fontSize:14, fontWeight:500, cursor:"pointer", borderBottom:"2px solid transparent", marginBottom:-1, whiteSpace:"nowrap" },
  tabActive: { color:"#e8a23a", borderBottom:"2px solid #e8a23a" },
  main: { padding:"20px", maxWidth:760, margin:"0 auto" },
  statStrip: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:18 },
  stat: { background:"#161c15", border:"1px solid #232a23", borderRadius:12, padding:"12px 10px", display:"flex", flexDirection:"column" },
  tableWrap: { background:"#161c15", border:"1px solid #232a23", borderRadius:12, overflow:"hidden", marginBottom:14 },
  trow: { display:"flex", alignItems:"center", gap:8, padding:"6px 12px", borderBottom:"1px solid #1d231c" },
  thead: { background:"#12170f", padding:"9px 12px" },
  tfoot: { background:"#12170f", borderBottom:"none" },
  colName: { flex:"1 1 auto", fontSize:13, color:"#7d8a78" },
  colRate: { flex:"0 0 110px", fontSize:13, color:"#7d8a78", textAlign:"right" },
  colDel: { flex:"0 0 30px", display:"flex", justifyContent:"center" },
  cellInput: { background:"transparent", border:"none", color:"#e8e3d8", fontSize:14, padding:"8px 4px", minWidth:0 },
  card: { background:"#161c15", border:"1px solid #232a23", borderRadius:12, padding:16, marginBottom:14 },
  cardLabel: { fontSize:11.5, color:"#7d8a78", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 },
  calcBox: { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, padding:"12px 14px", background:"#12170f", borderRadius:10, border:"1px solid #232a23" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  input: { width:"100%", background:"#1a201a", border:"1px solid #2c342b", borderRadius:8, padding:"10px 10px", color:"#e8e3d8", fontSize:14, minWidth:0 },
  inputTime: { background:"#1a201a", border:"1px solid #2c342b", borderRadius:8, padding:"8px 6px", color:"#e8e3d8", fontSize:13.5, width:"auto" },
  timeRow: { display:"flex", gap:6, marginBottom:6, alignItems:"center", flexWrap:"wrap" },
  timePair: { display:"flex", gap:5, alignItems:"center", flex:"1 1 auto" },
  hChip: { fontSize:12, color:"#8fae7a", background:"#1a201a", border:"1px solid #2c342b", borderRadius:6, padding:"4px 7px", whiteSpace:"nowrap" },
  btnGhost: { background:"transparent", border:"none", color:"#7d8a78", cursor:"pointer", padding:6 },
  btnAdd: { display:"flex", alignItems:"center", gap:6, background:"#1a201a", border:"1px dashed #3a4339", borderRadius:8, padding:"9px 12px", color:"#cfd6c8", fontSize:13, cursor:"pointer", width:"100%", justifyContent:"center", marginTop:4 },
  btnPrimary: { display:"flex", alignItems:"center", gap:6, background:"#e8a23a", border:"none", borderRadius:10, padding:"13px 16px", color:"#1a1208", fontSize:14, fontWeight:600, cursor:"pointer", width:"100%", justifyContent:"center" },
  barTrack: { height:6, background:"#232a23", borderRadius:4, marginTop:8, overflow:"hidden" },
  barFill: { height:"100%" },
  warn: { display:"flex", gap:10, alignItems:"flex-start", padding:12, borderRadius:10, fontSize:13 },
  warnRed: { background:"#3a1f1f", border:"1px solid #5c2d2d" },
  warnYellow: { background:"#3a341f", border:"1px solid #5c5429" },
  analysisRow: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:"1px solid #1d231c", fontSize:14, gap:8, flexWrap:"wrap" },
  chart: { display:"flex", alignItems:"flex-end", gap:10, height:120, padding:"0 4px 4px", borderBottom:"1px solid #232a23" },
  footer: { textAlign:"center", padding:"20px", fontSize:11.5, color:"#5a6356", maxWidth:760, margin:"0 auto" },
};
