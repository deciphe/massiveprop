import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  SlidersHorizontal,
  X
} from "lucide-react";
import { firms, shortBalance } from "./firmCatalog";
import { reviewNotes } from "./reviewNotes";
import { certificates } from "../payoutlab/data";
import SpeedManifesto from "./SpeedManifesto";
import FreeDrops from "./FreeDrops";
import { executionMetrics } from "./executionMetrics";
import "./web3-hub.css";
import "./speed-manifesto.css";
import "./comparison-deck.css";
import "./obsidian.css";
import FirmAtmosphere,{firmMark} from "../design/FirmAtmosphere";
import "../design/collector-surfaces.css";

const OUTCOME_TARGET = 10;
const RISK_BUDGET = 3;
const NQ_REFERENCE = 27000;
const points = n => n == null ? "—" : new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(n);
const percent = n => n == null ? "Unavailable" : Number(n.toFixed(3)) + "%";
const CORE_FIRM_IDS = ["vest","breakout","hypernova","propr","vanta"];
const coreFirms = CORE_FIRM_IDS.map(id=>firms.find(f=>f.id===id)).filter(Boolean);

const marketProfiles = {indices:{label:"NQ"},crypto:{label:"BTC"}};
const marketLeverage = {
  vest:{indices:50,crypto:10}, hypernova:{indices:10,crypto:5},
  propr:{indices:10,crypto:10}, breakout:{indices:10,crypto:10},
  vanta:{indices:2.5,crypto:1.5}
};
// Per-side taker percentages. Snapshot inputs, not a live quote feed.
const takerFees = {
  indices:{vest:.0025,hypernova:.005,propr:.009,breakout:.04,vanta:0},
  crypto:{vest:.01,hypernova:.04,propr:.045,breakout:.04,vanta:.03}
};

function money(n){
  if(n==null) return "—";
  const decimals=Number.isInteger(Number(n))?0:2;
  return new Intl.NumberFormat("en-US",{
    style:"currency",
    currency:"USD",
    minimumFractionDigits:decimals,
    maximumFractionDigits:2
  }).format(n);
}

function pctNumber(value){
  const m=String(value??"").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function defaultProgram(firm){
  return firm.programs.find(p=>p.id===firm.defaultProgram) || firm.programs[0];
}

function firstToken(value){
  return String(value??"—").split(" ")[0];
}

function FirmLogo({firm,className=""}) {
  const [failed,setFailed]=useState(false);
  return <span className={"gp-logo gp-logo-"+firm.id+" "+className+(failed?" is-fallback":"")} aria-hidden="true">
    {failed ? <span className="gp-logo-fallback">{firm.mark}</span> : <img src={firmMark(firm.id)||firm.logo} alt="" loading="lazy" onError={()=>setFailed(true)}/>}
  </span>;
}

function FirmCard({firm,onOpen,index}){
  const program=defaultProgram(firm), review=reviewNotes[firm.id];
  return <article className={"review-row"+(firm.id==="vest"?" is-top-pick":"")}>
    <div className="review-identity"><FirmAtmosphere firm={firm.id}/><span className="review-rank">{String(index+1).padStart(2,"0")}</span><FirmLogo firm={firm}/><div><h3>{firm.name}</h3><span>{review.tag}</span></div></div>
    <div className="review-verdict">{['hypernova','propr'].includes(firm.id)&&<span className="pick-label">MY PICK · {firm.id==='hypernova'?'LOW RISK':'CLASSIC 1-STEP'}</span>}<h4>{review.title}</h4>{firm.id==="breakout"&&<p><a href="https://www.breakoutprop.com/article/the-heat-sheet-august-2026/" target="_blank" rel="noopener noreferrer" style={{color:"inherit",textUnderlineOffset:3}}>Reported $7.1M paid in August 2026</a></p>}<p className="review-caution"><b>The trade-off</b> {review.caution}</p></div>
    <dl className="review-facts"><div><dt>25K entry</dt><dd>{money(firm.price)}</dd></div><div><dt>Max drawdown</dt><dd>{firstToken(program.drawdown)}</dd></div><div><dt>Payout access</dt><dd>{firm.payout}</dd></div></dl>
    <div className="review-actions"><a href={firm.url} target="_blank" rel={firm.referral?"sponsored noopener noreferrer":"noopener noreferrer"}>Visit {firm.name}<ArrowUpRight size={15}/></a>{firm.id==="vest" && <span className="review-offer">5% off · code GIGA at checkout</span>}<button type="button" onClick={()=>onOpen(firm.id)} aria-label={"Explore "+firm.name+" programs"}>Account types & rules <ChevronRight size={14}/></button></div>
  </article>;
}

function FundedNextBonus(){
  const [copied,setCopied]=useState(false);
  const copy=async()=>{try{await navigator.clipboard.writeText('GIGA');setCopied(true);}catch{setCopied(false);}};
  return <article className="fn-bonus"><div><span className="pick-label">BONUS PICK / FUTURES</span><h3>FundedNext Futures</h3><p>A separate futures option alongside my Web3 shortlist.</p></div><div className="fn-code"><span>USE MY CODE</span><button onClick={copy} aria-label="Copy FundedNext code GIGA">{copied?'GIGA · COPIED':'GIGA · COPY'}</button></div><a href="https://fundednext.com/futures/legacy" target="_blank" rel="sponsored noopener noreferrer">Explore Futures</a></article>;
}

function AboutPopover(){
  const [open,setOpen]=useState(false);
  const dialog=useRef(null),trigger=useRef(null);
  useEffect(()=>{
    if(!open)return;
    dialog.current.showModal();
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=overflow;trigger.current?.focus();};
  },[open]);
  const close=()=>setOpen(false);
  const proof=['Maven','Topstep','Tradeify','Lucid Trading','FundedNext','Breakout'].map(firm=>({firm,records:certificates.filter(c=>c.firm===firm&&!['fundednext-004','fundednext-005'].includes(c.id)).sort((a,b)=>b.amountNum-a.amountNum)})).filter(g=>g.records.length);

  return <><button ref={trigger} className="gp-about-trigger gp-wisp-trigger" onClick={()=>setOpen(true)} aria-haspopup="dialog"><span className="gp-wisp-avatar"><img src="https://raw.githubusercontent.com/deciphe/massiveprop/main/public/wisp.webp" alt="Wisp"/></span><span className="gp-wisp-copy">Oh, me?<small>A little background</small></span><span className="gp-wisp-plus" aria-hidden="true">+</span></button>{open&&<dialog className="gp-about-dialog" ref={dialog} aria-labelledby="gp-about-title" onCancel={close} onClose={close} onClick={e=>{if(e.target===e.currentTarget)close();}}><div className="gp-about-content"><header><span>A LITTLE BACKGROUND</span><button onClick={close} aria-label="Close about"><X size={18}/></button></header><h2 id="gp-about-title">I'm couldbeluck.</h2><p>A trader behind MASSIVE. These comparisons come from spending time with the firms, their rules, and their costs.</p><section className="gp-proof-volume" aria-label="Personal payout record stacks"><div className="gp-volume-heading"><span>PERSONAL PAYOUT RECORDS</span><small>Across six firms</small></div><div className="gp-ripple-grid">{proof.map(({firm,records})=><article key={firm} className="gp-ripple-firm"><div className="gp-ripple-heading"><h3>{firm}</h3><span><b>{records.length}</b> records</span></div><details className="gp-ripple-details"><summary aria-label={`Browse ${records.length} ${firm} payout records`}><div className="gp-ripple-stack" aria-hidden="true">{records.slice(0,Math.min(12,records.length)).map((c,i)=><img key={c.id} src={c.image} alt="" loading="lazy" style={{'--i':i,zIndex:15-i}}/>)}</div><span className="gp-ripple-browse">Explore the stack <span>+</span></span></summary><div className="gp-ripple-archive">{records.map(c=><a key={c.id} href={c.image} target="_blank" rel="noopener noreferrer" aria-label={`Inspect ${firm} payout record ${c.amount}, ${c.date}`}><img src={c.image} alt={firm+' payout record, '+c.amount} loading="lazy"/><span>{c.amount}<small>{c.date}</small></span></a>)}</div></details></article>)}</div><p>Personal records. Payouts are not net profit. Topstep records are restyled by MASSIVE with their source information preserved.</p></section></div></dialog>}</>;
}

function FirmDrawer({firm,onClose}){
  const drawerRef=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    drawerRef.current?.querySelector('button')?.focus();
    const handleKey=(e)=>{
      if(e.key==="Escape") onClose();
      if(e.key!=="Tab") return;
      const nodes=[...drawerRef.current.querySelectorAll('button:not(:disabled), a[href]')];
      const first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',handleKey);
    return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',handleKey);previous?.focus();};
  },[]);
  const initial=defaultProgram(firm);
  const [programId,setProgramId]=useState(initial.id);
  const [sizeIndex,setSizeIndex]=useState(()=>{
    const idx=initial.sizes.findIndex(s=>s.balance===25000 && !s.disabled);
    return idx>=0?idx:Math.max(0,initial.sizes.findIndex(s=>!s.disabled));
  });

  const program=firm.programs.find(p=>p.id===programId) || initial;
  const size=program.sizes[Math.min(sizeIndex,program.sizes.length-1)] || program.sizes[0];

  function selectProgram(id){
    const next=firm.programs.find(p=>p.id===id) || firm.programs[0];
    setProgramId(next.id);
    const preferred=next.sizes.findIndex(s=>s.balance===25000 && !s.disabled);
    const firstLive=next.sizes.findIndex(s=>!s.disabled);
    setSizeIndex(preferred>=0?preferred:Math.max(0,firstLive));
  }

  return <div className="firm-drawer-shell" role="dialog" aria-modal="true" aria-label={firm.name+" details"} onClick={onClose}>
    <aside ref={drawerRef} className="firm-drawer" onClick={e=>e.stopPropagation()}>
      <div className="firm-drawer-top"><FirmAtmosphere firm={firm.id}/>
        <div className="firm-drawer-brand"><FirmLogo firm={firm}/><div><span>{firm.status}</span><h2>{firm.name}</h2></div></div>
        <button type="button" onClick={onClose} aria-label="Close firm details"><X size={18}/></button>
      </div>

      <div className="drawer-review"><span className="gp-eyebrow">MY TAKE</span><h3>{reviewNotes[firm.id].title}</h3><p>{reviewNotes[firm.id].verdict}</p><p><b>The trade-off.</b> {reviewNotes[firm.id].caution}</p></div><p className="firm-drawer-note">{firm.note}</p>

      <div className="firm-drawer-tabs" aria-label="Programs">
        {firm.programs.map(p=><button type="button" key={p.id} aria-pressed={p.id===program.id} className={p.id===program.id?"is-active":""} onClick={()=>selectProgram(p.id)}>
          <span>{p.label}</span><small>{p.badge}</small>
        </button>)}
      </div>

      <div className="firm-drawer-sizes">
        <span>ACCOUNT</span>
        <div>{program.sizes.map((s,i)=><button
          type="button"
          key={(s.balance??"na")+"-"+i}
          disabled={s.disabled}
          aria-pressed={i===sizeIndex} className={i===sizeIndex?"is-active":""}
          onClick={()=>setSizeIndex(i)}
        >{s.balance!=null?shortBalance(s.balance):"—"}</button>)}</div>
      </div>

      <div className="firm-drawer-price">
        <span>ENTRY · {size?.balance!=null?shortBalance(size.balance):"—"}</span>
        <strong>{size?.fee!=null?money(size.fee):(size?.feeLabel||"—")}</strong>
        {size?.listFee!=null && <small>LIST {money(size.listFee)}</small>}
      </div>

      <div className="firm-drawer-grid">
        <div><span>TARGET</span><strong>{program.target}</strong></div>
        <div><span>MAX DD</span><strong>{program.drawdown}</strong></div>
        <div><span>DAILY</span><strong>{program.daily}</strong></div>
        <div><span>SPLIT</span><strong>{program.split}</strong></div>
        <div><span>LEVERAGE</span><strong>{program.leverage}</strong></div>
        <div><span>PAYOUT</span><strong>{program.payout}</strong></div>
      </div>

      <div className="firm-drawer-meta">
        <div><span>MIN DAYS</span><strong>{program.minDays}</strong></div>
        <div><span>TIME LIMIT</span><strong>{program.timeLimit}</strong></div>
        <div><span>VENUE</span><strong>{firm.venue}</strong></div>
      </div>

      <div className="firm-drawer-tags">
        {[...(program.tags||[]),...(program.extras||[])].map(tag=><span key={tag}>{tag}</span>)}
      </div>

      <p className="review-source">Terms snapshot: September 2026. <a href={"https://"+firm.domain} target="_blank" rel="noopener noreferrer">Check published terms ↗</a></p>
      <a className="firm-drawer-cta" href={firm.url} target="_blank" rel={firm.referral?"sponsored noopener noreferrer":"noopener noreferrer"}>
        {firm.id==="vest"?"Open Vest · 5% off · GIGA":"Open "+firm.name} <ArrowUpRight size={16}/>
      </a>
      {firm.referral && <p className="firm-drawer-note">Referral link. I may earn a commission.{firm.id==="vest"?" 5% off through this link. Manual checkout code: GIGA.":""}</p>}
    </aside>
  </div>;
}

function CompactMatrix(){
  return <details className="raw-matrix">
    <summary><span><SlidersHorizontal size={14}/> Compare all rules</span><small>+</small></summary>
    <div className="gp-matrix-wrap"><table className="gp-matrix"><thead><tr>
      <th>Firm</th><th>25K</th><th>Default</th><th>Target</th><th>Daily</th><th>Max DD</th><th>Split</th><th>NQ</th><th>Payout</th>
    </tr></thead><tbody>
      {coreFirms.map(f=>{
        const p=defaultProgram(f);
        return <tr key={f.id}><td className="gp-matrix-name">{f.name}</td><td>{money(f.price)}</td><td>{f.plan}</td><td>{p.target}</td><td>{p.daily}</td><td>{p.drawdown}</td><td>{p.split}</td><td>{f.indexLev?f.indexLev+"x":"—"}</td><td>{p.payout}</td></tr>;
      })}
    </tbody></table></div>
  </details>;
}

function LeaderboardLanding(){
  return <section className="gp-leaderboard-landing" aria-labelledby="gp-leaderboard-title">
    <a className="gp-leaderboard-stage" href="#leaderboard" aria-label="Open the MASSIVE trader leaderboard">
      <div className="gp-leaderboard-glow" aria-hidden="true"/>
      <div className="gp-leaderboard-copy">
        <span className="gp-leaderboard-kicker">MASSIVE / TRADER LEAGUE</span>
        <h2 id="gp-leaderboard-title">Names worth <strong>knowing.</strong></h2>
        <p>Public onchain payouts, ranked across Vest, Breakout, Hypernova and Propr. Quarterly seasons plus a live Weekly Top 20.</p>
        <span className="gp-leaderboard-cta">Enter the leaderboard <ArrowUpRight size={17}/></span>
      </div>
      <div className="gp-leaderboard-podium" aria-hidden="true">
        <div className="gp-home-rank gp-home-rank-2"><span>02</span><small>SECOND</small></div>
        <div className="gp-home-rank gp-home-rank-1"><span>01</span><small>THE BOARD</small><b>MASSIVE.</b></div>
        <div className="gp-home-rank gp-home-rank-3"><span>03</span><small>THIRD</small></div>
      </div>
      <div className="gp-leaderboard-meta">
        <span><b>SEASON</b> Quarterly standings</span>
        <i/>
        <span><b>WEEKLY</b> Top 20</span>
        <i/>
        <span><b>EVIDENCE</b> Public payouts</span>
      </div>
    </a>
  </section>;
}


export default function Web3Hub(){
  const [detailId,setDetailId]=useState(null);

  const [sort,setSort]=useState("signal");
  const [nqPrice,setNqPrice]=useState(NQ_REFERENCE);
  const asset="indices";

  const visibleFirms=useMemo(()=>{
    let list=[...coreFirms];
    if(sort==="entry") list.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
    if(sort==="leverage") list.sort((a,b)=>(b.indexLev||0)-(a.indexLev||0));
    if(sort==="dd") list.sort((a,b)=>(pctNumber(b.drawdown)||0)-(pctNumber(a.drawdown)||0));
    return list;
  },[sort]);

  const feeRows=useMemo(()=>coreFirms.map(f=>{
    const fee=takerFees[asset][f.id] ?? null;
    const leverage=marketLeverage[f.id]?.[asset] ?? null;
    return {...f,fee,marketLev:leverage,...executionMetrics(fee,leverage,OUTCOME_TARGET)};
  }).sort((a,b)=>{
    if(a.requiredMove==null && b.requiredMove==null) return a.name.localeCompare(b.name);
    if(a.requiredMove==null) return 1;
    if(b.requiredMove==null) return -1;
    return a.requiredMove-b.requiredMove;
  }),[asset]);
  const rankedRows=feeRows.filter(f=>f.requiredMove!=null);
  const leader=rankedRows[0], slowest=rankedRows.at(-1);
  const travelRatio=leader && slowest ? slowest.requiredMove/leader.requiredMove : null;

  const detailFirm=coreFirms.find(f=>f.id===detailId);

  function openFirm(id){
    setDetailId(id);
  }

  return <main className="gp-site gp-home-theme" id="top">
    <header className="gp-nav">
      <a className="gp-wordmark" href="#top">MASSIVE<span>.</span></a>
      <nav className="gp-nav-links">
        <a href="#leaderboard">Leaderboard</a><a href="#field">Reviews</a><a href="#drops">Free drops</a>
      </nav>
    </header>

    <SpeedManifesto about={<AboutPopover />} firms={coreFirms} onOpen={openFirm}/>

    <LeaderboardLanding />


    <section className="firm-deck-section" id="field">
      <div className="firm-deck-header">
        <div>
          <span className="gp-section-no">01</span>
          <div><h2>The shortlist</h2><p>Five firms. Different strengths. Real trade-offs.</p></div>
        </div>
        <label className="firm-sort-select">Sort <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort firms"><option value="signal">My picks</option><option value="entry">Entry price</option><option value="leverage">NQ leverage</option><option value="dd">Drawdown</option></select></label>
      </div>

      <div className="review-list">
        {visibleFirms.map((firm,index)=><FirmCard key={firm.id} firm={firm} index={index} onOpen={openFirm}/>)}
      </div>

      <FundedNextBonus />
      <p className="review-disclosure">Some links and codes are referrals. Massive may earn a commission if you sign up. Prices shown are for the default 25K program; offers and terms can change.</p>
      <CompactMatrix />
    </section>

    <section className="gp-degen-section" id="degen">
      <div className="gp-section-head gp-velocity-head">
        <div><span className="gp-section-no">02</span><div><h2>Same target. Different distance.</h2><p className="gp-section-note">True R velocity / NQ · 10% net target · 3% net risk</p></div></div>
        <div className="gp-degen-controls">
          <label className="gp-nq-input">NQ reference <input type="number" inputMode="decimal" min="1" max="1000000" step="100" value={nqPrice} onChange={e=>{const value=e.target.value;if(value===""||(Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<=1000000))setNqPrice(value);}} aria-label="NQ reference price" /></label>
          <span className="gp-taker-label">Taker fees · entry + exit</span>

        </div>
      </div>

      {leader && <div className="gp-outcome-story">
        <div><span className="gp-eyebrow">NQ AT {Number(nqPrice)>0?Number(nqPrice).toLocaleString("en-US"):"—"} · +{OUTCOME_TARGET}% NET WINNER</span><h3>{leader.name}: <em>{Number(nqPrice)>0?points(nqPrice*leader.requiredMove/100):"—"} points</em>.<br/>{slowest.name}: {Number(nqPrice)>0?points(nqPrice*slowest.requiredMove/100):"—"} points.</h3></div>
        <div className="gp-outcome-ratio"><strong>{travelRatio.toFixed(1)}×</strong><span>the NQ point distance at {slowest.name}</span><small>Same 10% net account gain. This is price distance, not elapsed time.</small></div>
      </div>}
      <div className="gp-fee-board gp-outcome-board">
        <div className="gp-fee-board-head">
          <div><span>FIRM / LEVERAGE</span><strong>NQ · full equity position</strong></div>
          <div><span>REACH</span><strong>Less distance = longer bar</strong></div>
          <div><span>FEES / 3% STOP</span><strong>Equity cost / NQ points</strong></div>
          <div><span>+{OUTCOME_TARGET}% NET WIN</span><strong>NQ points</strong></div>
        </div>
        {feeRows.map((f,index)=><div className={"gp-fee-row gp-fee-row-v2"+(index===0 && f.reach!=null?" is-velocity-leader":"")} key={f.id}>
          <div className="gp-fee-name">
            <span className="gp-fee-rank">{f.reach==null?"—":String(index+1).padStart(2,"0")}</span>
            <FirmLogo firm={f}/>
            <span><b>{f.name}</b><small>{f.marketLev?f.marketLev+"× "+marketProfiles[asset].label:"Not listed"}</small></span>
          </div>
          <div className="gp-outcome-reach">
            <div className="gp-rbar" aria-label={f.requiredMove==null?"Market unavailable":percent(f.requiredMove)+" market move needed for a net "+OUTCOME_TARGET+"% account gain"}><div className="gp-rbar-fill" style={{width:f.reach==null?"0%":(f.reach/leader.reach*100)+"%"}}/></div>
            <small>{percent(f.requiredMove)} market move · {f.payout}</small>
          </div>
          <div className="gp-fee-number"><b>{percent(f.feeDrag)}</b><small>{f.stopMove==null?"Fee exceeds 3% risk":Number(nqPrice)>0?points(nqPrice*f.stopMove/100)+" pt stop":"— pt stop"}</small></div>
          <div className="gp-fee-cash"><b>{f.requiredMove==null||Number(nqPrice)<=0?"—":points(nqPrice*f.requiredMove/100)}</b><small>pt win · 10% net</small></div>
        </div>)}
      </div>
      <details className="gp-model-note"><summary>Calculation & assumptions</summary><p>Illustrative full-equity position at each firm’s listed NQ leverage. Round-trip fee drag (% of equity) = 2 × taker fee (% of notional) × leverage. Win distance (% of NQ) = (10% net target + fee drag) ÷ leverage. Stop distance (% of NQ) = (3% net risk − fee drag) ÷ leverage. Multiply either distance by the NQ reference price for points. For Vest: 0.0025% taker per side × 2 × 50 = 0.25% equity in fees; (10 + 0.25) ÷ 50 = 0.205% of NQ. Vanta: 10 ÷ 2.5 = 4%. Their win-distance ratio is 4 ÷ 0.205 = 19.5×.</p><p>These are the site’s September 2026 scenario inputs, not live quotes. The fee drag is weighted by position size through leverage; the 19.5× compares NQ point distance, not time, win probability, or trading edge. It assumes constant notional and the same fee on entry and exit. Spreads, slippage, funding, profit split, and payout rules are excluded. If costs exceed the 3% risk budget, no valid stop remains.</p><p>Vanta uses base leverage without boosts or Pro. Account limits and notional caps may restrict full-equity positions. Check current contract prices and firm rules before purchasing.</p></details>
    </section>

    <FreeDrops />
    <footer className="gp-footer"><a className="gp-wordmark" href="#top">MASSIVE<span>.</span></a><p>Trader-led comparisons. October 2026 data snapshot.</p><a href="#top">Back to top ↑</a></footer>

    {detailFirm && <FirmDrawer key={detailFirm.id} firm={detailFirm} onClose={()=>setDetailId(null)}/>}
  </main>;
}
