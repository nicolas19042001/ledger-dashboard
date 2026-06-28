import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, TrendingUp, AlertTriangle, Briefcase, Building2, Store, Users, Euro, Clock } from "lucide-react";

const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WEEKDAYS_DE = ["So","Mo","Di","Mi","Do","Fr","Sa"];
const MINIJOB_GRENZE = 603;

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtEUR(n) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }
function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, "0")}`; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function hoursBetween(from, to) {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let mins = (th * 60 + tm) - (fh * 60 + fm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}
function weekdayOf(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return WEEKDAYS_DE[d.getDay()] || "";
}
// Overlap (in Tagen) eines Datumsbereichs mit dem gewählten Monat
function overlapDaysInMonth(from, to, y, m) {
  const dim = daysInMonth(y, m);
  if (!from || !to) return { days: 0, dim };
  const mStart = new Date(y, m, 1).getTime();
  const mEnd = new Date(y, m, dim).getTime();
  const s0 = new Date(from + "T00:00:00").getTime();
  const e0 = new Date(to + "T00:00:00").getTime();
  const s = Math.max(s0, mStart);
  const e = Math.min(e0, mEnd);
  if (s > e) return { days: 0, dim };
  const days = Math.floor((e - s) / 86400000) + 1;
  return { days, dim };
}
function dateInRange(ref, from, to) {
  if (!from || !to) return false;
  return from <= ref && ref <= to;
}

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw != null ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function persist(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

export default function Dashboard() {
  // Hauptarbeit
  const [mainSalary, setMainSalary] = useState(() => load("v5_mainSalary", 0));
  const [mainWeeklyHours, setMainWeeklyHours] = useState(() => load("v5_mainWeeklyHours", 38));
  // Minijob
  const [minijobRate, setMinijobRate] = useState(() => load("v5_minijobRate", 13));
  const [minijobEntries, setMinijobEntries] = useState(() => load("v5_minijobEntries", []));
  // Kleingewerbe
  const [bizPeriods, setBizPeriods] = useState(() => load("v6_bizPeriods", [])); // {id,from,to,count,price}
  const [bizEntries, setBizEntries] = useState(() => load("v5_bizEntries", []));   // {id,date,from,to}

  const [view, setView] = useState("haupt");
  const [now] = useState(new Date());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear, setSelYear] = useState(now.getFullYear());

  useEffect(() => persist("v5_mainSalary", mainSalary), [mainSalary]);
  useEffect(() => persist("v5_mainWeeklyHours", mainWeeklyHours), [mainWeeklyHours]);
  useEffect(() => persist("v5_minijobRate", minijobRate), [minijobRate]);
  useEffect(() => persist("v5_minijobEntries", minijobEntries), [minijobEntries]);
  useEffect(() => persist("v6_bizPeriods", bizPeriods), [bizPeriods]);
  useEffect(() => persist("v5_bizEntries", bizEntries), [bizEntries]);

  const mk = monthKey(selYear, selMonth);

  // Hauptarbeit
  const mainMonthlyHours = Number(mainWeeklyHours || 0) * 4.33;
  const mainRate = mainMonthlyHours > 0 ? Number(mainSalary || 0) / mainMonthlyHours : 0;

  // Minijob
  const mini = useMemo(() => {
    const list = minijobEntries.filter(e => e.date.slice(0,7) === mk).sort((a,b)=>b.date.localeCompare(a.date));
    const hours = list.reduce((s,e) => s + hoursBetween(e.from, e.to), 0);
    const pay = hours * Number(minijobRate || 0);
    return { list, hours, pay, over: pay > MINIJOB_GRENZE, near: pay > MINIJOB_GRENZE*0.85 && pay <= MINIJOB_GRENZE };
  }, [minijobEntries, minijobRate, mk]);

  // Kleingewerbe
  const biz = useMemo(() => {
    // Zeiträume, die in den gewählten Monat fallen, mit anteiligem Betrag
    const periodsInMonth = bizPeriods.map(p => {
      const { days, dim } = overlapDaysInMonth(p.from, p.to, selYear, selMonth);
      const amount = Number(p.count||0) * Number(p.price||0) * (dim>0 ? days/dim : 0);
      return { ...p, days, dim, amount };
    });
    const income = periodsInMonth.reduce((s,p) => s + p.amount, 0);

    // "Aktuelle" Klienten: Zeitraum, der das Referenzdatum enthält
    const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth();
    const ref = isCurrentMonth ? todayStr() : `${mk}-${String(daysInMonth(selYear,selMonth)).padStart(2,"0")}`;
    const activeP = bizPeriods.find(p => dateInRange(ref, p.from, p.to));
    const currentCount = activeP ? Number(activeP.count||0) : 0;

    const list = bizEntries.filter(e => e.date.slice(0,7) === mk).sort((a,b)=>b.date.localeCompare(a.date));
    const hours = list.reduce((s,e) => s + hoursBetween(e.from, e.to), 0);
    const avgRate = hours > 0 ? income / hours : 0;

    return { periodsInMonth, income, currentCount, list, hours, avgRate };
  }, [bizPeriods, bizEntries, selYear, selMonth, mk, now]);

  const grandPay = Number(mainSalary||0) + mini.pay + biz.income;
  const grandHours = mainMonthlyHours + mini.hours + biz.hours;

  const history = useMemo(() => {
    const out = [];
    for (let i = 5; i >= 0; i--) {
      let m = selMonth - i, y = selYear;
      while (m < 0) { m += 12; y -= 1; }
      const k = monthKey(y, m);
      const mjPay = minijobEntries.filter(e=>e.date.slice(0,7)===k).reduce((s,e)=>s+hoursBetween(e.from,e.to),0) * Number(minijobRate||0);
      const bPay = bizPeriods.reduce((s,p) => {
        const { days, dim } = overlapDaysInMonth(p.from, p.to, y, m);
        return s + Number(p.count||0) * Number(p.price||0) * (dim>0 ? days/dim : 0);
      }, 0);
      out.push({ key:k, label: MONTHS_DE[m].slice(0,3), total: Number(mainSalary||0) + mjPay + bPay });
    }
    return out;
  }, [mainSalary, minijobEntries, minijobRate, bizPeriods, selMonth, selYear]);
  const maxHist = Math.max(1, ...history.map(h => h.total));

  // mutators
  const addME = () => setMinijobEntries([{ id:uid(), date:todayStr(), from:"09:00", to:"13:00" }, ...minijobEntries]);
  const updME = (id,p) => setMinijobEntries(minijobEntries.map(e=>e.id===id?{...e,...p}:e));
  const delME = (id) => setMinijobEntries(minijobEntries.filter(e=>e.id!==id));
  const addBE = () => setBizEntries([{ id:uid(), date:todayStr(), from:"09:00", to:"11:00" }, ...bizEntries]);
  const updBE = (id,p) => setBizEntries(bizEntries.map(e=>e.id===id?{...e,...p}:e));
  const delBE = (id) => setBizEntries(bizEntries.filter(e=>e.id!==id));
  const addPeriod = () => {
    const dim = daysInMonth(selYear, selMonth);
    setBizPeriods([{ id:uid(), from:`${mk}-01`, to:`${mk}-${String(dim).padStart(2,"0")}`, count:0, price:0 }, ...bizPeriods]);
  };
  const updPeriod = (id,p) => setBizPeriods(bizPeriods.map(x=>x.id===id?{...x,...p}:x));
  const delPeriod = (id) => setBizPeriods(bizPeriods.filter(x=>x.id!==id));

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
        <div style={S.headerSummary}>
          <span className="num">{fmtEUR(grandPay)}</span>
          <span style={{ color:"#5a6356" }}>·</span>
          <span className="num" style={{ color:"#7d8a78" }}>{grandHours.toFixed(1)} h</span>
          <span style={{ color:"#5a6356" }}>·</span>
          <span className="num" style={{ color:"#7d8a78" }}>{grandHours>0?`${(grandPay/grandHours).toFixed(2)} €/h`:"–"}</span>
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
            <SectionHint text="Deine Festanstellung: festes Monatsgehalt, unabhängig vom Gewerbe." />
            <div style={S.statStrip}>
              <Stat icon={Euro} label="Gehalt / Monat" value={fmtEUR(Number(mainSalary||0))} accent="#e8a23a" />
              <Stat icon={Clock} label="Stunden / Monat" value={`${mainMonthlyHours.toFixed(0)} h`} accent="#cfd6c8" />
              <Stat icon={TrendingUp} label="Stundenlohn" value={mainRate>0?`${mainRate.toFixed(2)} €/h`:"–"} accent="#8fae7a" />
            </div>
            <div style={S.card}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Festgehalt / Monat (€)">
                  <input type="number" step="50" placeholder="z.B. 2500" value={mainSalary||""} onChange={e=>setMainSalary(+e.target.value)} style={S.input}/>
                </Field>
                <Field label="Stunden / Woche">
                  <input type="number" step="1" value={mainWeeklyHours||""} onChange={e=>setMainWeeklyHours(+e.target.value)} style={S.input}/>
                </Field>
              </div>
              <div style={{ fontSize:11.5, color:"#5a6356", marginTop:10 }}>Monatsstunden grob aus Wochenstunden × 4,33 geschätzt.</div>
            </div>
          </>
        )}

        {view === "minijob" && (
          <>
            <SectionHint text="Stundenbasierter Nebenjob. Trage einzelne Arbeitstage mit Uhrzeit ein." />
            <div style={S.statStrip}>
              <Stat icon={Euro} label="Verdienst" value={fmtEUR(mini.pay)} accent="#e8a23a" />
              <Stat icon={Clock} label="Stunden" value={`${mini.hours.toFixed(1)} h`} accent="#cfd6c8" />
              <Stat icon={TrendingUp} label="Stundenlohn" value={`${Number(minijobRate||0).toFixed(2)} €/h`} accent="#6f9bd1" />
            </div>
            <div style={S.card}>
              <Field label="Stundenlohn (€)">
                <input type="number" value={minijobRate} step="0.5" onChange={e=>setMinijobRate(+e.target.value)} style={S.input}/>
              </Field>
              <div className="num" style={{ marginTop:12, fontSize:13.5, color: mini.over?"#e07a5f":"#6f9bd1" }}>
                {fmtEUR(mini.pay)} von {fmtEUR(MINIJOB_GRENZE)} Minijob-Grenze
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
            {mini.list.length===0 && <Empty text="Noch keine Tage eingetragen." />}
            {mini.list.map(e => <TimeRow key={e.id} e={e} upd={updME} del={delME} />)}
            <button onClick={addME} style={S.btnAdd}><Plus size={14}/> Arbeitstag eintragen</button>
          </>
        )}

        {view === "gewerbe" && (
          <>
            <SectionHint text="Klienten als Zeiträume erfassen – ändert sich die Anzahl im Monat, lege einfach mehrere Zeiträume an. Beträge werden anteilig nach Tagen berechnet." />
            <div style={S.statStrip}>
              <Stat icon={Users} label="Aktuelle Klienten" value={`${biz.currentCount}`} accent="#8fae7a" />
              <Stat icon={Euro} label="Einnahmen" value={fmtEUR(biz.income)} accent="#e8a23a" />
              <Stat icon={Clock} label="Stunden" value={`${biz.hours.toFixed(1)} h`} accent="#cfd6c8" />
              <Stat icon={TrendingUp} label="Ø Stundenlohn" value={biz.avgRate>0?`${biz.avgRate.toFixed(2)} €/h`:"–"} accent="#6f9bd1" />
            </div>

            <SubHead text="Klienten-Zeiträume" />
            {biz.periodsInMonth.length===0 && <Empty text="Noch keine Zeiträume. Lege deinen ersten an." />}
            {biz.periodsInMonth.map(p => (
              <div key={p.id} style={S.card}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <Field label="Von"><input type="date" value={p.from} onChange={e=>updPeriod(p.id,{from:e.target.value})} style={S.input}/></Field>
                  <Field label="Bis"><input type="date" value={p.to} onChange={e=>updPeriod(p.id,{to:e.target.value})} style={S.input}/></Field>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8, alignItems:"end" }}>
                  <Field label="Anzahl Klienten"><input type="number" min="0" step="1" placeholder="z.B. 30" value={p.count||""} onChange={e=>updPeriod(p.id,{count:+e.target.value})} style={S.input}/></Field>
                  <Field label="Preis / Klient (€)"><input type="number" min="0" step="10" placeholder="z.B. 140" value={p.price||""} onChange={e=>updPeriod(p.id,{price:+e.target.value})} style={S.input}/></Field>
                  <button onClick={()=>delPeriod(p.id)} style={{...S.btnGhost, paddingBottom:10}}><Trash2 size={16}/></button>
                </div>
                <div style={S.periodFoot}>
                  <span className="num" style={{ color:"#7d8a78", fontSize:12.5 }}>
                    {p.days} {p.days===1?"Tag":"Tage"} im {MONTHS_DE[selMonth]} · {p.count||0} × {fmtEUR(Number(p.price||0))} anteilig
                  </span>
                  <span className="num" style={{ color:"#8fae7a", fontSize:14, fontWeight:600 }}>{fmtEUR(p.amount)}</span>
                </div>
              </div>
            ))}
            <button onClick={addPeriod} style={S.btnPrimary}><Plus size={16}/> Zeitraum hinzufügen</button>

            <div style={{ ...S.card, marginTop:18 }}>
              <div style={S.cardLabel}>Einnahmen · {MONTHS_DE[selMonth]}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <span className="num" style={{ color:"#7d8a78", fontSize:13 }}>Summe aller Zeiträume</span>
                <span className="num" style={{ color:"#e8a23a", fontSize:22, fontWeight:600 }}>{fmtEUR(biz.income)}</span>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardLabel}>Durchschnitts-Stundenlohn · {MONTHS_DE[selMonth]}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <span className="num" style={{ color:"#7d8a78", fontSize:13 }}>{fmtEUR(biz.income)} ÷ {biz.hours.toFixed(2)} h</span>
                <span className="num" style={{ color:"#6f9bd1", fontSize:22, fontWeight:600 }}>{biz.avgRate>0?`${biz.avgRate.toFixed(2)} €/h`:"–"}</span>
              </div>
              <div style={{ fontSize:11.5, color:"#5a6356", marginTop:8 }}>Aktualisiert sich automatisch mit jedem eingetragenen Arbeitstag.</div>
            </div>

            <SubHead text={`Arbeitstage · ${MONTHS_DE[selMonth]}`} />
            {biz.list.length===0 && <Empty text="Noch keine Stunden eingetragen." />}
            {biz.list.map(e => <TimeRow key={e.id} e={e} upd={updBE} del={delBE} />)}
            <button onClick={addBE} style={S.btnAdd}><Plus size={14}/> Arbeitstag eintragen</button>
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
            <AnalysisRow name="Kleingewerbe" hours={biz.hours} pay={biz.income} accent="#d4a05c" />
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
  const wd = weekdayOf(e.date);
  const h = hoursBetween(e.from, e.to);
  return (
    <div style={S.timeCard}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flex:"1 1 150px" }}>
          <span style={S.wdBadge}>{wd||"–"}</span>
          <input type="date" value={e.date} onChange={ev=>upd(e.id,{date:ev.target.value})} style={{...S.input, padding:"7px 8px"}}/>
        </div>
        <div style={S.timePair}>
          <input type="time" value={e.from} onChange={ev=>upd(e.id,{from:ev.target.value})} style={S.inputTime}/>
          <span style={{ color:"#7d8a78" }}>–</span>
          <input type="time" value={e.to} onChange={ev=>upd(e.id,{to:ev.target.value})} style={S.inputTime}/>
        </div>
        <span className="num" style={S.hChip}>{h.toFixed(2)} h</span>
        <button onClick={()=>del(e.id)} style={S.btnGhost}><Trash2 size={14}/></button>
      </div>
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
const SubHead = ({ text }) => <div style={{ fontSize:12, color:"#7d8a78", margin:"6px 0 10px", textTransform:"uppercase", letterSpacing:0.5 }}>{text}</div>;
const SectionHint = ({ text }) => <div style={{ fontSize:12.5, color:"#7d8a78", marginBottom:14, lineHeight:1.5 }}>{text}</div>;
const Empty = ({ text }) => <div style={{ color:"#7d8a78", fontSize:13, padding:"6px 0 12px" }}>{text}</div>;

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
  headerSummary: { display:"flex", gap:10, alignItems:"center", marginTop:14, fontSize:14, color:"#e8a23a", flexWrap:"wrap" },
  select: { background:"#1a201a", color:"#e8e3d8", border:"1px solid #2c342b", borderRadius:8, padding:"8px 10px", fontSize:14 },
  tabs: { display:"flex", gap:2, padding:"12px 14px 0", borderBottom:"1px solid #232a23", maxWidth:760, margin:"0 auto", overflowX:"auto" },
  tab: { display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", color:"#7d8a78", padding:"10px 12px", fontSize:14, fontWeight:500, cursor:"pointer", borderBottom:"2px solid transparent", marginBottom:-1, whiteSpace:"nowrap" },
  tabActive: { color:"#e8a23a", borderBottom:"2px solid #e8a23a" },
  main: { padding:"20px", maxWidth:760, margin:"0 auto" },
  statStrip: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(0, 1fr))", gap:8, marginBottom:16 },
  stat: { background:"#161c15", border:"1px solid #232a23", borderRadius:12, padding:"12px 10px", display:"flex", flexDirection:"column" },
  card: { background:"#161c15", border:"1px solid #232a23", borderRadius:12, padding:16, marginBottom:14 },
  cardLabel: { fontSize:11.5, color:"#7d8a78", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 },
  periodFoot: { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, paddingTop:10, borderTop:"1px solid #1d231c", gap:8, flexWrap:"wrap" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  input: { width:"100%", background:"#1a201a", border:"1px solid #2c342b", borderRadius:8, padding:"10px 10px", color:"#e8e3d8", fontSize:14, minWidth:0 },
  inputTime: { background:"#1a201a", border:"1px solid #2c342b", borderRadius:8, padding:"8px 6px", color:"#e8e3d8", fontSize:13.5, width:"auto" },
  timeCard: { background:"#161c15", border:"1px solid #232a23", borderRadius:10, padding:"10px 12px", marginBottom:8 },
  timePair: { display:"flex", gap:5, alignItems:"center" },
  wdBadge: { fontSize:12, fontWeight:600, color:"#8fae7a", background:"#12170f", border:"1px solid #2c342b", borderRadius:6, padding:"6px 8px", minWidth:34, textAlign:"center" },
  hChip: { fontSize:12, color:"#8fae7a", background:"#1a201a", border:"1px solid #2c342b", borderRadius:6, padding:"5px 8px", whiteSpace:"nowrap" },
  btnGhost: { background:"transparent", border:"none", color:"#7d8a78", cursor:"pointer", padding:6 },
  btnAdd: { display:"flex", alignItems:"center", gap:6, background:"#1a201a", border:"1px dashed #3a4339", borderRadius:8, padding:"10px 12px", color:"#cfd6c8", fontSize:13, cursor:"pointer", width:"100%", justifyContent:"center", marginTop:4 },
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
