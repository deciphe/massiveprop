import MoonLoader from '../design/MoonLoader';
import FlowHeatmap from './FlowHeatmap';
import PayoutLeaders from './PayoutLeaders';
import {transferInfrastructure,bridgeRoutes,isPayoutRecipientTransfer} from '../../lib/flow-classification.js';
import ProprPulse from '../web3/ProprPulse';
import {isListedProprPayout} from '../../lib/propr-payouts.js';
import NovaPass from '../web3/NovaPass';
import DataFreshness from '../shared/DataFreshness';
import {FLOW_CONFIGS,VEST_CHAINS,NOVA_WALLETS} from '../../lib/flow-config.js';
import {sortTransfers,combineFlows} from '../../lib/flow-metrics.js';
import {Fragment,useEffect,useMemo,useState,useRef} from 'react';
import {ArrowDownLeft,ArrowUpRight,RefreshCw,ExternalLink,Copy,Check,Pause,Play,Activity} from 'lucide-react';
import './vestflow.css';
import FirmAtmosphere,{firmMark} from '../design/FirmAtmosphere';
import '../design/collector-surfaces.css';
const money=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
const compact=n=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
const short=a=>a.slice(0,6)+'…'+a.slice(-4);
function FlowScene({data,summary,onSelect,selected,paused,config,days}) {
 const {wallet:WALLET,explorer:EXPLORER}=config;
 const groups=useMemo(()=>{
  return ['in','out'].map(direction=>{
   if(config.id==='vest'&&direction==='in')return (config.sources||[config]).map(source=>({address:source.wallet}));
   const map=new Map();
   for(const t of summary?.rows||[]){if(t.direction!==direction)continue;const address=direction==='in'?t.from:t.to;const item=map.get(address)||{address,total:0,count:0,direction};item.total+=t.amount;item.count++;map.set(address,item);}
   const ranked=[...map.values()].sort((a,b)=>b.total-a.total);
   const top=ranked.slice(0,3);if(ranked.length>3)top.push({address:null,total:ranked.slice(3).reduce((a,b)=>a+b.total,0),count:ranked.slice(3).reduce((a,b)=>a+b.count,0),direction,others:ranked.length-3,excluded:ranked.slice(0,3).map(g=>g.address)});
   return top;
  });
 },[summary,config]);
 const total=(summary?.incoming||0)+(summary?.outgoing||0),share=total?(summary.incoming/total)*100:0;
 return <section className={'vf-network'+(paused?' is-paused':'')} aria-label="Wallet transfer flow map">
  <div className="vf-scene-grid" aria-hidden="true"/>
  <div className="vf-network-top"><span><Activity size={13}/> TRANSFER MAP</span><span>{config.chain.toUpperCase()} <i/> USDC</span></div>
  <div className="vf-flow-stage">
   <svg className="vf-connections" viewBox="0 0 1000 380" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="vf-in-path"><stop stopColor="rgb(var(--home-paper))" stopOpacity=".6"/><stop offset="1" stopColor="rgb(var(--home-paper))" stopOpacity=".1"/></linearGradient><linearGradient id="vf-out-path"><stop stopColor="rgb(var(--home-muted))" stopOpacity=".1"/><stop offset="1" stopColor="rgb(var(--home-muted))" stopOpacity=".6"/></linearGradient></defs>{groups.flatMap((group,side)=>group.map((g,i)=>{const y=config.id==='vest'?190-(group.length-1)*42+i*84:62+i*84;const path=side===0?`M 200 ${y} C 320 ${y}, 325 190, 405 190`:`M 595 190 C 675 190, 680 ${y}, 800 ${y}`;return <g key={side+'-'+i} className={'vf-wire '+(side?'out':'in')}><path d={path} className="vf-track"/><path d={path} className="vf-signal" style={{animationDelay:(-i*1.3)+'s',animationDuration:(5+i*.8)+'s'}}/></g>}))}</svg>
   {groups.map((group,side)=>config.id==='vest'&&side===0?<div className="vf-node-column in" key={side}><div className="vf-side-label">TRACKED WALLETS<span>{(config.sources||[config]).length} wallets</span></div>{(config.sources||[config]).map(source=>{const balance=config.sources?data?.walletBalances?.find(w=>w.key===source.chainKey)?.balance:data?.balance;const verified=data?.balanceSource==='rpc';return <a key={source.wallet} className="vf-node" href={source.explorer+'/address/'+source.wallet} target="_blank" rel="noreferrer" title={source.wallet}><span className="vf-node-dot"/><span className="vf-node-info"><span>{source.chain} · {short(source.wallet)}</span><strong>{verified&&Number.isFinite(balance)?compact(balance):'—'}<small> USDC</small></strong></span><ExternalLink size={12}/></a>})}</div>:<div className={'vf-node-column '+(side?'out':'in')} key={side}><div className="vf-side-label">{side?'DESTINATIONS':'FUNDING SOURCES'}<span>{group.reduce((a,g)=>a+(g.others||1),0)} wallets</span></div>{group.map((g,i)=><Fragment key={g.address||'others'}><button className={'vf-node'+(selected===g.address&&g.address?' selected':'')} onClick={()=>onSelect(g)} aria-label={`${g.address?short(g.address):g.others+' other wallets'}, ${money(g.total)} USDC ${side?'outgoing':'incoming'}`}><span className="vf-node-dot"/><span className="vf-node-info"><span>{g.address?short(g.address):`+${g.others} other wallets`}</span><strong>{compact(g.total)}<small> USDC</small></strong></span><span className="vf-node-count">{g.count}<small>TX</small></span></button></Fragment>)}{!group.length&&<div className="vf-node-empty">{data?'No transfers':'Reading chain…'}</div>}</div>)}
   <div className="vf-core"><svg viewBox="0 0 300 300" className="vf-orbits" aria-hidden="true"><circle cx="150" cy="150" r="145" className="vf-orbit-outer"/><circle cx="150" cy="150" r="133" className="vf-orbit-dashes"/><circle cx="150" cy="150" r="120" className="vf-ring-base"/><circle cx="150" cy="150" r="120" className="vf-ring-in" pathLength="100" strokeDasharray={`${share} ${100-share}`} transform="rotate(-90 150 150)"/><circle cx="150" cy="150" r="107" className="vf-orbit-inner"/></svg><div className="vf-core-copy"><span className="vf-core-symbol"><img src={firmMark(config.id)} alt=""/></span><span>{config.sources?'TRACKED WALLET BALANCE':config.walletRole?config.walletRole.toUpperCase()+' BALANCE':'HOT WALLET BALANCE'}</span><strong>{data&&(config.id!=='vest'||data.balanceSource==='rpc')?money(data.balance):'—'}</strong><small>USDC · not total firm funds</small>{config.id==='vest'&&<small>{data?.balanceSource==='rpc'?(Date.now()-Date.parse(data.balanceAsOf)>=900000?'Last verified balance · ':'Balance checked onchain · ')+new Date(data.balanceAsOf).toLocaleTimeString():'Awaiting onchain balance verification'}</small>}{config.sources?<small>{config.sources.length} tracked wallets</small>:<a href={`${EXPLORER}/address/${WALLET}`} target="_blank" rel="noreferrer">{short(WALLET)} <ExternalLink size={10}/></a>}</div></div>
  </div>
  <div className="vf-network-bottom"><span><i/> Wallet funding <b>{total?(share).toFixed(1):'0'}%</b></span><span>Outgoing <b>{total?(100-share).toFixed(1):'0'}%</b><i/></span></div>
 </section>;
}
function TransferStrip({rows,onInspect,active}){
 return <div className="vf-strip"><div className="vf-strip-label"><span>RECENT</span><b>Transfers</b></div><div className="vf-strip-scroll">{rows.slice(0,12).map(t=><button key={t.id} onClick={()=>onInspect(t)} className={'vf-ticket '+t.direction+(active?.id===t.id?' active':'')}><span>{t.direction==='in'?<ArrowDownLeft size={13}/>:<ArrowUpRight size={13}/>} {t.direction==='in'?'FUNDING IN':'SENT'}</span><strong>{t.direction==='in'?'+':'−'}{money(t.amount)}<small> USDC</small></strong><span>{short(t.direction==='in'?t.from:t.to)}<small>{new Date(t.timestamp).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</small></span></button>)}{!rows.length&&<span className="vf-empty-strip">No transfers in this selection</span>}</div></div>;
}
function WalletGlyph({address}){
 const bits=Array.from({length:15},(_,i)=>parseInt(address.slice(2+i,3+i),16)%2===0);
 return <span className="vf-glyph" aria-hidden="true">{Array.from({length:25},(_,i)=>{const x=i%5,y=Math.floor(i/5);return <i key={i} className={bits[y*3+(x>2?4-x:x)]?'on':''}/>;})}</span>;
}
function TransferGallery({rows,limit,direction,config}){
 const EXPLORER=config.explorer;
 const [expanded,setExpanded]=useState(null);
 useEffect(()=>setExpanded(null),[rows.map(t=>t.id).join('|')]);
 const incoming=rows.filter(t=>t.direction==='in'),outgoing=rows.filter(t=>t.direction==='out');
 const sum=items=>Number(items.reduce((n,t)=>n+BigInt(t.raw),0n))/1e6;
 const total=sum(rows),largest=Math.max(0,...rows.map(t=>t.amount));
 return <div className={'vf-transfer-gallery '+direction}>
  {rows.length>0&&<div className="vf-gallery-summary"><div className="vf-gallery-emblem">{direction==='in'?<ArrowDownLeft size={26}/>:direction==='out'?<ArrowUpRight size={26}/>:<Activity size={24}/>}</div><div className="vf-gallery-total"><span>{direction==='in'?'WALLET FUNDING':direction==='out'?'SENT':'TRANSFER VOLUME'}</span><strong>{money(total)} <small>USDC</small></strong></div><div className="vf-gallery-split"><span><i/>{incoming.length} funding transfers</span><span><i/>{outgoing.length} outgoing</span><div className="vf-gallery-ratio"><b style={{width:(total?sum(incoming)/total*100:0)+'%'}}/></div></div><div className="vf-gallery-note"><strong>{rows.length}</strong><span>transfers in this view</span></div></div>}
  <div className="vf-transfer-grid">{rows.slice(0,limit).map(t=>{
   const EXPLORER=t.explorer||config.explorer;const isIn=t.direction==='in',peer=isIn?t.from:t.to,open=expanded===t.id;
   return <article className={'vf-transfer-card '+t.direction+(open?' is-open':'')} key={t.id}>
    <button className="vf-transfer-face" aria-expanded={open} aria-label={`Inspect ${isIn?'incoming':'outgoing'} ${money(t.amount)} USDC transfer ${short(t.hash)}`} onClick={()=>setExpanded(open?null:t.id)}>
     <FirmAtmosphere firm={config.id}/><div className="vf-transfer-top"><span className="vf-transfer-badge">{isIn?<ArrowDownLeft size={13}/>:<ArrowUpRight size={13}/>} {isIn?'FUNDING IN':'OUTGOING'}</span><time dateTime={t.timestamp}>{new Date(t.timestamp).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div>
     {isListedProprPayout(t,config)&&<span className="pp-listed" title="Transaction and amount match Propr’s published payout ledger sample, Sep 29, 2026.">Listed payout · Propr</span>}
     {transferInfrastructure(t,config)&&<span className="pp-listed">{transferInfrastructure(t,config).label} · routing, not a verified payout</span>}
     <div className="vf-transfer-value"><span>{isIn?'+':'−'}</span>{money(t.amount)}<small>USDC</small></div>
     <div className="vf-transfer-route"><div className="vf-route-end">{isIn?<WalletGlyph address={peer}/>:<span className="vf-wallet-mark">{config.mark}</span>}<span>{isIn?short(peer):config.firm+' wallet'}<small>FROM</small></span></div><div className="vf-route-wire"><i/><b>›</b></div><div className="vf-route-end">{isIn?<span className="vf-wallet-mark">{config.mark}</span>:<WalletGlyph address={peer}/>}<span>{isIn?config.firm+' wallet':short(peer)}<small>TO</small></span></div></div>
     <div className="vf-transfer-bottom"><span>{t.chain?`${t.chain} · `:''}{short(t.hash)}</span><span>{open?'Close details':'Inspect transfer'} <b>{open?'−':'+'}</b></span></div>
     <div className="vf-transfer-scale" title="Amount relative to the largest transfer in this view"><i style={{width:(largest?t.amount/largest*100:0)+'%'}}/></div>
    </button>
    {open&&<div className="vf-transfer-details"><div><span>FROM</span><a href={`${EXPLORER}/address/${t.from}`} target="_blank" rel="noreferrer">{t.from}<ExternalLink size={12}/></a></div><div><span>TO</span><a href={`${EXPLORER}/address/${t.to}`} target="_blank" rel="noreferrer">{t.to}<ExternalLink size={12}/></a></div>{bridgeRoutes[t.hash?.toLowerCase()]&&<div><span>REQUESTED BRIDGE DESTINATION</span><a href={`${bridgeRoutes[t.hash.toLowerCase()].explorer}/address/${bridgeRoutes[t.hash.toLowerCase()].address}`} target="_blank" rel="noreferrer">{bridgeRoutes[t.hash.toLowerCase()].amount} USDC · {bridgeRoutes[t.hash.toLowerCase()].chain} · {short(bridgeRoutes[t.hash.toLowerCase()].address)} ↗</a><small>Bridge contract; ownership and destination settlement not confirmed.</small></div>}<div className="vf-transfer-meta"><span>Block {new Intl.NumberFormat().format(t.block)}</span><span>{new Date(t.timestamp).toLocaleString()}</span></div><a className="vf-transfer-explorer" href={`${EXPLORER}/tx/${t.hash}`} target="_blank" rel="noreferrer">View on {t.explorerName||config.explorerName} <ExternalLink size={13}/></a></div>}
   </article>;
  })}</div>
 </div>;
}
export default function Vestflow({firm="vest"}){
 const [chain,setChain]=useState('all');
 const config=firm==='nova'?(chain==='all'?{...FLOW_CONFIGS.nova,slug:'novaflow-all',chainKey:'all',sources:NOVA_WALLETS}:NOVA_WALLETS.find(c=>c.chainKey===chain)):firm==='vest'?(chain==='all'?{...FLOW_CONFIGS.vest,slug:'vestflow-all',chainKey:'all',chain:'All chains',sources:VEST_CHAINS}:VEST_CHAINS.find(c=>c.chainKey===chain)):FLOW_CONFIGS[firm];
 return <WalletFlow key={config.slug} firm={firm} config={config} onChain={setChain}/>;
}
function WalletFlow({firm,config,onChain}){
 const {wallet:WALLET,explorer:EXPLORER}=config;
 const SOURCE=`https://raw.githubusercontent.com/deciphe/massiveprop/vestflow-data/${config.slug}.json`;
 const [data,setData]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[days,setDays]=useState(7),[direction,setDirection]=useState('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(12),[copied,setCopied]=useState(false),[clock,setClock]=useState(Date.now()),[paused,setPaused]=useState(false),[inspected,setInspected]=useState(null),[bucket,setBucket]=useState(null),[excluded,setExcluded]=useState([]);
 const [sort,setSort]=useState('newest');
 const [flowIntro,setFlowIntro]=useState(true);
 useEffect(()=>{const timer=setTimeout(()=>setFlowIntro(false),2500);return()=>clearTimeout(timer)},[]);
 const refreshLock=useRef(false),controller=useRef(null),sourceSnapshots=useRef(null);
 async function refresh(){
  if(refreshLock.current)return;
  refreshLock.current=true;setBusy(true);setError('');
  controller.current=new AbortController();
  const signal=controller.current.signal;
  const adopt=snapshot=>setData(old=>!old||Date.parse(snapshot.updatedAt)>=Date.parse(old.updatedAt)?snapshot:old);
  const sources=config.sources||[config];
  const combine=snapshots=>config.sources?combineFlows(snapshots,sources):snapshots[0];
  try{
   const root='https://raw.githubusercontent.com/deciphe/massiveprop/vestflow-data/';
   const previous=await Promise.all(sources.map(async(source,i)=>{
    let best=sourceSnapshots.current?.[i]||null;
    for(const url of [root+source.slug+'.json','/data/'+source.slug+'.json']){
     try{
      const r=await fetch(url+'?t='+Math.floor(Date.now()/300000),{cache:'default',signal:AbortSignal.any([signal,AbortSignal.timeout(12000)])});
      if(!r.ok)continue;const d=await r.json();
      if(d.wallet!==source.wallet||d.token!==source.token||d.chain!==source.chain||!d.complete||!Array.isArray(d.transfers))continue;
      if(!best||Date.parse(d.updatedAt)>Date.parse(best.updatedAt)||Date.parse(d.balanceAsOf)>Date.parse(best.balanceAsOf||0))best=d;
      break;
     }catch{if(signal.aborted)break;}
    }
    return best;
   }));
   if(previous.every(Boolean)&&!signal.aborted){sourceSnapshots.current=previous;adopt(combine(previous));}
   if(!previous.every(Boolean)&&!signal.aborted)setError('Shared snapshot unavailable. Retaining the last available data.');
  }catch{if(!signal.aborted)setError('Snapshot refresh unavailable. Retaining the last available data.');}
  finally{if(!signal.aborted){setBusy(false);setClock(Date.now());}if(controller.current?.signal===signal)refreshLock.current=false;}
 }
 useEffect(()=>{refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},300000),tick=setInterval(()=>setClock(Date.now()),30000);const visible=()=>{if(document.visibilityState==='visible')refresh();};document.addEventListener('visibilitychange',visible);const title=document.title;document.title=config.title+' · MASSIVE';return()=>{controller.current?.abort();refreshLock.current=false;clearInterval(timer);clearInterval(tick);document.removeEventListener('visibilitychange',visible);document.title=title;};},[]);
 useEffect(()=>{setLimit(12);setInspected(null);},[days,direction,query,excluded,sort]);
 useEffect(()=>{setBucket(null);setExcluded([]);},[days]);
 const summary=useMemo(()=>{
  if(!data)return null;
  const end=Date.parse(data.windowEnd||data.updatedAt),start=Math.max(end-days*86400000,Date.parse(data.periodStart));
  const minIncomingRaw=BigInt(Math.round((config.minIncomingAmount||0)*1e6));
  const rows=data.transfers.filter(t=>Date.parse(t.timestamp)>=start&&Date.parse(t.timestamp)<=end&&t.direction!=='self'&&BigInt(t.raw)>=10000n&&(t.direction!=='in'||BigInt(t.raw)>=minIncomingRaw)&&(t.direction!=='out'||isPayoutRecipientTransfer(t,config.sources||[config])));
  const incoming=rows.filter(t=>t.direction==='in'),outgoing=rows.filter(t=>t.direction==='out');
  const sum=rs=>Number(rs.reduce((a,t)=>a+BigInt(t.raw),0n))/1e6;
  const count=days===1?24:days;
  const buckets=Array.from({length:count},(_,i)=>({start:start+(end-start)*i/count,in:0,out:0}));
  for(const t of rows){const i=Math.min(count-1,Math.floor((Date.parse(t.timestamp)-start)/(end-start)*count));if(i>=0)buckets[i][t.direction]+=t.amount;}
  return {rows,incoming:sum(incoming),outgoing:sum(outgoing),inCount:incoming.length,outCount:outgoing.length,recipients:new Set(outgoing.map(t=>t.to)).size,buckets};
 },[data,days,config]);
 const rows=useMemo(()=>{
  const filtered=summary?.rows.filter(t=>(direction==='all'||t.direction===direction)&&!excluded.includes(t.direction==='in'?t.from:t.to)&&[t.from,t.to,t.hash].some(v=>v.includes(query.trim().toLowerCase())))||[];
  return sortTransfers(filtered,sort);
 },[summary,direction,query,excluded,sort]);
 const age=data?Math.max(0,Math.floor((clock-Date.parse(data.updatedAt))/60000)):0,stale=age>10;
 const max=Math.max(1,...(summary?.buckets.flatMap(b=>[b.in,b.out])||[]));
 async function copy(){try{await navigator.clipboard.writeText(WALLET);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('Copy unavailable. The full wallet address is shown below.');}}
 return <main className={"vf vf-"+firm}>{flowIntro&&<MoonLoader label="Reading the flow"/>}
  <header className="vf-top"><a href="#" className="vf-brand">MASSIVE.</a><span>MASSIVE <i>/</i> ONCHAIN</span><a className="vf-back" href="#flow">All flow trackers <ArrowUpRight size={16}/></a></header>
  <nav className="vf-flow-nav" aria-label="Flow trackers"><a href="#leaderboard">Vest Top 20</a>{[FLOW_CONFIGS.vest].map(c=><a key={c.id} href={"#"+c.slug} aria-current={firm===c.id?"page":undefined}>{c.title}</a>)}</nav>
  <section className="vf-heading"><FirmAtmosphere firm={firm}/><div><h1>{config.id}<span>flow</span><i>.</i></h1></div><div className="vf-status"><span className={stale||error?'vf-warning':''}>{busy?'Syncing…':data?(stale?'Delayed · ':age===0?'Updated just now':'Updated ')+(age===0&&!stale?'':age+'m ago'):'Connecting…'}</span><button onClick={refresh} disabled={busy} aria-label="Refresh transfers" title="Read shared snapshot · collected every 5 minutes"><RefreshCw size={15} className={busy?'vf-spin':''}/></button></div></section>

  {firm==='nova'&&<NovaPass/>}
  {firm==='propr'&&<ProprPulse/>}
  <a className="vf-referral" href={config.referral} target="_blank" rel="noopener noreferrer sponsored" aria-label={config.cta+" with the MASSIVE referral link (opens in a new tab)"}>
   <span className="vf-referral-offer"><strong>{firm==='vest'?<>5% <span>OFF</span></>:<>{config.firm}</>}</strong><span className="vf-referral-copy"><b>Your next {config.firm} account.</b><small>{firm==='vest'?<>Code <strong>GIGA</strong> at checkout</>:<>MASSIVE referral</>}</small></span></span>
   <span className="vf-referral-cta">{config.cta}</span>
  </a>
  {['vest','nova'].includes(firm)&&<div className="vf-tabs" role="group" aria-label="Tracked wallet view" style={{display:'flex',gap:8,flexWrap:'wrap',margin:'0 0 18px'}}>{[{chainKey:'all',chain:firm==='nova'?'Combined':'All chains'},...(firm==='nova'?NOVA_WALLETS:VEST_CHAINS)].map(c=><button key={c.chainKey} type="button" aria-pressed={config.chainKey===c.chainKey} onClick={()=>onChain(c.chainKey)} style={{fontSize:14,padding:'9px 14px'}}>{c.walletRole||(c.chain==='Arbitrum One'?'Arbitrum':c.chain)}</button>)}</div>}
  {firm==='nova'&&<p style={{fontSize:12,color:'rgb(var(--home-muted))',margin:'-6px 0 18px'}}>Reserve + payout settlement only. Trading wallets excluded.{config.sources?' Transfers between these wallets are excluded from combined flow totals.':''}</p>}
  {firm==='nova'&&config.sources&&<section aria-label="Hypernova wallet balances" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12,marginBottom:24}}>{[...NOVA_WALLETS].reverse().map(source=>{const wallet=data?.walletBalances?.find(w=>w.key===source.chainKey);return <button key={source.chainKey} onClick={()=>onChain(source.chainKey)} style={{textAlign:'left',padding:'18px 14px',background:source.chainKey==='reserve'?'rgb(var(--home-panel))':'rgb(var(--home-panel))',borderColor:source.chainKey==='reserve'?'#a99ac033':'#a8c38a33',borderRadius:12,minWidth:0}}><span style={{display:'block',fontSize:13,color:source.chainKey==='reserve'?'rgb(var(--home-silver))':'rgb(var(--home-silver))'}}>{source.walletRole}</span><strong style={{display:'block',fontSize:'clamp(18px,3vw,30px)',fontWeight:500,letterSpacing:'-.04em',margin:'8px 0',overflowWrap:'anywhere'}}>{wallet?money(wallet.balance):'—'} <small style={{fontSize:11,fontWeight:400}}>USDC</small></strong><span style={{fontSize:12,color:'rgb(var(--home-muted))'}}>{source.chainKey==='reserve'?'Dedicated reserve wallet':'Payout hot wallet'}</span></button>;})}</section>}
  {error&&<p className="vf-alert" role="status">{error}</p>}
  {stale&&<p className="vf-alert">Snapshot delayed · {new Date(data.updatedAt).toLocaleString()}.</p>}
  <PayoutLeaders data={data} config={config}/>
  <FlowHeatmap data={data} config={config}/>
  <div className="vf-period"><div className="vf-view-label"><span className="vf-status-dot"/> TRANSFER FLOW <button className="vf-pause" onClick={()=>setPaused(v=>!v)} aria-label={paused?"Play flow animation":"Pause flow animation"}>{paused?<Play size={12}/>:<Pause size={12}/>}</button></div><div role="group" aria-label="Time range">{[1,7,30].map(n=><button key={n} onClick={()=>setDays(n)} aria-pressed={days===n}>{n===1?'24H':n+'D'}</button>)}</div></div>
  <FlowScene days={days} config={config} data={data} summary={summary} paused={paused} selected={query} onSelect={g=>{setQuery(g.address||'');setExcluded(g.excluded||[]);setDirection(g.direction);}}/>

  <DataFreshness asOf={data?.updatedAt} busy={busy} onRefresh={refresh}/>
 <section className="vf-stats"><article className="vf-in"><span><ArrowDownLeft size={16}/> Wallet funding</span><strong>{summary?'+'+money(summary.incoming):'—'}<small> USDC</small></strong><div className="vf-mini-bars" aria-hidden="true">{summary?.buckets.map((b,i)=><i key={i} style={{height:Math.max(2,b.in/max*27)+'px'}}/>)}</div><p>{summary?.inCount??'—'} funding transfers · top-ups & rebalancing</p></article><article className="vf-out"><span><ArrowUpRight size={16}/> Filtered outgoing · {days===1?'24H':days+'D'}</span><strong>{summary?'−'+money(summary.outgoing):'—'}<small> USDC</small></strong><div className="vf-mini-bars" aria-hidden="true">{summary?.buckets.map((b,i)=><i key={i} style={{height:Math.max(2,b.out/max*27)+'px'}}/>)}</div><p>{summary?.outCount??'—'} transfers · {summary?.recipients??'—'} recipients</p></article><article className="vf-net"><span>Filtered net flow</span><strong>{summary?(summary.incoming>=summary.outgoing?'+':'−')+money(Math.abs(summary.incoming-summary.outgoing)):'—'}<small> USDC</small></strong><div className="vf-ratio"><i style={{width:(summary?(summary.incoming/(summary.incoming+summary.outgoing||1)*100):0)+'%'}}/></div><p>Funding in minus filtered outflow · {days===1?'24 hours':days+' days'}</p></article></section>
  <section className="vf-chart-panel"><div className="vf-panel-head"><h2>Flow pulse <small>{days===1?"HOURLY":"DAILY"}</small></h2><div className="vf-legend"><span>Wallet funding</span><span>Outflow</span></div></div><div className="vf-chart" aria-label="USDC inflows and outflows by time bucket">{summary?summary.buckets.map((b,i)=><button type="button" className={"vf-bar-group"+(bucket===i?" is-selected":"")} key={i} onClick={()=>setBucket(bucket===i?null:i)} aria-label={`${new Date(b.start).toLocaleString(undefined,days===1?{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}:{month:'short',day:'numeric'})}: incoming ${money(b.in)}, outgoing ${money(b.out)} USDC`}><div className="vf-bar-up"><span style={{height:(b.in/max*100)+'%'}}/></div><div className="vf-bar-down"><span style={{height:(b.out/max*100)+'%'}}/></div><div className="vf-tooltip">{new Date(b.start).toLocaleString(undefined,days===1?{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}:{month:'short',day:'numeric'})}<br/>In +{compact(b.in)}<br/>Out −{compact(b.out)}</div></button>):<p className="vf-empty">{busy?'Loading onchain activity…':'Data currently unavailable. Try refresh.'}</p>}</div><div className="vf-chart-axis"><span>{summary?new Date(summary.buckets[0].start).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'—'}</span><span>{bucket!==null&&summary?.buckets[bucket]?`In +${money(summary.buckets[bucket].in)} / Out −${money(summary.buckets[bucket].out)}`:days===1?'24 hourly buckets · USDC':'Tap a bar to inspect · USDC'}</span><span>{data?new Date(data.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'—'}</span></div></section>
  {firm==='vest'&&['out','in'].map(side=>{const top=(summary?.rows||[]).filter(t=>t.direction===side).sort((a,b)=>b.amount-a.amount).slice(0,12);return <section className="vf-top-transfers" key={side}><div className="vf-panel-head"><h2>Top 12 {side==='in'?'incoming':'outgoing'}</h2><span className="vf-top-caption">{days===1?'24 HOURS':days+' DAYS'} · BY AMOUNT</span></div>{top.length?<TransferGallery rows={top} limit={12} direction={side} config={config}/>:<p className="vf-empty">{busy?'Reading snapshot…':'No transfers in this window.'}</p>}</section>})}
  {(config.sources||[config]).map(source=><div className="vf-wallet" key={source.slug} style={{marginBottom:8}}><span>{(source.walletRole||source.chain).toUpperCase()} WALLET</span><a href={`${source.explorer}/address/${source.wallet}#tokentxns`} target="_blank" rel="noreferrer">{source.wallet}</a>{!config.sources&&<button onClick={copy} aria-label="Copy wallet address">{copied?<Check size={15}/>:<Copy size={15}/>}</button>}</div>)}<footer className="vf-footer"><span>MASSIVE <b> / </b> {config.title.toUpperCase()}</span><p>USDC transfers on {config.chain} · Rolling 30-day history · Sources: {(config.sources||[config]).map((source,i)=><span key={source.slug}>{i>0?' · ':''}<a href={`${source.api.replace('/api/v2','')}/address/${source.wallet}`} target="_blank" rel="noreferrer">{source.chain} / Blockscout</a></span>)}.<br/>{firm==='nova'?'Reserve and payout settlement wallets':firm==='vest'?'Vest wallets and routing contracts':config.sources?'Tracked wallets':'One payout hot wallet'} selected by MASSIVE. Incoming transfers may fund or rebalance it; outgoing transfers may include payouts and other movements. Card payments and other wallets are outside this view. This balance is not the firm’s total reserves, and net flow is not profit or a measure of financial health. Independent tracker by MASSIVE. Referral links may earn a commission.</p>{data&&<small>Snapshot: {new Date(data.updatedAt).toLocaleString()}</small>}</footer>
 </main>;
}
