import MoonLoader from '../design/MoonLoader';
import DataFreshness from '../shared/DataFreshness';
import FlowHeatmap from './FlowHeatmap';
import {useEffect,useState,useRef} from 'react';
import {ArrowUpRight,Copy,Check,ArrowLeft,RefreshCw} from 'lucide-react';
import './flow-hub.css';
import FirmAtmosphere from '../design/FirmAtmosphere';
import '../design/collector-surfaces.css';
import {FLOW_CONFIGS,VEST_CHAINS,NOVA_WALLETS} from '../../lib/flow-config.js';
import {combineFlows} from '../../lib/flow-metrics.js';
import {isPayoutRecipientTransfer} from '../../lib/flow-classification.js';
import {BRAND_ASSETS} from '../../lib/brand-assets.js';
const firms=[
 {id:'vest',name:'Vest',title:'vest',logo:BRAND_ASSETS.vest,route:'#vestflow',tag:'03 NETWORKS',description:'One view. Three chains.',detail:'Arbitrum · Base · Ethereum',color:'rgb(var(--home-silver))',points:'16,48 42,48 60,26 91,26 115,61 142,61 163,36 205,36 225,19 260,19'},
 {id:'breakout',name:'Breakout',title:'breakout',logo:BRAND_ASSETS.breakout,route:'#breakoutflow',tag:'ETHEREUM',description:'Follow the wallet activity.',detail:'USDC flow · recipient rankings',color:'rgb(var(--home-silver))',points:'16,59 40,59 66,38 90,38 113,49 144,49 171,24 203,24 223,36 260,36'},
 {id:'nova',name:'Hypernova',title:'nova',logo:BRAND_ASSETS.hypernova,route:'#novaflow',tag:'RESERVE + SETTLEMENT',description:'Two wallets. A wider picture.',detail:'Reserve split · NovaPulse · pass rates',color:'rgb(var(--home-silver))',points:'16,55 43,55 68,31 99,31 119,47 148,47 175,17 211,17 234,29 260,29'},
 {id:'propr',name:'Propr',title:'propr',logo:BRAND_ASSETS.propr,route:'#proprflow',tag:'FLOW + PROGRAM STATS',description:'From assessment to payout.',detail:'Propr Pulse · outcomes · payout timing',color:'rgb(var(--home-silver))',points:'16,60 45,60 66,43 96,43 122,24 153,24 175,38 210,38 236,15 260,15'},
];
const sourcesFor=id=>id==='vest'?VEST_CHAINS:id==='nova'?NOVA_WALLETS:[FLOW_CONFIGS[id]];
const dailyCash=n=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const cash=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(n);
function glance(snapshots,sources,days){
 if(!snapshots)return null;
 const data=sources.length>1?combineFlows(snapshots,sources):snapshots[0];
 const end=Date.parse(data.windowEnd||data.updatedAt),start=end-days*86400000;
 if(Date.parse(data.periodStart)>start+60000)return {balance:data.balance,updatedAt:data.updatedAt,outgoing:null};
 const outgoing=Number(data.transfers.filter(t=>Date.parse(t.timestamp)>=start&&Date.parse(t.timestamp)<=end&&isPayoutRecipientTransfer(t,sources)).reduce((sum,t)=>sum+BigInt(t.raw),0n))/1e6;
 return {balance:data.balance,outgoing,updatedAt:data.updatedAt};
}
export default function FlowHub(){
 const [days,setDays]=useState(7),[snapshots,setSnapshots]=useState({});
 const [busy,setBusy]=useState(false),[errors,setErrors]=useState({}),[clock,setClock]=useState(Date.now()),[flowIntro,setFlowIntro]=useState(true);
 const refreshRef=useRef(()=>{});
 useEffect(()=>{const timer=setTimeout(()=>setFlowIntro(false),2500);return()=>clearTimeout(timer)},[]);
 useEffect(()=>{
  const controller=new AbortController();let running=false;const memory={};
  async function fetchSource(source){
   let fallback=null;
   for(const url of [`https://raw.githubusercontent.com/deciphe/massiveprop/vestflow-data/${source.slug}.json`,`/data/${source.slug}.json`]){
    try{const response=await fetch(url+'?t='+Math.floor(Date.now()/300000),{cache:'default',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});if(!response.ok)continue;const d=await response.json();if(d.complete&&d.wallet?.toLowerCase()===source.wallet.toLowerCase()&&d.token?.toLowerCase()===source.token.toLowerCase()&&d.chain===source.chain&&Array.isArray(d.transfers)&&(source.id!=='vest'||Number.isFinite(d.balance))&&Number.isFinite(Date.parse(d.updatedAt))){fallback=d;break;}}catch{if(controller.signal.aborted)return null;}
   }
   return fallback;
  }
  async function refresh(){
   if(running||controller.signal.aborted)return;running=true;setBusy(true);
   try{const liveResults=await Promise.all(firms.map(async firm=>{
    const sources=sourcesFor(firm.id);
    const loaded=await Promise.all(sources.map(fetchSource));
    const ds=loaded.map((d,i)=>{const old=memory[firm.id]?.[i];return d&&(!old||Date.parse(d.updatedAt)>=Date.parse(old.updatedAt))?d:old||null;});
    if(controller.signal.aborted)return;
    const complete=ds.every(Boolean);
    if(complete){memory[firm.id]=ds;setSnapshots(old=>({...old,[firm.id]:ds}));}
    setErrors(old=>({...old,[firm.id]:!complete}));
    return complete;

   }));}finally{running=false;if(!controller.signal.aborted){setBusy(false);setClock(Date.now());}}
  }
  refreshRef.current=refresh;refresh();
  const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},300000);
  const ticker=setInterval(()=>setClock(Date.now()),60000);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',visible);
  return()=>{controller.abort();clearInterval(timer);clearInterval(ticker);document.removeEventListener('visibilitychange',visible);refreshRef.current=()=>{};};
 },[]);
 const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
 useEffect(()=>{const old=document.title;document.title='Flow · MASSIVE';return()=>{document.title=old;};},[]);
 async function copy(){try{await navigator.clipboard.writeText('https://massiveprop.xyz/#flow');setCopied(true);setCopyError(false);}catch{setCopyError(true);}}
 return <main className="fh">{flowIntro&&<MoonLoader label="Opening the vault"/>}<div className="fh-shell"><header className="fh-nav"><a href="#" className="fh-brand">MASSIVE<span>.</span></a><a href="#leaderboard">Vest Top 20 <ArrowUpRight size={12}/></a></header>
 <section className="fh-intro"><h1>Follow the <em>flow.</em></h1><p>24-hour payout checks across four firms.</p><div className="fh-share"><button onClick={copy}>{copied?<Check size={13}/>:<Copy size={13}/>} {copied?'Link copied':'massiveprop.xyz/#flow'}</button><span aria-live="polite">{copyError?'Copy this link from your address bar.':''}</span></div></section>
 <div className="fh-glance-controls"><span>Vest history · USDC</span><button className="fh-refresh" onClick={()=>refreshRef.current()} disabled={busy} title="Read the shared five-minute snapshots" aria-label="Refresh all firm snapshots"><RefreshCw size={12} className={busy?'fh-spin':''}/>{busy?'Loading…':'Read latest'}</button><div role="group" aria-label="Outflow period">{[7,30].map(n=><button key={n} aria-pressed={days===n} onClick={()=>setDays(n)}>{n}D</button>)}</div></div>

 <section className="fh-grid" aria-label="Choose a firm tracker">{firms.map((f,i)=>{const sources=sourcesFor(f.id),ds=snapshots[f.id],heatData=ds?(sources.length>1?combineFlows(ds,sources):ds[0]):null;const stats=glance(ds,sources,days),daily=glance(ds,sources,1);return <a key={f.id} className="fh-card" href={f.id==='vest'?'#vestflow':undefined} style={{'--firm-color':f.color}}><FirmAtmosphere firm={f.id}/><span className="fh-card-serial" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><div className="fh-card-top"><span className="fh-logo"><img src={f.logo} alt=""/></span><ArrowUpRight size={20}/></div><div className="fh-card-main"><h2>{f.title}<span>flow</span><i>.</i></h2></div><div className={'fh-daily'+(daily?.outgoing===0?' fh-daily-zero':'')} title="Filtered USDC outflow during the last 24 hours of this snapshot"><div><span>24H PAYOUT FLOW</span><strong>{daily?.outgoing!=null?'+'+dailyCash(daily.outgoing):'—'}<small>USDC</small></strong></div><ArrowUpRight size={25} aria-hidden="true"/></div><div className="fh-glance">{f.id==='vest'&&<><div><em>tracked balance</em><strong>{stats?cash(stats.balance):'—'}</strong></div><div><em>{days}d outflow</em><strong>{stats?.outgoing!=null?cash(stats.outgoing):'—'}</strong></div></>}<DataFreshness compact asOf={daily?.updatedAt}/>{errors[f.id]&&<small>Saved snapshot unavailable</small>}</div>{f.id==='vest'&&<FlowHeatmap compact data={heatData} config={{...FLOW_CONFIGS[f.id],sources}}/>}<div className="fh-card-foot"><span>{f.id==='vest'?f.detail:'USDC · last 24 hours'}</span>{f.id==='vest'&&<b>Explore <ArrowUpRight size={12}/></b>}</div></a>;})}</section>
 <footer className="fh-footer"><p>Outflow excludes known internal wallets and identified bridges; it is not verified trader payouts. Tracked USDC wallet activity, not a firm’s complete financial position. Program metrics are dated, firm-reported snapshots.</p><a href="#">Independent tracking by MASSIVE ↗</a></footer></div></main>;
}
