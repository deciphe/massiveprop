import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,ArrowLeft,ChevronDown,Radio} from 'lucide-react';
import './updates.css';

const categories=['All','Execution','Funding','Prop rules','Notices','Documentation'];
const stamp=d=>d?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'UNDATED';
const brief=x=>x.id==='inapp-stoploss-mid'?'Wider spreads alone are less likely to knock you out of a trade. Your actual exit can still slip.':x.id==='inapp-funding-index'?'Index-perp funding responds to price gaps over 48 hours, down from 120. Check funding before holding positions.':x.summary;
const impact=x=>x.id==='inapp-stoploss-mid'?'Fewer spread-only stop-outs. Not guaranteed fills.':x.id==='inapp-funding-index'?'Funding can shift faster. Either side can pay or receive it.':x.observed?'Review how this affects your trade.':null;
const headline=x=>x.id==='inapp-stoploss-mid'?['SPREAD','≠ STOP']:x.id==='inapp-funding-index'?['120H','→ 48H']:null;
function WireEntry({item,index,expanded,onToggle}){
 const headlineParts=headline(item);
 return <article className={'wire-item '+(index===0?'wire-lead ':'')+(item.observed?'wire-app':'wire-doc')} key={item.id}>
  <div className="wire-item-bar"><span className="wire-number">{String(index+1).padStart(2,'0')}</span><span>{item.category?.toUpperCase()||'NOTICE'}</span><span className="wire-kind">{item.observed?'IN-APP NOTICE':'DOC REVISION'}</span></div>
  {headlineParts?<div className="wire-bigtype" aria-label={headlineParts.join(' ')}><span>{headlineParts[0]}</span><span>{headlineParts[1]}</span></div>:<div className="wire-type-mark" aria-hidden="true">↗</div>}
  <div className="wire-content"><div className="wire-titleline"><h2>{item.title}</h2><span>{stamp(item.date)}</span></div><p className="wire-direct">{brief(item)}</p>{impact(item)&&<div className="wire-takeaway"><span>FOR TRADERS</span><strong>{impact(item)}</strong></div>}
   <div className="wire-actions"><button type="button" onClick={onToggle} aria-expanded={expanded}>DETAILS <ChevronDown size={13} className={expanded?'turned':''}/></button>{item.source&&<a href={item.source} target="_blank" rel="noopener noreferrer">SOURCE <ArrowUpRight size={14}/></a>}</div>
   {expanded&&<div className="wire-expanded">{item.originalText&&<p>{item.originalText}</p>}{(item.details||[]).map((line,i)=><p key={i}>{line}</p>)}</div>}
  </div>
 </article>;
}
export default function VestUpdates(){
 const [data,setData]=useState(null),[error,setError]=useState(false),[filter,setFilter]=useState('All'),[open,setOpen]=useState({});
 useEffect(()=>{let alive=true;fetch('/data/vest-updates.json?ts='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Unavailable');return r.json()}).then(d=>{if(alive)setData(d)}).catch(()=>{if(alive)setError(true)});return()=>{alive=false}},[]);
 const rows=useMemo(()=>data?.updates?.filter(x=>filter==='All'||x.category===filter)||[],[data,filter]);
 return <main className="wire-page"><header className="wire-nav"><a href="#" className="wire-logo">MASSIVE<span>.</span></a><a href="#leaderboard" className="wire-back"><ArrowLeft size={14}/> LEADERBOARD</a></header>
 <div className="wire-shell"><header className="wire-header"><div className="wire-masthead"><span><Radio size={14}/> MASSIVE / VEST</span><span>TRANSMISSION 001</span></div><div className="wire-title-row"><h1>VEST <em>WIRE.</em></h1><div className="wire-orbit" aria-hidden="true"><div className="wire-orbit-moon"/><i/><b/></div></div><div className="wire-feed-status"><span className="wire-beacon"/> PLATFORM CHANGES / TRADER IMPACT <span className="wire-last">LAST CHECK {stamp(data?.appCheckedAt||data?.checkedAt)}</span></div></header>
 <div className="wire-control-line"><span>THE FEED <b>{String(rows.length).padStart(2,'0')}</b></span><nav className="wire-filters" aria-label="Filter transmissions">{categories.map(c=><button type="button" key={c} className={filter===c?'active':''} onClick={()=>setFilter(c)}>{c}</button>)}</nav></div>
 <section className="wire-grid" aria-label="Vest Wire transmissions">{rows.map((item,i)=><WireEntry key={item.id} item={item} index={i} expanded={!!open[item.id]} onToggle={()=>setOpen(o=>({...o,[item.id]:!o[item.id]}))}/>)}{!data&&!error&&<p className="wire-empty">TUNING IN…</p>}{error&&<p className="wire-empty">THE FEED IS TEMPORARILY UNAVAILABLE.</p>}{data&&!rows.length&&<p className="wire-empty">NO TRANSMISSIONS IN THIS CATEGORY.</p>}</section>
 <footer className="wire-footer"><span>MASSIVE / VEST WIRE</span><span>IN-APP NOTICES + DOCUMENTATION CHANGES</span><a href="#">BACK TO MASSIVE ↗</a></footer></div></main>;
}
