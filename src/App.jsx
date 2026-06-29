import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, TrendingUp, AlertTriangle, Briefcase, Building2, Store, Users, Euro, Clock, LogOut, ChevronLeft, Receipt, Wallet } from "lucide-react";
import { supabase } from "./supabaseClient.js";

const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const WEEKDAYS_DE = ["So","Mo","Di","Mi","Do","Fr","Sa"];
const MINIJOB_GRENZE = 603;

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtEUR(n) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0); }
function monthKey(y, m) { return `${y}-${String(m + 1).padStart(2, "0")}`; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function parseNum(v){ if(typeof v==="number") return v; const n=parseFloat(String(v).replace(",", ".")); return isNaN(n)?0:n; }
function numForEdit(n){ if(n===0||n==null||n==="") return ""; return String(n).replace(".", ","); }
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

// Dezimal-Eingabe, die auch Komma akzeptiert (z.B. 15,5)
function MoneyInput({ value, onCommit, style, placeholder, ...rest }) {
  const [buf, setBuf] = useState(() => numForEdit(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setBuf(numForEdit(value)); }, [value]);
  return (
    <input
      type="text" inputMode="decimal" placeholder={placeholder} style={style} value={buf}
      onFocus={() => { focused.current = true; }}
      onChange={e => {
        const v = e.target.value;
        if (/^[0-9]*[.,]?[0-9]*$/.test(v)) { setBuf(v); onCommit(parseNum(v)); }
      }}
      onBlur={() => { focused.current = false; setBuf(numForEdit(value)); }}
      {...rest}
    />
  );
}

// ====================== AUTH-GATE ======================
export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authReady) return <div style={S.loading}><style>{CSS}</style>Lade…</div>;
  if (!session) return <AuthScreen />;
  return <Dashboard session={session} />;
}

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(""); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        setMsg("Konto erstellt. Du kannst dich jetzt anmelden.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
    } catch (e) { setMsg(e.message || "Es ist ein Fehler aufgetreten."); }
    finally { setBusy(false); }
  }

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 380, margin: "0 auto", padding: "60px 20px" }}>
        <div className="display" style={{ ...S.logo, fontSize: 32, marginBottom: 6 }}>Ledger</div>
        <div style={{ color: "#7d8a78", fontSize: 13, marginBottom: 28 }}>
          {mode === "signin" ? "Melde dich an, um auf deine Daten zuzugreifen." : "Erstelle ein Konto für deine Daten."}
        </div>
        <div style={S.card}>
          <Field label="E-Mail"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={S.input} autoComplete="email"/></Field>
          <div style={{ height: 10 }}/>
          <Field label="Passwort"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} style={S.input} autoComplete={mode==="signup"?"new-password":"current-password"}/></Field>
          <button onClick={submit} disabled={busy} style={{ ...S.btnPrimary, marginTop: 16, opacity: busy?0.6:1 }}>
            {busy ? "Bitte warten…" : (mode === "signin" ? "Anmelden" : "Konto erstellen")}
          </button>
          {msg && <div style={{ marginTop: 12, fontSize: 12.5, color: "#d4b95c" }}>{msg}</div>}
        </div>
        <button onClick={()=>{ setMode(mode==="signin"?"signup":"signin"); setMsg(""); }}
          style={{ background:"none", border:"none", color:"#6f9bd1", fontSize:13, cursor:"pointer", marginTop:14, padding:0 }}>
          {mode === "signin" ? "Noch kein Konto? Jetzt erstellen" : "Schon ein Konto? Anmelden"}
        </button>
      </div>
    </div>
  );
}

// ====================== DASHBOARD ======================
function Dashboard({ session }) {
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mainSalary, setMainSalary] = useState(0);
  const [mainWeeklyHours, setMainWeeklyHours] = useState(38);
  const [minijobRate, setMinijobRate] = useState(13);
  const [minijobEntries, setMinijobEntries] = useState([]);
  const [bizPeriods, setBizPeriods] = useState([]);
  const [bizEntries, setBizEntries] = useState([]);
  const [expenses, setExpenses] = useState([]); // {id,date,desc,qty,price}

  const [view, setView] = useState("home");
  const [now] = useState(new Date());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selYear, setSelYear] = useState(now.getFullYear());

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from("user_state").select("data").eq("user_id", session.user.id).maybeSingle();
      if (active && !error && data && data.data) {
        const d = data.data;
        if (d.mainSalary != null) setMainSalary(d.mainSalary);
        if (d.mainWeeklyHours != null) setMainWeeklyHours(d.mainWeeklyHours);
        if (d.minijobRate != null) setMinijobRate(d.minijobRate);
        if (Array.isArray(d.minijobEntries)) setMinijobEntries(d.minijobEntries);
        if (Array.isArray(d.bizPeriods)) setBizPeriods(d.bizPeriods);
        if (Array.isArray(d.bizEntries)) setBizEntries(d.bizEntries);
        if (Array.isArray(d.expenses)) setExpenses(d.expenses);
      }
      if (active) setHydrated(true);
    })();
    return () => { active = false; };
  }, [session.user.id]);

  const saveTimer = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    const payload = { mainSalary, mainWeeklyHours, minijobRate, minijobEntries, bizPeriods, bizEntries, expenses };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("user_state").upsert({ user_id: session.user.id, data: payload, updated_at: new Date().toISOString() });
      setSaving(false);
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hydrated, mainSalary, mainWeeklyHours, minijobRate, minijobEntries, bizPeriods, bizEntries, expenses, session.user.id]);

  const mk = monthKey(selYear, selMonth);
  const isCurrentMonth = selYear === now.getFullYear() && selMonth === now.getMonth();
  const newEntryDate = () => isCurrentMonth ? todayStr() : `${mk}-01`;

  const mainMonthlyHours = Number(mainWeeklyHours || 0) * 4.33;
  const mainRate = mainMonthlyHours > 0 ? Number(mainSalary || 0) / mainMonthlyHours : 0;

  const mini = useMemo(() => {
    const list = minijobEntries.filter(e => e.date.slice(0,7) === mk).sort((a,b)=>b.date.localeCompare(a.date));
    const hours = list.reduce((s,e) => s + hoursBetween(e.from, e.to), 0);
    const pay = hours * Number(minijobRate || 0);
    return { list, hours, pay, over: pay > MINIJOB_GRENZE, near: pay > MINIJOB_GRENZE*0.85 && pay <= MINIJOB_GRENZE };
  }, [minijobEntries, minijobRate, mk]);

  const biz = useMemo(() => {
    const periodsInMonth = bizPeriods.map(p => {
      const { days, dim } = overlapDaysInMonth(p.from, p.to, selYear, selMonth);
      const amount = Number(p.count||0) * Number(p.price||0) * (dim>0 ? days/dim : 0);
      return { ...p, days, dim, amount };
    });
    const income = periodsInMonth.reduce((s,p) => s + p.amount, 0);
    const ref = isCurrentMonth ? todayStr() : `${mk}-${String(daysInMonth(selYear,selMonth)).padStart(2,"0")}`;
    const activeP = bizPeriods.find(p => dateInRange(ref, p.from, p.to));
    const currentCount = activeP ? Number(activeP.count||0) : 0;
    const list = bizEntries.filter(e => e.date.slice(0,7) === mk).sort((a,b)=>b.date.localeCompare(a.date));
    const hours = list.reduce((s,e) => s + hoursBetween(e.from, e.to), 0);
    const avgRate = hours > 0 ? income / hours : 0;
    return { periodsInMonth, income, currentCount, list, hours, avgRate };
  }, [bizPeriods, bizEntries, selYear, selMonth, mk, isCurrentMonth]);

  const exp = useMemo(() => {
    const list = expenses.filter(e => e.date.slice(0,7) === mk).sort((a,b)=>b.date.localeCompare(a.date));
    const total = list.reduce((s,e) => s + Number(e.qty||0) * Number(e.price||0), 0);
    return { list, total };
  }, [expenses, mk]);

  const grandPay = Number(mainSalary||0) + mini.pay + biz.income;
  const grandHours = mainMonthlyHours + mini.hours + biz.hours;
  const net = grandPay - exp.total;

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
  const addME = () => setMinijobEntries([{ id:uid(), date:newEntryDate(), from:"09:00", to:"13:00" }, ...minijobEntries]);
  const updME = (id,p) => setMinijobEntries(minijobEntries.map(e=>e.id===id?{...e,...p}:e));
  const delME = (id) => setMinijobEntries(minijobEntries.filter(e=>e.id!==id));
  const addBE = () => setBizEntries([{ id:uid(), date:newEntryDate(), from:"09:00", to:"11:00" }, ...bizEntries]);
  const updBE = (id,p) => setBizEntries(bizEntries.map(e=>e.id===id?{...e,...p}:e));
  const delBE = (id) => setBizEntries(bizEntries.filter(e=>e.id!==id));
  const addPeriod = () => {
    const dim = daysInMonth(selYear, selMonth);
    setBizPeriods([{ id:uid(), from:`${mk}-01`, to:`${mk}-${String(dim).padStart(2,"0")}`, count:0, price:0 }, ...bizPeriods]);
  };
  const updPeriod = (id,p) => setBizPeriods(bizPeriods.map(x=>x.id===id?{...x,...p}:x));
  const delPeriod = (id) => setBizPeriods(bizPeriods.filter(x=>x.id!==id));
  const addExp = () => setExpenses([{ id:uid(), date:newEntryDate(), desc:"", qty:1, price:0 }, ...expenses]);
  const updExp = (id,p) => setExpenses(expenses.map(e=>e.id===id?{...e,...p}:e));
  const delExp = (id) => setExpenses(expenses.filter(e=>e.id!==id));

  if (!hydrated) return <div style={S.loading}><style>{CSS}</style>Lade deine Daten…</div>;

  const TILES = [
    { id:"haupt", label:"Hauptarbeit", icon:Building2, accent:"#8fae7a", value:fmtEUR(Number(mainSalary||0)), sub:"Festgehalt" },
    { id:"minijob", label:"Minijob", icon:Briefcase, accent:"#6f9bd1", value:fmtEUR(mini.pay), sub:`${mini.hours.toFixed(1)} h` },
    { id:"gewerbe", label:"Kleingewerbe", icon:Store, accent:"#e8a23a", value:fmtEUR(biz.income), sub:`${biz.currentCount} Klienten` },
    { id:"ausgaben", label:"Ausgaben", icon:Receipt, accent:"#e07a5f", value:fmtEUR(exp.total), sub:`${exp.list.length} Posten` },
    { id:"analyse", label:"Auswertung", icon:TrendingUp, accent:"#d4a05c", value:fmtEUR(net), sub:"übrig" },
  ];

  return (
    <div style={S.app}>
      <style>{CSS}</style>

      <header style={S.header}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, flexWrap:"wrap" }}>
          <span className="display" style={S.logo}>Ledger</span>
          <span style={S.tagline}>Einnahmen & Ausgaben</span>
          <button onClick={()=>supabase.auth.signOut()} style={S.signout} title="Abmelden"><LogOut size={13}/> Abmelden</button>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:16, alignItems:"center" }}>
          <select value={selMonth} onChange={e=>setSelMonth(+e.target.value)} style={S.select}>
            {MONTHS_DE.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e=>setSelYear(+e.target.value)} style={S.select}>
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ color:"#5a6356", marginLeft:"auto", fontSize:11 }}>{saving?"speichert…":"gespeichert"}</span>
        </div>
      </header>

      <main style={S.main}>

        {view === "home" && (
          <>
            <div style={S.netCard}>
              <div>
                <div style={{ fontSize:11.5, color:"#7d8a78", textTransform:"uppercase", letterSpacing:0.5 }}>Übrig im {MONTHS_DE[selMonth]}</div>
                <div className="num" style={{ fontSize:30, fontWeight:700, color: net>=0?"#8fae7a":"#e07a5f", marginTop:4 }}>{fmtEUR(net)}</div>
              </div>
              <div style={{ textAlign:"right", fontSize:12 }}>
                <div className="num" style={{ color:"#e8a23a" }}>+ {fmtEUR(grandPay)}</div>
                <div className="num" style={{ color:"#e07a5f", marginTop:3 }}>− {fmtEUR(exp.total)}</div>
              </div>
            </div>

            <div style={S.tileGrid}>
              {TILES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={()=>setView(t.id)} style={{...S.tile, borderColor:t.accent+"33"}}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ ...S.tileIcon, background:t.accent+"22" }}><Icon size={18} color={t.accent}/></span>
                    </div>
                    <div style={{ marginTop:14 }}>
                      <div style={{ fontSize:14, color:"#e8e3d8", fontWeight:600 }}>{t.label}</div>
                      <div className="num" style={{ fontSize:18, fontWeight:600, color:t.accent, marginTop:4 }}>{t.value}</div>
                      <div style={{ fontSize:11.5, color:"#7d8a78", marginTop:2 }}>{t.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view !== "home" && (
          <button onClick={()=>setView("home")} style={S.back}><ChevronLeft size={16}/> Übersicht</button>
        )}

        {view === "haupt" && (
          <>
            <SectionTitle icon={Building2} text="Hauptarbeit" accent="#8fae7a" />
            <SectionHint text="Deine Festanstellung: festes Monatsgehalt, unabhängig vom Gewerbe." />
            <div style={S.statStrip}>
              <Stat icon={Euro} label="Gehalt / Monat" value={fmtEUR(Number(mainSalary||0))} accent="#e8a23a" />
              <Stat icon={Clock} label="Stunden / Monat" value={`${mainMonthlyHours.toFixed(0)} h`} accent="#cfd6c8" />
              <Stat icon={TrendingUp} label="Stundenlohn" value={mainRate>0?`${mainRate.toFixed(2)} €/h`:"–"} accent="#8fae7a" />
            </div>
            <div style={S.card}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Festgehalt / Monat (€)"><MoneyInput value={mainSalary} onCommit={setMainSalary} placeholder="z.B. 2500" style={S.input}/></Field>
                <Field label="Stunden / Woche"><MoneyInput value={mainWeeklyHours} onCommit={setMainWeeklyHours} placeholder="z.B. 38" style={S.input}/></Field>
              </div>
              <div style={{ fontSize:11.5, color:"#5a6356", marginTop:10 }}>Monatsstunden grob aus Wochenstunden × 4,33 geschätzt.</div>
            </div>
          </>
        )}

        {view === "minijob" && (
          <>
            <SectionTitle icon={Briefcase} text="Minijob" accent="#6f9bd1" />
            <SectionHint text="Stundenbasierter Nebenjob. Trage einzelne Arbeitstage mit Uhrzeit ein." />
            <div style={S.statStrip}>
              <Stat icon={Euro} label="Verdienst" value={fmtEUR(mini.pay)} accent="#e8a23a" />
              <Stat icon={Clock} label="Stunden" value={`${mini.hours.toFixed(1)} h`} accent="#cfd6c8" />
              <Stat icon={TrendingUp} label="Stundenlohn" value={`${Number(minijobRate||0).toFixed(2)} €/h`} accent="#6f9bd1" />
            </div>
            <div style={S.card}>
              <Field label="Stundenlohn (€) – auch Komma möglich, z.B. 15,5">
                <MoneyInput value={minijobRate} onCommit={setMinijobRate} placeholder="z.B. 15,5" style={S.input}/>
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
            <SectionTitle icon={Store} text="Kleingewerbe" accent="#e8a23a" />
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
                  <Field label="Anzahl Klienten"><input type="number" inputMode="numeric" min="0" step="1" placeholder="z.B. 30" value={p.count||""} onChange={e=>updPeriod(p.id,{count:parseNum(e.target.value)})} style={S.input}/></Field>
                  <Field label="Preis / Klient (€)"><MoneyInput value={p.price} onCommit={v=>updPeriod(p.id,{price:v})} placeholder="z.B. 140" style={S.input}/></Field>
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

        {view === "ausgaben" && (
          <>
            <SectionTitle icon={Receipt} text="Ausgaben" accent="#e07a5f" />
            <SectionHint text="Monatliche Ausgaben. Pro Posten Menge × Einzelpreis – für normale Ausgaben Menge 1, für z.B. Bügelwäsche die Anzahl eintragen." />
            <div style={S.statStrip}>
              <Stat icon={Receipt} label="Ausgaben" value={fmtEUR(exp.total)} accent="#e07a5f" />
              <Stat icon={Wallet} label="Posten" value={`${exp.list.length}`} accent="#cfd6c8" />
              <Stat icon={TrendingUp} label="Übrig" value={fmtEUR(net)} accent={net>=0?"#8fae7a":"#e07a5f"} />
            </div>

            <SubHead text={`Posten · ${MONTHS_DE[selMonth]}`} />
            {exp.list.length===0 && <Empty text="Noch keine Ausgaben eingetragen." />}
            {exp.list.map(e => (
              <div key={e.id} style={S.card}>
                <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <input placeholder="Beschreibung (z.B. Bügelwäsche, Miete)" value={e.desc} onChange={ev=>updExp(e.id,{desc:ev.target.value})} style={{...S.input, flex:1}}/>
                  <button onClick={()=>delExp(e.id)} style={S.btnGhost}><Trash2 size={15}/></button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr 1fr", gap:8 }}>
                  <Field label="Datum"><input type="date" value={e.date} onChange={ev=>updExp(e.id,{date:ev.target.value})} style={S.input}/></Field>
                  <Field label="Menge"><input type="number" inputMode="decimal" min="0" step="1" placeholder="1" value={e.qty??""} onChange={ev=>updExp(e.id,{qty:parseNum(ev.target.value)})} style={S.input}/></Field>
                  <Field label="Einzelpreis (€)"><MoneyInput value={e.price} onCommit={v=>updExp(e.id,{price:v})} placeholder="z.B. 5" style={S.input}/></Field>
                </div>
                <div style={S.periodFoot}>
                  <span className="num" style={{ color:"#7d8a78", fontSize:12.5 }}>{Number(e.qty||0)} × {fmtEUR(Number(e.price||0))}</span>
                  <span className="num" style={{ color:"#e07a5f", fontSize:14, fontWeight:600 }}>{fmtEUR(Number(e.qty||0)*Number(e.price||0))}</span>
                </div>
              </div>
            ))}
            <button onClick={addExp} style={S.btnPrimary}><Plus size={16}/> Ausgabe hinzufügen</button>

            <div style={{ ...S.card, marginTop:18 }}>
              <div style={S.cardLabel}>Summe Ausgaben · {MONTHS_DE[selMonth]}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <span className="num" style={{ color:"#7d8a78", fontSize:13 }}>{exp.list.length} Posten</span>
                <span className="num" style={{ color:"#e07a5f", fontSize:22, fontWeight:600 }}>{fmtEUR(exp.total)}</span>
              </div>
            </div>
          </>
        )}

        {view === "analyse" && (
          <>
            <SectionTitle icon={TrendingUp} text="Auswertung" accent="#d4a05c" />
            <div style={S.grid2}>
              <Card label="Einnahmen" value={fmtEUR(grandPay)} accent="#e8a23a" />
              <Card label="Ausgaben" value={fmtEUR(exp.total)} accent="#e07a5f" />
            </div>
            <div style={{ ...S.netCard, marginTop:12, marginBottom:14 }}>
              <div style={{ fontSize:11.5, color:"#7d8a78", textTransform:"uppercase", letterSpacing:0.5 }}>Übrig (Einnahmen − Ausgaben)</div>
              <div className="num" style={{ fontSize:24, fontWeight:700, color: net>=0?"#8fae7a":"#e07a5f" }}>{fmtEUR(net)}</div>
            </div>
            <AnalysisRow name="Hauptarbeit" hours={mainMonthlyHours} pay={Number(mainSalary||0)} accent="#8fae7a" />
            <AnalysisRow name="Minijob" hours={mini.hours} pay={mini.pay} accent="#6f9bd1" />
            <AnalysisRow name="Kleingewerbe" hours={biz.hours} pay={biz.income} accent="#d4a05c" />
            <div style={{ ...S.analysisRow, borderTop:"1px solid #2c342b", marginTop:6, paddingTop:14 }}>
              <div style={{ fontWeight:600 }}>Einnahmen gesamt</div>
              <div style={{ display:"flex", gap:16, alignItems:"baseline" }}>
                <span className="num" style={{ color:"#7d8a78", fontSize:13 }}>{grandHours.toFixed(1)} h</span>
                <span className="num" style={{ color:"#e8a23a", fontWeight:600 }}>{fmtEUR(grandPay)}</span>
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
      <footer style={S.footer}>Angemeldet als {session.user.email} · Daten online gespeichert & auf allen Geräten synchron.</footer>
    </div>
  );
}

function SectionTitle({ icon:Icon, text, accent }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
      <span style={{ ...S.tileIcon, width:30, height:30, background:accent+"22" }}><Icon size={16} color={accent}/></span>
      <span className="display" style={{ fontSize:20, fontWeight:700, color:"#e8e3d8" }}>{text}</span>
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
  <div style={S.card}><div style={S.cardLabel}>{label}</div><div className="num" style={{ fontSize:22, fontWeight:600, color:accent }}>{value}</div></div>
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
`;

const S = {
  loading: { minHeight:"100vh", background:"#0f1410", color:"#e8e3d8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans', ui-sans-serif" },
  app: { minHeight:"100vh", background:"#0f1410", color:"#e8e3d8", fontFamily:"'IBM Plex Sans', ui-sans-serif, system-ui" },
  header: { padding:"26px 20px 16px", borderBottom:"1px solid #232a23", maxWidth:760, margin:"0 auto" },
  logo: { fontSize:28, fontWeight:700, color:"#e8a23a" },
  tagline: { fontSize:12.5, color:"#7d8a78", letterSpacing:0.3 },
  signout: { marginLeft:"auto", display:"flex", alignItems:"center", gap:5, background:"transparent", border:"1px solid #2c342b", color:"#7d8a78", borderRadius:8, padding:"6px 10px", fontSize:12, cursor:"pointer" },
  select: { background:"#1a201a", color:"#e8e3d8", border:"1px solid #2c342b", borderRadius:8, padding:"8px 10px", fontSize:14 },
  main: { padding:"20px", maxWidth:760, margin:"0 auto" },

  netCard: { display:"flex", justifyContent:"space-between", alignItems:"center", background:"linear-gradient(135deg,#161c15,#12170f)", border:"1px solid #232a23", borderRadius:16, padding:"18px 20px", marginBottom:16 },
  tileGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  tile: { textAlign:"left", background:"#161c15", border:"1px solid #232a23", borderRadius:16, padding:16, cursor:"pointer", color:"#e8e3d8" },
  tileIcon: { width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" },

  back: { display:"flex", alignItems:"center", gap:4, background:"transparent", border:"none", color:"#7d8a78", fontSize:13.5, cursor:"pointer", padding:"0 0 14px 0" },

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
