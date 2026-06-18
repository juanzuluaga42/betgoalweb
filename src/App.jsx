import React, { useState, useEffect, useRef } from "react";
import {
  Home, ClipboardList, MessageCircle, Sparkles, Trophy,
  Plus, Camera, X, Settings, Flame, TrendingUp,
  Loader2, RefreshCw, Wallet, Send, Target, Clock,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ─── Estilos ────────────────────────────────────────────────────────────── */
const S = `

*,*::before,*::after{box-sizing:border-box} body{margin:0;background:#080C14}
.bg-ink{background:#080C14} .bg-surface{background:#0D1520}
.bg-surface-2{background:#122030} .bg-surface-3{background:#182A40}
.border-line{border-color:#1A3354}
.text-ink{color:#080C14} .text-primary{color:#DFF0FF} .text-muted{color:#4A7292}
.text-ng{color:#00FF87} .bg-ng{background:#00FF87}
.text-nb{color:#00C8FF} .bg-nb{background:#00C8FF}
.text-nr{color:#FF3D6E} .bg-nr{background:#FF3D6E}
.text-gold{color:#FFD166}
.font-display{font-family:'Space Grotesk',sans-serif}
.font-body{font-family:'Inter',sans-serif}
.font-mono{font-family:'IBM Plex Mono',monospace}
.glow-g{box-shadow:0 0 18px rgba(0,255,135,.25)}
.glow-b{box-shadow:0 0 18px rgba(0,200,255,.2)}
.glow-ring{box-shadow:0 0 36px rgba(0,255,135,.12)}
.tg-g{text-shadow:0 0 14px rgba(0,255,135,.55)}
.tg-b{text-shadow:0 0 14px rgba(0,200,255,.55)}
.scrollbar-none::-webkit-scrollbar{display:none} .scrollbar-none{scrollbar-width:none}
.snap-x-cards{scroll-snap-type:x mandatory} .snap-card{scroll-snap-align:center}
.text-2xs{font-size:10px} .sheet-max{max-height:88vh}
.brand{background:linear-gradient(90deg,#00FF87,#00C8FF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.chat-u{background:#122030;border:1px solid #1A3354;border-radius:18px 18px 4px 18px}
.chat-g{background:#0D1E2E;border:1px solid #00C8FF33;border-radius:18px 18px 18px 4px}
.nav-glass{background:rgba(8,12,20,.93);backdrop-filter:blur(14px);border-top:1px solid #1A3354}
.btn-pri{background:linear-gradient(135deg,#00FF87,#00C8FF);color:#080C14;font-family:'Space Grotesk',sans-serif;font-weight:700;border-radius:16px;padding:14px;border:none;cursor:pointer;transition:opacity .15s,transform .1s;width:100%}
.btn-pri:active{transform:scale(.97);opacity:.9} .btn-pri:disabled{background:#182A40;color:#4A7292;cursor:default}
.plan-card{background:linear-gradient(135deg,#0D1E2E,#122030);border:1px solid #00FF8733;border-radius:20px}
input,select{color:#DFF0FF;font-family:'Inter',sans-serif} select option{background:#0D1520}
`;

/* ─── Storage ────────────────────────────────────────────────────────────── */
const store = {
  async get(k) {
    try { if(window.storage){const r=await window.storage.get(k);return r;} } catch{}
    try { const v=localStorage.getItem(k);return v?{value:v}:null; } catch{}
    return null;
  },
  async set(k,v) {
    try { if(window.storage){await window.storage.set(k,v);return;} } catch{}
    try { localStorage.setItem(k,v); } catch{}
  },
};

const KEY = "betgoal_v4";
const SPORTS = ["Fútbol","Básquetbol","Tenis","Béisbol","Fútbol Americano","Box / MMA","Otro"];
const MOCK_RANK = [
  {name:"Luis P.",e:63},{name:"Carlos M.",e:58},{name:"Sofía T.",e:51},
  {name:"Ana R.",e:47},{name:"Diego H.",e:39},
];
const defaultState = {
  setup:false, bankInitial:1000, goalAmount:2000,
  goalDays:30, goalStartDate: new Date().toISOString(),
  limits:{maxStakePct:5,dailyMaxBets:3},
  bets:[], guiaHistory:[],
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmt  = n => "$"+(Number(n)||0).toLocaleString("es-MX",{maximumFractionDigits:2});
const now  = () => new Date().toISOString();
const isToday = iso => { const d=new Date(iso),t=new Date(); return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate(); };
const inDays  = (iso,days) => Date.now()-new Date(iso).getTime()<=days*86400000;

function computeStats(state) {
  const res=[...state.bets].filter(b=>b.status!=="pendiente").sort((a,b)=>new Date(a.date)-new Date(b.date));
  let bank=state.bankInitial,won=0,lost=0,staked=0,net=0;
  const history=[{label:"Inicio",value:bank}];
  res.forEach((b,i)=>{
    const s=Number(b.stake)||0; staked+=s;
    if(b.status==="ganada"){const p=s*(b.odds-1);bank+=p;net+=p;won++;}
    else{bank-=s;net-=s;lost++;}
    history.push({label:"#"+(i+1),value:Math.round(bank*100)/100});
  });
  const total=won+lost,winRate=total?(won/total)*100:0,roi=staked?(net/staked)*100:0;
  let streak=0,streakType=null;
  for(let i=res.length-1;i>=0;i--){
    const s=res[i].status;
    if(!streakType){streakType=s;streak=1;}else if(s===streakType)streak++;else break;
  }
  const gr=state.goalAmount-state.bankInitial;
  const progress=gr>0?Math.max(0,Math.min(1,(bank-state.bankInitial)/gr)):bank>=state.goalAmount?1:0;
  return {
    bank:Math.round(bank*100)/100,history,won,lost,total,winRate,roi,netProfit:net,
    totalStaked:staked,streak,streakType,progress,
    pending:state.bets.filter(b=>b.status==="pendiente"),
    betsToday:state.bets.filter(b=>isToday(b.date)),
  };
}

function computePlan(state, stats) {
  const daysPassed = Math.max(0, Math.floor((Date.now()-new Date(state.goalStartDate).getTime())/86400000));
  const daysLeft   = Math.max(1, state.goalDays - daysPassed);
  const neededTotal = Math.max(0, state.goalAmount - stats.bank);
  const dailyTarget = neededTotal / daysLeft;

  // Stake diario máximo según límites
  const stakePerBet = stats.bank * (state.limits.maxStakePct / 100);
  const stakesPerDay = stakePerBet * state.limits.dailyMaxBets;

  // Win rate efectiva (mínimo 10 apuestas para usar la real, si no 50%)
  const wr = stats.total >= 10 ? stats.winRate / 100 : 0.5;

  // Fórmula: ganancia_esperada_día = stakesPerDay × (wr × odds − 1) = dailyTarget
  // → odds = (dailyTarget/stakesPerDay + 1) / wr
  let minOdds = null;
  if (stakesPerDay > 0 && wr > 0 && neededTotal > 0) {
    minOdds = (dailyTarget / stakesPerDay + 1) / wr;
    if (minOdds < 1) minOdds = 1;
  }

  const pct = state.goalDays > 0 ? Math.min(100, Math.round((daysPassed / state.goalDays) * 100)) : 0;

  return { daysLeft, daysPassed, neededTotal, dailyTarget, stakePerBet, stakesPerDay, minOdds, wr, pct };
}

function getLegs(bet) {
  if(Array.isArray(bet.legs)&&bet.legs.length) return bet.legs;
  return [{sport:bet.sport,event:bet.event,selection:bet.selection}];
}

/* ─── Imagen → JPEG optimizado ───────────────────────────────────────────── */
function compressImage(file) {
  return new Promise((resolve,reject)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const MAX=1120;let{width:w,height:h}=img;
      if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
      const c=document.createElement("canvas");c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      resolve({base64:c.toDataURL("image/jpeg",.88).split(",")[1],mediaType:"image/jpeg"});
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("No se pudo cargar la imagen"));};
    img.src=url;
  });
}

/* ─── API ─────────────────────────────────────────────────────────────────── */
const API="https://api.anthropic.com/v1/messages";
async function claude(body) {
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...body,model:"claude-sonnet-4-6",max_tokens:1000})});
  const d=await r.json();
  if(d?.error) throw new Error(d.error.message||"Error de API");
  return d?.content?.find(c=>c.type==="text")?.text?.trim()||"";
}

async function analyzeSlip(file) {
  const{base64,mediaType}=await compressImage(file);
  const txt=await claude({messages:[{role:"user",content:[
    {type:"image",source:{type:"base64",media_type:mediaType,data:base64}},
    {type:"text",text:`Analiza este boleto de apuesta (sencilla o parley).
Responde SOLO JSON sin backticks:
{"legs":[{"sport":string|null,"event":string|null,"selection":string|null}],"stake":number|null,"odds":number|null}
- legs: una por selección (mín 1). odds: cuota TOTAL. stake: monto. null si no se ve.`}
  ]}]});
  const m=txt.match(/\{[\s\S]*\}/);
  if(!m) throw new Error("JSON no válido");
  const p=JSON.parse(m[0]);
  if(!Array.isArray(p.legs)||!p.legs.length) p.legs=[{sport:null,event:null,selection:null}];
  return p;
}

function sysGuia(state,stats,plan) {
  return `Eres "Guía", coach de disciplina deportiva en BetGoal.

Perfil del usuario:
- Bank: ${fmt(state.bankInitial)} → ${fmt(stats.bank)} (meta ${fmt(state.goalAmount)} en ${state.goalDays} días)
- Días restantes: ${plan.daysLeft} | Ganancia diaria necesaria: ${fmt(plan.dailyTarget)}
- Momio mínimo sugerido para cumplir meta: ${plan.minOdds?plan.minOdds.toFixed(2):"N/A"}
- Efectividad: ${stats.winRate.toFixed(1)}% | ROI: ${stats.roi.toFixed(1)}% (${stats.won}G/${stats.lost}P)
- Racha: ${stats.streak} ${stats.streakType==="ganada"?"ganadas":stats.streakType==="perdida"?"perdidas":"–"}
- Límites: max ${state.limits.maxStakePct}% por apuesta · max ${state.limits.dailyMaxBets} diarias

Reglas:
1. NUNCA sugieras en qué apostar (ilegal).
2. SÍ habla de ROI, disciplina, bankroll, gestión emocional, si van bien para cumplir la meta en tiempo.
3. Cuando quieran apostar: pregunta "¿en qué te basas?", "¿lo estudiaste?" o "con tu racha, ¿tiene sentido?".
4. Máx 3-4 frases. Español. Directo y cercano.`;
}

async function chatGuia(state,stats,plan,history,msg) {
  return claude({system:sysGuia(state,stats,plan),
    messages:[...history.map(m=>({role:m.role,content:m.text})),{role:"user",content:msg}]});
}
async function guiaIntro(state,stats,plan) {
  return claude({system:sysGuia(state,stats,plan),
    messages:[{role:"user",content:"Hola, acabo de abrir la app. Dame un resumen rápido de cómo voy respecto a mi meta y qué debería tener en cuenta hoy."}]});
}

/* ─── Componentes base ───────────────────────────────────────────────────── */
function GoalRing({progress,size=180}) {
  const stroke=13,r=size/2-stroke,circ=2*Math.PI*r,offset=circ*(1-progress);
  return (
    <div className="relative glow-ring" style={{width:size,height:size,borderRadius:"50%"}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#1A3354" strokeWidth={stroke} fill="none"/>
        <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00FF87"/><stop offset="100%" stopColor="#00C8FF"/>
        </linearGradient></defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="url(#rg)" strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{transition:"stroke-dashoffset .9s ease"}}/>
      </svg>
    </div>
  );
}

function Chip({icon,label,value,accent}) {
  return (
    <div className="bg-surface-2 rounded-2xl px-3 py-3 flex-1 flex flex-col gap-1 border border-line">
      <div className="flex items-center gap-1 text-muted text-xs font-body">{icon}<span>{label}</span></div>
      <div className={`font-mono text-lg font-semibold ${accent||"text-primary"}`}>{value}</div>
    </div>
  );
}

function Badge({status}) {
  if(status==="ganada") return <span className="bg-ng text-ink text-xs font-semibold px-2 py-1 rounded-full">Ganada</span>;
  if(status==="perdida") return <span className="bg-nr text-ink text-xs font-semibold px-2 py-1 rounded-full">Perdida</span>;
  return <span className="text-xs font-semibold px-2 py-1 rounded-full border border-nb text-nb" style={{borderColor:"#00C8FF66"}}>Pendiente</span>;
}

/* ─── Onboarding ─────────────────────────────────────────────────────────── */
function Onboarding({setState}) {
  const [bank,setBank]=useState("1000");
  const [goal,setGoal]=useState("2000");
  const [days,setDays]=useState("30");
  const start=()=>setState({...defaultState,setup:true,
    bankInitial:Number(bank)||1000,goalAmount:Number(goal)||2000,
    goalDays:Number(days)||30,goalStartDate:new Date().toISOString()});
  return (
    <div className="min-h-screen bg-ink font-body flex flex-col items-center justify-center px-6 text-primary">
      <style>{S}</style>
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="text-center">
          <div className="text-5xl mb-4">🎯</div>
          <div className="font-display text-4xl font-bold brand">BetGoal</div>
          <p className="text-muted text-sm mt-2">Apuesta con cabeza. Tu Guía personal te acompaña.</p>
        </div>
        {[
          {label:"Bank inicial",val:bank,set:setBank,prefix:"$",clr:"text-ng tg-g"},
          {label:"Tu meta",val:goal,set:setGoal,prefix:"$",clr:"text-nb tg-b"},
          {label:"Días para cumplir tu meta",val:days,set:setDays,prefix:"📅",clr:"text-gold"},
        ].map(({label,val,set,prefix,clr})=>(
          <div key={label} className="bg-surface-2 rounded-2xl border border-line p-4 flex flex-col gap-1">
            <label className="text-xs text-muted">{label}</label>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-semibold ${clr}`}>{prefix}</span>
              <input type="number" value={val} onChange={e=>set(e.target.value)}
                className={`bg-transparent outline-none w-full font-mono text-2xl ${clr}`}/>
            </div>
          </div>
        ))}
        <button className="btn-pri" onClick={start}>Empezar con Guía</button>
        <p className="text-muted text-xs text-center">BetGoal no te dice en qué apostar.<br/>Te ayuda a apostar mejor.</p>
      </div>
    </div>
  );
}

/* ─── Plan Card ──────────────────────────────────────────────────────────── */
function PlanCard({plan, state}) {
  const impossible = plan.minOdds && plan.minOdds > 10;
  const tight      = plan.minOdds && plan.minOdds > 3 && !impossible;

  return (
    <div className="plan-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Target size={16} className="text-ng"/>
        <span className="font-display font-semibold text-sm text-primary">Plan para tu meta</span>
        <span className="ml-auto text-xs text-muted font-mono flex items-center gap-1">
          <Clock size={12}/>{plan.daysLeft}d restantes
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-3 rounded-xl p-3">
          <div className="text-muted text-xs mb-1">Ganancia diaria necesaria</div>
          <div className="font-mono font-semibold text-ng tg-g">{fmt(plan.dailyTarget)}</div>
        </div>
        <div className="bg-surface-3 rounded-xl p-3">
          <div className="text-muted text-xs mb-1">Te falta en total</div>
          <div className="font-mono font-semibold text-primary">{fmt(plan.neededTotal)}</div>
        </div>
      </div>

      <div className="bg-surface-3 rounded-xl p-3 flex flex-col gap-1">
        <div className="text-muted text-xs">Momio mínimo sugerido</div>
        {plan.minOdds ? (
          <>
            <div className={`font-mono text-2xl font-bold ${impossible?"text-nr":tight?"text-gold":"text-ng tg-g"}`}>
              {plan.minOdds.toFixed(2)}
            </div>
            <div className="text-muted text-xs leading-snug">
              {impossible
                ? "⚠️ Meta muy ambiciosa para el tiempo. Considera extender el plazo."
                : tight
                ? "Meta ajustada — apuesta solo cuando tengas una razón sólida."
                : `Apostando ${fmt(plan.stakePerBet)} por apuesta · ${state.limits.dailyMaxBets} apuesta${state.limits.dailyMaxBets>1?"s":""}/día · efectividad base ${Math.round(plan.wr*100)}%`}
            </div>
          </>
        ) : (
          <div className="text-nb text-sm">Registra más apuestas para calcular</div>
        )}
      </div>

      {/* Barra de tiempo */}
      <div>
        <div className="flex justify-between text-2xs text-muted font-mono mb-1">
          <span>Día {plan.daysPassed}</span>
          <span>Día {state.goalDays}</span>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{background:"#1A3354"}}>
          <div className="h-1.5 rounded-full" style={{width:`${plan.pct}%`,background:"linear-gradient(90deg,#00FF87,#00C8FF)",transition:"width .6s ease"}}/>
        </div>
      </div>
    </div>
  );
}

/* ─── Inicio ─────────────────────────────────────────────────────────────── */
function InicioTab({state,stats,plan}) {
  const [msg,setMsg]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let a=true;
    guiaIntro(state,stats,plan).then(m=>{if(a){setMsg(m);setLoading(false);}}).catch(()=>{if(a)setLoading(false);});
    return()=>{a=false;};
  },[]);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="bg-surface rounded-3xl border border-line p-5 flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <GoalRing progress={stats.progress}/>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-muted text-xs font-body">Tu bank</span>
            <span className="font-mono text-2xl font-semibold text-ng tg-g">{fmt(stats.bank)}</span>
            <span className="text-nb text-xs mt-1">
              {stats.bank>=state.goalAmount?"¡Meta alcanzada! 🎉":`Meta: ${fmt(state.goalAmount)}`}
            </span>
          </div>
        </div>
        <div className="w-full flex justify-between text-xs text-muted font-mono">
          <span>Inicio: {fmt(state.bankInitial)}</span>
          <span className="text-ng">{Math.round(stats.progress*100)}% del camino</span>
        </div>
      </div>

      {/* Plan */}
      <PlanCard plan={plan} state={state}/>

      {/* Guía */}
      <div className="bg-surface-2 rounded-2xl p-4" style={{border:"1px solid #00C8FF22"}}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🎯</span>
          <span className="text-xs text-nb font-semibold font-body">Guía</span>
        </div>
        {loading
          ?<div className="flex items-center gap-2 text-muted text-sm"><Loader2 size={14} className="animate-spin"/>Analizando tu sesión...</div>
          :<p className="text-sm leading-snug text-primary">{msg||"¡Bienvenido! Pregúntame lo que necesites."}</p>}
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <Chip icon={<Flame size={14}/>} label="Racha"
          value={stats.streak===0?"—":`${stats.streak} ${stats.streakType==="ganada"?"🟢":"🔴"}`}/>
        <Chip icon={<TrendingUp size={14}/>} label="Efectividad"
          value={`${stats.winRate.toFixed(0)}%`} accent="text-ng"/>
        <Chip icon={<Wallet size={14}/>} label="ROI"
          value={`${stats.roi>=0?"+":""}${stats.roi.toFixed(1)}%`}
          accent={stats.roi>=0?"text-ng":"text-nr"}/>
      </div>

      {/* Chart */}
      {stats.history.length>1&&(
        <div className="bg-surface-2 rounded-2xl border border-line p-4">
          <div className="text-xs text-muted mb-2 font-body">Evolución del bank</div>
          <div style={{height:130}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.history}>
                <XAxis dataKey="label" hide/><YAxis hide domain={["auto","auto"]}/>
                <Tooltip formatter={v=>fmt(v)}
                  contentStyle={{background:"#0D1520",border:"1px solid #1A3354",borderRadius:12,fontSize:12,color:"#DFF0FF"}}
                  labelStyle={{color:"#4A7292"}}/>
                <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00FF87"/><stop offset="100%" stopColor="#00C8FF"/>
                </linearGradient></defs>
                <Line type="monotone" dataKey="value" stroke="url(#lg)" strokeWidth={2.5} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats.pending.length>0&&(
        <div className="bg-surface-2 border border-line rounded-2xl p-3 text-sm text-muted">
          {stats.pending.length} apuesta{stats.pending.length>1?"s":""} pendiente{stats.pending.length>1?"s":""} — ve a <span className="text-nb">Apuestas</span>.
        </div>
      )}
    </div>
  );
}

/* ─── Apuestas ───────────────────────────────────────────────────────────── */
function AddBetSheet({state,setState,onClose}) {
  const [mode,setMode]=useState("choice");
  const [analyzing,setAnalyzing]=useState(false);
  const [error,setError]=useState(null);
  const [aiNote,setAiNote]=useState(false);
  const fileRef=useRef(null);
  const [isParlay,setIsParlay]=useState(false);
  const [legs,setLegs]=useState([{sport:"Fútbol",event:"",selection:""}]);
  const [stake,setStake]=useState("");
  const [odds,setOdds]=useState("");

  const upd=(i,f,v)=>setLegs(ls=>ls.map((l,x)=>x===i?{...l,[f]:v}:l));

  const handleFile=e=>{
    const file=e.target.files?.[0];if(!file)return;
    setError(null);setAnalyzing(true);
    analyzeSlip(file)
      .then(r=>{
        const nl=r.legs.map(l=>({sport:l.sport||"Fútbol",event:l.event||"",selection:l.selection||""}));
        setLegs(nl);setIsParlay(nl.length>1);
        setStake(r.stake!=null?String(r.stake):"");
        setOdds(r.odds!=null?String(r.odds):"");
        setAiNote(true);setMode("form");
      })
      .catch(e=>{setError("No pude leer la captura: "+(e.message||"error")+". Intenta de nuevo o llénalo a mano.");setMode("form");})
      .finally(()=>setAnalyzing(false));
  };

  const stats=computeStats(state);
  const sn=Number(stake)||0,on=Number(odds)||0;
  const pct=stats.bank>0?(sn/stats.bank)*100:0;
  const canSave=legs.every(l=>l.event.trim())&&sn>0&&on>=1;

  const save=()=>{
    setState(s=>({...s,bets:[...s.bets,{
      id:Date.now().toString(),date:now(),
      legs:legs.map(l=>({sport:l.sport,event:l.event.trim(),selection:l.selection.trim()})),
      stake:sn,odds:on,status:"pendiente"
    }]}));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(8,12,20,.85)"}}>
      <div className="w-full max-w-md bg-surface rounded-t-3xl p-5 sheet-max overflow-y-auto" style={{borderTop:"1px solid #1A3354"}}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-lg font-semibold text-primary">Nueva apuesta</div>
          <button onClick={onClose} className="text-muted"><X size={22}/></button>
        </div>

        {mode==="choice"&&(
          <div className="flex flex-col gap-3">
            <button onClick={()=>fileRef.current?.click()}
              className="bg-surface-2 border border-line rounded-2xl p-4 flex items-center gap-3 text-left">
              <div className="bg-ng text-ink rounded-xl p-2 glow-g"><Camera size={20}/></div>
              <div>
                <div className="font-display font-semibold text-primary">Desde screenshot</div>
                <div className="text-muted text-xs mt-0.5">La IA extrae todo del boleto automáticamente</div>
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
            <button onClick={()=>setMode("form")}
              className="bg-surface-2 border border-line rounded-2xl p-4 flex items-center gap-3 text-left">
              <div className="bg-nb text-ink rounded-xl p-2 glow-b"><ClipboardList size={20}/></div>
              <div>
                <div className="font-display font-semibold text-primary">Manual</div>
                <div className="text-muted text-xs mt-0.5">Llena los datos tú mismo</div>
              </div>
            </button>
          </div>
        )}

        {analyzing&&(
          <div className="flex flex-col items-center gap-3 py-10 text-muted">
            <Loader2 size={30} className="animate-spin text-ng"/>
            <p className="text-sm">Leyendo tu boleto...</p>
          </div>
        )}

        {mode==="form"&&!analyzing&&(
          <div className="flex flex-col gap-3">
            {aiNote&&<div className="bg-surface-2 rounded-xl px-3 py-2 text-xs text-ng flex items-center gap-2" style={{border:"1px solid #00FF8755"}}>
              <Sparkles size={14}/> La IA leyó tu boleto — revisa y corrige si algo no quedó bien.
            </div>}
            {error&&<div className="bg-surface-2 rounded-xl px-3 py-2 text-xs text-nr" style={{border:"1px solid #FF3D6E44"}}>{error}</div>}

            <div className="flex gap-2">
              {["Sencilla","Parley"].map((lbl,i)=>(
                <button key={lbl} onClick={()=>{setIsParlay(!!i);if(i&&legs.length<2)setLegs(l=>[...l,{sport:"Fútbol",event:"",selection:""}]);}}
                  className="flex-1 rounded-xl py-2 text-sm font-display font-semibold border"
                  style={{background:(!i&&!isParlay)||(i&&isParlay)?"#182A40":"#0D1520",
                          borderColor:(!i&&!isParlay)||(i&&isParlay)?"#00C8FF":"#1A3354",
                          color:(!i&&!isParlay)||(i&&isParlay)?"#00C8FF":"#4A7292"}}>
                  {lbl}
                </button>
              ))}
            </div>

            {legs.map((leg,i)=>(
              <div key={i} className={isParlay?"bg-surface-3 border border-line rounded-2xl p-3 flex flex-col gap-2":"flex flex-col gap-2"}>
                {isParlay&&<div className="flex items-center justify-between">
                  <span className="text-xs text-ng font-semibold">Selección {i+1}</span>
                  {legs.length>1&&<button onClick={()=>setLegs(l=>l.filter((_,x)=>x!==i))} className="text-muted"><X size={16}/></button>}
                </div>}
                <select value={leg.sport} onChange={e=>upd(i,"sport",e.target.value)}
                  className="bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm outline-none">
                  {SPORTS.map(s=><option key={s}>{s}</option>)}
                </select>
                <input value={leg.event} onChange={e=>upd(i,"event",e.target.value)} placeholder="Evento (ej. América vs Chivas)"
                  className="bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none"/>
                <input value={leg.selection} onChange={e=>upd(i,"selection",e.target.value)} placeholder="Tu selección"
                  className="bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none"/>
              </div>
            ))}

            {isParlay&&<button onClick={()=>setLegs(l=>[...l,{sport:"Fútbol",event:"",selection:""}])}
              className="rounded-xl py-2 text-sm font-display font-semibold text-ng flex items-center justify-center gap-1"
              style={{border:"1px solid #00FF8755"}}>
              <Plus size={16}/> Agregar selección
            </button>}

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-muted">Monto</label>
                <div className="bg-surface-2 border border-line rounded-xl px-3 py-2.5 flex items-center">
                  <span className="text-ng font-mono mr-1">$</span>
                  <input type="number" value={stake} onChange={e=>setStake(e.target.value)} placeholder="100"
                    className="bg-transparent outline-none w-full text-sm font-mono"/>
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-muted">{isParlay?"Cuota total":"Cuota"}</label>
                <input type="number" step="0.01" value={odds} onChange={e=>setOdds(e.target.value)} placeholder="1.85"
                  className="bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm font-mono outline-none"/>
              </div>
            </div>

            {sn>0&&on>=1&&(
              <div className="bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs font-mono flex flex-col gap-1">
                <div className="flex justify-between"><span className="text-muted">Si gana, recibes</span><span className="text-primary">{fmt(sn*on)}</span></div>
                <div className="flex justify-between"><span className="text-muted">Ganancia neta</span><span className="text-ng">+{fmt(sn*(on-1))}</span></div>
              </div>
            )}

            {pct>state.limits.maxStakePct&&sn>0&&(
              <div className="bg-surface-2 rounded-xl px-3 py-2 text-xs text-nr" style={{border:"1px solid #FF3D6E44"}}>
                Esta apuesta es el {pct.toFixed(1)}% de tu bank — por encima de tu límite ({state.limits.maxStakePct}%). Guía lo va a notar 👀
              </div>
            )}

            <button className="btn-pri" onClick={save} disabled={!canSave} style={{marginTop:4}}>Guardar apuesta</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BetCard({bet,onSetStatus}) {
  const legs=getLegs(bet),isParlay=legs.length>1;
  const profit=bet.status==="ganada"?bet.stake*(bet.odds-1):bet.status==="perdida"?-bet.stake:0;
  return (
    <div className="bg-surface-2 rounded-2xl border border-line p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {isParlay&&<div className="text-xs text-nb font-semibold mb-1.5">Parley · {legs.length} selecciones</div>}
          {legs.map((l,i)=>(
            <div key={i} className={i>0?"mt-2 pt-2 border-t border-line":""}>
              <div className="text-xs text-muted">{l.sport}</div>
              <div className="font-display font-semibold text-sm text-primary">{l.event||"Sin nombre"}</div>
              {l.selection&&<div className="text-muted text-xs mt-0.5">{l.selection}</div>}
            </div>
          ))}
        </div>
        <Badge status={bet.status}/>
      </div>
      <div className="flex items-center justify-between font-mono text-sm pt-2 border-t border-line">
        <span className="text-muted">{fmt(bet.stake)} @ {bet.odds}</span>
        {bet.status==="pendiente"
          ?<span className="text-muted text-xs">Si gana: <span className="text-ng">{fmt(bet.stake*bet.odds)}</span></span>
          :<span className={profit>=0?"text-ng":"text-nr"}>{profit>=0?"+":""}{fmt(profit)}</span>}
      </div>
      {bet.status==="pendiente"&&(
        <div className="flex gap-2 mt-1">
          <button onClick={()=>onSetStatus(bet.id,"ganada")} className="flex-1 bg-ng text-ink text-xs font-semibold rounded-xl py-2">Ganada ✓</button>
          <button onClick={()=>onSetStatus(bet.id,"perdida")} className="flex-1 bg-nr text-ink text-xs font-semibold rounded-xl py-2">Perdida ✗</button>
        </div>
      )}
    </div>
  );
}

function ApuestasTab({state,setState}) {
  const [open,setOpen]=useState(false);
  const setStatus=(id,s)=>setState(st=>({...st,bets:st.bets.map(b=>b.id===id?{...b,status:s}:b)}));
  const sorted=[...state.bets].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="font-display text-lg font-semibold text-primary">Tus apuestas</div>
        <button onClick={()=>setOpen(true)} className="bg-ng text-ink rounded-full p-2.5 glow-g"><Plus size={20}/></button>
      </div>
      {sorted.length===0
        ?<div className="bg-surface-2 border border-line rounded-2xl p-6 text-center text-muted text-sm">Toca el + para registrar tu primera apuesta.</div>
        :sorted.map(b=><BetCard key={b.id} bet={b} onSetStatus={setStatus}/>)}
      {open&&<AddBetSheet state={state} setState={setState} onClose={()=>setOpen(false)}/>}
    </div>
  );
}

/* ─── Guía Chat ──────────────────────────────────────────────────────────── */
function GuiaTab({state,setState,stats,plan}) {
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const history=state.guiaHistory||[];
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[history,loading]);

  const send=async()=>{
    const text=input.trim();if(!text||loading)return;
    setInput("");
    const uMsg={role:"user",text,id:Date.now().toString()};
    setState(s=>({...s,guiaHistory:[...(s.guiaHistory||[]),uMsg]}));
    setLoading(true);
    try {
      const reply=await chatGuia(state,stats,plan,[...history,uMsg],text);
      setState(s=>({...s,guiaHistory:[...(s.guiaHistory||[]),{role:"assistant",text:reply,id:(Date.now()+1).toString()}]}));
    } catch {
      setState(s=>({...s,guiaHistory:[...(s.guiaHistory||[]),{role:"assistant",text:"Tuve un problema. Intenta de nuevo.",id:(Date.now()+1).toString()}]}));
    } finally{setLoading(false);}
  };

  const QUICK=["¿Cómo voy con mi meta?","Quiero hacer una apuesta","¿Mi racha es preocupante?","¿Estoy cumpliendo el plan?"];

  return (
    <div className="flex flex-col pt-2" style={{height:"calc(100vh - 140px)"}}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <div>
            <div className="font-display font-semibold text-primary">Guía</div>
            <div className="text-muted text-xs">Coach de disciplina · siempre contigo</div>
          </div>
        </div>
        {history.length>0&&<button onClick={()=>{if(confirm("¿Borrar conversación?"))setState(s=>({...s,guiaHistory:[]}));}} className="text-muted"><RefreshCw size={16}/></button>}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col gap-3 pb-3">
        {history.length===0&&(
          <>
            <div className="chat-g p-3 text-sm text-primary">Hola, soy tu Guía 👋 No te digo en qué apostar, pero sí te ayudo a apostar mejor — análisis de tu plan, disciplina y a cuestionarte antes de decisiones impulsivas. ¿Por dónde empezamos?</div>
            <div className="flex flex-wrap gap-2">
              {QUICK.map(q=><button key={q} onClick={()=>setInput(q)}
                className="text-xs rounded-full px-3 py-1.5 text-muted" style={{border:"1px solid #1A3354",background:"#0D1520"}}>{q}</button>)}
            </div>
          </>
        )}
        {history.map(m=>(
          <div key={m.id} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
            <div className={`max-w-xs px-4 py-3 text-sm leading-snug text-primary ${m.role==="user"?"chat-u":"chat-g"}`}>{m.text}</div>
          </div>
        ))}
        {loading&&<div className="flex justify-start"><div className="chat-g px-4 py-3 flex items-center gap-2 text-muted text-sm"><Loader2 size={14} className="animate-spin text-nb"/>Pensando...</div></div>}
        <div ref={bottomRef}/>
      </div>
      <div className="flex gap-2 pt-2 border-t border-line">
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder="Escríbele a Guía..."
          className="flex-1 bg-surface-2 border border-line rounded-2xl px-4 py-3 text-sm outline-none"/>
        <button onClick={send} disabled={!input.trim()||loading} className="rounded-2xl px-4 py-3"
          style={{background:input.trim()&&!loading?"linear-gradient(135deg,#00FF87,#00C8FF)":"#182A40",
                  color:input.trim()&&!loading?"#080C14":"#4A7292"}}>
          <Send size={18}/>
        </button>
      </div>
    </div>
  );
}

/* ─── Resumen ────────────────────────────────────────────────────────────── */
function ResumenTab({state,stats}) {
  const w=state.bets.filter(b=>inDays(b.date,7));
  const wr=w.filter(b=>b.status!=="pendiente");
  const won=wr.filter(b=>b.status==="ganada").length,lost=wr.filter(b=>b.status==="perdida").length;
  const tot=won+lost,eff=tot?(won/tot)*100:0;
  const staked=wr.reduce((a,b)=>a+(Number(b.stake)||0),0);
  const net=wr.reduce((a,b)=>b.status==="ganada"?a+b.stake*(b.odds-1):b.status==="perdida"?a-b.stake:a,0);
  const cards=[
    {t:"Tu semana",v:w.length,s:w.length===1?"apuesta":"apuestas",c:"text-nb"},
    {t:"Efectividad",v:tot?`${eff.toFixed(0)}%`:"—",s:tot?`${won} de ${tot} ganadas`:"sin resultados",c:"text-ng"},
    {t:"Apostado",v:fmt(staked),s:"esta semana",c:"text-primary"},
    {t:"Resultado",v:`${net>=0?"+":""}${fmt(net)}`,s:net>=0?"semana positiva":"sigue tu plan",c:net>=0?"text-ng":"text-nr"},
    {t:"Bank hoy",v:fmt(stats.bank),s:`${Math.round(stats.progress*100)}% a la meta`,c:"text-nb"},
  ];
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="font-display text-lg font-semibold text-primary">Resumen semanal</div>
      <p className="text-muted text-sm">Desliza para ver tu semana.</p>
      <div className="flex gap-3 overflow-x-auto snap-x scrollbar-none -mx-4 px-4 pb-2">
        {cards.map((c,i)=>(
          <div key={i} className="snap-card shrink-0 bg-surface-2 border border-line rounded-3xl p-6 flex flex-col justify-between" style={{width:240,height:280}}>
            <div className="text-muted text-sm font-body">{c.t}</div>
            <div className={`font-display font-bold text-4xl ${c.c}`}>{c.v}</div>
            <div className="text-muted text-sm">{c.s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Ranking ────────────────────────────────────────────────────────────── */
function RankingTab({stats}) {
  const me={name:"Tú",e:stats.winRate,isMe:true};
  const list=[...MOCK_RANK,me].sort((a,b)=>b.e-a.e);
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="font-display text-lg font-semibold text-primary">Ranking de efectividad</div>
      <p className="text-muted text-sm">% de aciertos, no cuánto ganan.</p>
      <div className="flex flex-col gap-2">
        {list.map((u,i)=>(
          <div key={u.name} className="flex items-center gap-3 rounded-2xl border p-3"
            style={{background:u.isMe?"#182A40":"#0D1520",borderColor:u.isMe?"#00C8FF":"#1A3354"}}>
            <div className="font-mono text-muted w-5 text-center text-sm">{i+1}</div>
            <div className="flex-1 font-display font-semibold text-sm text-primary flex items-center gap-2">
              {u.name}{u.isMe&&<Trophy size={13} className="text-nb"/>}
            </div>
            <div className="font-mono text-sm text-ng">{u.e.toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Metas ──────────────────────────────────────────────────────────────── */
function MetasTab({state,setState}) {
  const [bi,setBi]=useState(String(state.bankInitial));
  const [ga,setGa]=useState(String(state.goalAmount));
  const [gd,setGd]=useState(String(state.goalDays||30));
  const [ms,setMs]=useState(String(state.limits.maxStakePct));
  const [dm,setDm]=useState(String(state.limits.dailyMaxBets));

  const save=()=>setState(s=>({...s,
    bankInitial:Number(bi)||s.bankInitial,
    goalAmount:Number(ga)||s.goalAmount,
    goalDays:Number(gd)||s.goalDays||30,
    goalStartDate:new Date().toISOString(), // reset timer on save
    limits:{maxStakePct:Number(ms)||s.limits.maxStakePct,dailyMaxBets:Number(dm)||s.limits.dailyMaxBets},
  }));
  const reset=()=>{ if(confirm("¿Borrar todo?"))setState({...defaultState}); };

  const Field=({label,val,set,prefix,hint})=>(
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted">{label}</label>
      {hint&&<p className="text-xs text-muted" style={{marginTop:-2}}>{hint}</p>}
      <div className="bg-surface-2 border border-line rounded-xl px-3 py-2.5 flex items-center">
        {prefix&&<span className="text-ng font-mono mr-1">{prefix}</span>}
        <input type="number" value={val} onChange={e=>set(e.target.value)}
          className="bg-transparent outline-none w-full font-mono text-sm"/>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="font-display text-lg font-semibold text-primary">Metas y límites</div>
      <Field label="Bank inicial" val={bi} set={setBi} prefix="$"/>
      <Field label="Tu meta" val={ga} set={setGa} prefix="$"/>
      <Field label="Días para cumplir la meta" val={gd} set={setGd} prefix="📅"
        hint="Al guardar se reinicia el contador de días."/>
      <div className="border-t border-line my-1"/>
      <div className="font-display text-sm font-semibold text-muted">Límites de disciplina</div>
      <Field label="Máximo por apuesta (% del bank)" val={ms} set={setMs}/>
      <Field label="Máximo de apuestas por día" val={dm} set={setDm}/>
      <button className="btn-pri" onClick={save}>Guardar cambios</button>
      <button onClick={reset} className="rounded-2xl py-3 text-sm font-display font-semibold text-nr flex items-center justify-center gap-2"
        style={{border:"1px solid #FF3D6E33"}}>
        <RefreshCw size={15}/> Reiniciar todos los datos
      </button>
    </div>
  );
}

/* ─── Nav + App ──────────────────────────────────────────────────────────── */
const NAV=[
  {key:"inicio",label:"Inicio",icon:Home},
  {key:"apuestas",label:"Apuestas",icon:ClipboardList},
  {key:"guia",label:"Guía",icon:MessageCircle},
  {key:"resumen",label:"Resumen",icon:Sparkles},
  {key:"ranking",label:"Ranking",icon:Trophy},
];

export default function App() {
  const [state,setState]=useState(null);
  const [loaded,setLoaded]=useState(false);
  const [tab,setTab]=useState("inicio");

  useEffect(()=>{
    store.get(KEY).then(r=>setState(r?JSON.parse(r.value):defaultState)).catch(()=>setState(defaultState)).finally(()=>setLoaded(true));
  },[]);
  useEffect(()=>{
    if(!loaded||!state)return;
    store.set(KEY,JSON.stringify(state)).catch(()=>{});
  },[state,loaded]);

  if(!state) return <div style={{minHeight:"100vh",background:"#080C14",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{S}</style><Loader2 size={28} className="animate-spin text-ng"/></div>;
  if(!state.setup) return <Onboarding setState={setState}/>;

  const stats=computeStats(state);
  const plan=computePlan(state,stats);

  return (
    <div className="bg-ink font-body text-primary" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <style>{S}</style>
      <div style={{width:"100%",maxWidth:448,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 16px 4px"}}>
          <div className="font-display text-xl font-bold brand">BetGoal</div>
          <button onClick={()=>setTab("metas")} className="text-muted" style={{padding:4}}><Settings size={20}/></button>
        </div>
        <main style={{flex:1,padding:"0 16px 96px"}}>
          {tab==="inicio"   &&<InicioTab   state={state} stats={stats} plan={plan} setState={setState}/>}
          {tab==="apuestas" &&<ApuestasTab state={state} setState={setState}/>}
          {tab==="guia"     &&<GuiaTab     state={state} setState={setState} stats={stats} plan={plan}/>}
          {tab==="resumen"  &&<ResumenTab  state={state} stats={stats}/>}
          {tab==="ranking"  &&<RankingTab  stats={stats}/>}
          {tab==="metas"    &&<MetasTab    state={state} setState={setState}/>}
        </main>
        <div className="nav-glass" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:448,display:"flex"}}>
          {NAV.map(item=>{
            const Icon=item.icon,active=tab===item.key;
            return (
              <button key={item.key} onClick={()=>setTab(item.key)}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 0",background:"none",border:"none",cursor:"pointer"}}>
                <Icon size={20} style={{color:active?"#00FF87":"#4A7292"}}/>
                <span className="text-2xs font-body" style={{color:active?"#00FF87":"#4A7292"}}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
