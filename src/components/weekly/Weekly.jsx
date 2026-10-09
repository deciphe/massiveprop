import MoonLoader from '../design/MoonLoader';
import FlatPodium,{RankMovement} from '../design/FlatPodium';
import MoonAvatar from '../design/MoonAvatar';
import {canonicalTraderWallet,traderWallets} from '../../lib/trader-wallets.js';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,ArrowLeft,Download,ShieldCheck,Wallet,Search,X,RefreshCw,ChevronRight,Copy,Check} from 'lucide-react';
import DataFreshness from '../shared/DataFreshness';
import {WEEK,WEEKLY_FIRMS as TRACKED_FIRMS,rankWeekly,validSnapshot,weeklySources,weekStart as calendarWeekStart,weeklyBoard as calendarWeeklyBoard} from '../../lib/weekly-leaderboard.js';
import {SEASON_ONE,seasonDuration,seasonStart as weekStart,seasonKey as weekKey,seasonNumber,validSeasonKey,seasonBoard as weeklyBoard} from '../../lib/season-leaderboard.js';
import {FEATURED_TRADERS} from '../../lib/trader-profiles.js';
import WeeklyPoster,{range} from './WeeklyPoster';
import WeeklyAwards from './WeeklyAwards';
import {validWeeklyKey,validWeeklyEdition,weeklyAwardsUnlocked} from '../../lib/weekly-awards.js';
import './weekly.css';
import './frequent-withdrawer.css';
import './profile-submission.css';
import './vest-league-offer.css';
import './daily-changes.css';
import {rankSeasonChanges} from '../../lib/season-changes.js';
import {BRAND_ASSETS} from '../../lib/brand-assets.js';

const WEEKLY_FIRMS=TRACKED_FIRMS.filter(f=>f.id==='vest');
const ROOT='https://raw.githubusercontent.com/deciphe/massiveprop/vestflow-data/';
const API='https://gigaprop-profiles.johnhuska1260335.chatgpt.site/api';
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const short=a=>a.slice(0,6)+'…'+a.slice(-4);
const weekRange=s=>new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})+' — '+new Date(s+WEEK-1).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
function initial(){const p=new URLSearchParams(window.location.hash.split('?')[1]||'');const w=p.get('season')||p.get('week');return {week:w&&validSeasonKey(w)?w:weekKey(weekStart()),view:p.get('view')==='weekly'?'weekly':'season',wallet:canonicalTraderWallet(p.get('wallet')),firm:'vest',card:p.get('card')||''};}
async function read(path,signal){for(const root of [ROOT,'/data/']){try{const r=await fetch(root+path+'?t='+Math.floor(Date.now()/300000),{signal:AbortSignal.any([signal,AbortSignal.timeout(8000)].filter(Boolean)),cache:'default'});if(r.ok)return await r.json();}catch{if(signal?.aborted)throw Error('Cancelled');}}throw Error('Snapshot unavailable');}
async function posterFonts(node){
 const chars=[...new Set(node.textContent)].sort().join('');
 const response=await fetch('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap&text='+encodeURIComponent(chars));
 if(!response.ok)throw Error('Fonts unavailable');
 let css=await response.text();
 const urls=[...new Set([...css.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1].replace(/["']/g,'')))];
 await Promise.all(urls.map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('Font unavailable');const blob=await r.blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});css=css.split(url).join(data)}));
 return css;
}
function Badges({firms}){return <span className="wk-badges">{WEEKLY_FIRMS.filter(f=>firms[f.id]).map(f=><span key={f.id} title={f.name+' · '+usd(firms[f.id])}><img src={f.logo} alt=""/>{f.name}</span>)}</span>}
const tagHref=profile=>profile?.tag&&/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(profile.tag)?'https://'+profile.tag:null;
function TraderTag({profile,compact=false}){const href=tagHref(profile);if(!profile?.tag)return null;return href?<a className={'wk-trader-tag wk-tag-link'+(compact?' wk-tag-compact':'')} href={href} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} aria-label={'Visit '+profile.tag}><span>{profile.tag}</span><ArrowUpRight size={compact?10:13}/></a>:<span className={'wk-trader-tag'+(compact?' wk-tag-compact':'')}>{profile.tag}</span>}
function Spark({row,start,duration}){let total=0;const data=[...row.transfers].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));let line='0,46';for(const t of data){const x=(Date.parse(t.timestamp)-start)/duration*180;line+=` ${x},${46-total/row.total*40}`;total+=t.amount;line+=` ${x},${46-total/row.total*40}`;}return <svg viewBox="0 0 180 52" aria-hidden="true"><polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>}
function DailyChange({row}){
 const label=!row.changeAvailable?'—':row.isNew?'NEW':row.rankChange>0?'↑'+row.rankChange:row.rankChange<0?'↓'+Math.abs(row.rankChange):'—';
 const tone=row.isNew||row.rankChange>0?'up':row.rankChange<0?'down':'flat';
 const detail=!row.changeAvailable?'A full 24 hours of this season is not available yet':row.isNew?'No eligible season payouts at the previous cutoff':'Rank #'+row.previousRank+' → #'+row.rank+' over 24 hours';
 return <span className="wk-daily"><span className={'wk-daily-cash '+(row.received24h===0?'wk-daily-zero':'')} title="Eligible USDC received in the 24 hours ending at the displayed data cutoff">+{usd(row.received24h)} <em>USDC · 24h</em></span><span className={'wk-daily-rank wk-daily-'+tone} title={detail} aria-label={detail}>{label} <em>rank · 24h</em></span></span>;
}
export function PodiumCard({row,profiles,onSelect}){return <FlatPodium row={row} profile={profiles[row.address]} onSelect={onSelect}/>}
export default function Weekly(){
 const [route]=useState(initial),[week,setWeek]=useState(route.week),[view,setView]=useState(route.view),[firm,setFirm]=useState(route.firm),[snapshots,setSnapshots]=useState(null),[edition,setEdition]=useState(null),[weeks,setWeeks]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[selected,setSelected]=useState(route.wallet),[profiles,setProfiles]=useState(FEATURED_TRADERS),[claim,setClaim]=useState(null),[poster,setPoster]=useState(null),[exporting,setExporting]=useState(false),[copied,setCopied]=useState(false),[history,setHistory]=useState(null);
 const [weeklyChoice,setWeeklyChoice]=useState(()=>{const k=new URLSearchParams(window.location.hash.split('?')[1]||'').get('weekly');return validWeeklyKey(k)?k:''}),[weeklyEditions,setWeeklyEditions]=useState([]),[weeklyArchive,setWeeklyArchive]=useState(null),[archiveOpen,setArchiveOpen]=useState(false),[archiveError,setArchiveError]=useState(''),[clock,setClock]=useState(Date.now()),[rankIntro,setRankIntro]=useState(true);
 const specialRow=route.card==='yush-overall'?{address:'0x701903615450b87e9ced7941abcb9dde54a69531',addresses:['0x701903615450b87e9ced7941abcb9dde54a69531'],raw:'85756732929',count:3,firms:{vest:85756.732929},transfers:[{id:'yush-3',raw:'62961827026',amount:62961.827026,timestamp:'2026-09-29T20:48:27.000Z',firm:'vest',chain:'Base',to:'0x701903615450b87e9ced7941abcb9dde54a69531'},{id:'yush-2',raw:'1138089427',amount:1138.089427,timestamp:'2026-09-28T13:34:35.000Z',firm:'vest',chain:'Base',to:'0x701903615450b87e9ced7941abcb9dde54a69531'},{id:'yush-1',raw:'21656816476',amount:21656.816476,timestamp:'2026-09-26T12:49:21.000Z',firm:'vest',chain:'Base',to:'0x701903615450b87e9ced7941abcb9dde54a69531'}],largest:62961.827026,rank:3,total:85756.732929,changeAvailable:false,received24h:0}:null;
 useEffect(()=>{const sync=()=>{const next=initial();setWeek(next.week);setView(next.view);setSelected(next.wallet);};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
 const posterRef=useRef(null),dialog=useRef(null),refresh=useRef(()=>{});
 const seasonStart=Date.parse(week+'T00:00:00Z'),currentWeekStart=calendarWeekStart(clock),selectedWeekStart=weeklyChoice?Date.parse(weeklyChoice+'T00:00:00Z'):currentWeekStart,selectedWeekKey=new Date(selectedWeekStart).toISOString().slice(0,10),isPastWeek=selectedWeekStart<currentWeekStart,start=view==='weekly'?selectedWeekStart:seasonStart,live=view==='weekly'?!isPastWeek:week===weekKey(weekStart());
 useEffect(()=>{const timer=setTimeout(()=>setRankIntro(false),2500);return()=>clearTimeout(timer)},[]);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(timer)},[]);

 useEffect(()=>{if(view!=='weekly')return;const c=new AbortController();read('weekly-index.json',c.signal).then(d=>{if(!c.signal.aborted)setWeeklyEditions((d.weeks||[]).filter(w=>validWeeklyKey(w.week)&&w.closed))}).catch(()=>{});return()=>c.abort()},[view,currentWeekStart,snapshots]);
 useEffect(()=>{setWeeklyArchive(null);setArchiveError('');if(view!=='weekly'||!isPastWeek)return;const c=new AbortController();read('weekly/'+selectedWeekKey+'.json',c.signal).then(d=>{if(!validWeeklyEdition(d,selectedWeekKey))throw Error();if(!c.signal.aborted)setWeeklyArchive(d)}).catch(()=>{if(!c.signal.aborted)setArchiveError('This weekly edition is not available yet. Try again after the next payout refresh.')});return()=>c.abort()},[view,selectedWeekKey,isPastWeek,snapshots]);
 useEffect(()=>{const title=document.title;document.title=(view==='weekly'?'Weekly Top 20':'Vest Top 20')+' · MASSIVE Trader Rankings';return()=>{document.title=title}},[firm,view]);
 useEffect(()=>{const c=new AbortController();let running=false,previous={};const sources=weeklySources(firm);
 setSnapshots(null);
 async function run(){if(running)return;running=true;setBusy(true);
 try{
  const cached=await Promise.all(sources.map(async source=>{const old=previous[source.slug];try{const d=await read(source.slug+'.json',c.signal);return validSnapshot(d,source)&&(!old||Date.parse(d.windowEnd||d.updatedAt)>Date.parse(old.windowEnd||old.updatedAt))?d:old||null}catch{return old||null}}));
  if(c.signal.aborted)return;
  previous=Object.fromEntries(sources.map((s,i)=>[s.slug,cached[i]]));
  if(cached.every(Boolean))setSnapshots(previous);
  if(cached.every(Boolean)){setError('');}else if(!c.signal.aborted)setError('Shared snapshot unavailable. Keeping the last complete payout record.');
 }catch{if(!c.signal.aborted)setError('Live refresh unavailable. Showing the last complete payout record.');}
 finally{running=false;if(!c.signal.aborted)setBusy(false);}}
 read('season-index.json',c.signal).then(index=>{if(!c.signal.aborted)setWeeks((index.weeks||[]).filter(w=>validSeasonKey(w.week)))}).catch(()=>{});
 refresh.current=run;run();const onVisible=()=>{if(document.visibilityState==='visible')run()};document.addEventListener('visibilitychange',onVisible);const timer=setInterval(onVisible,300000);return()=>{c.abort();clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)};
 },[firm]);
 useEffect(()=>{setEdition(previous=>previous?.week===week?previous:null);const c=new AbortController();read('seasons/'+week+'.json',AbortSignal.any([c.signal,AbortSignal.timeout(15000)])).then(d=>{if(d.available&&d.week===week&&!c.signal.aborted)setEdition(previous=>previous?.week===week&&Date.parse(previous.asOf)>Date.parse(d.asOf)?previous:d)}).catch(()=>{});return()=>c.abort()},[week,snapshots]);
 const computed=useMemo(()=>{
  if(!snapshots)return null;
  if(view==='weekly')return isPastWeek?null:calendarWeeklyBoard(snapshots,selectedWeekStart,clock,WEEK,firm,{live:true});
  return Number.isFinite(seasonStart)?weeklyBoard(snapshots,seasonStart,Date.now(),edition,firm,{live:true}):null;
 },[snapshots,view,selectedWeekStart,isPastWeek,clock,seasonStart,edition,firm]);
 const board=view==='weekly'?(isPastWeek?(weeklyArchive?.week===selectedWeekKey?weeklyArchive:null):(computed?.available?computed:null)):edition?.closed?edition:computed?.available&&(!edition||Date.parse(computed.asOf)>=Date.parse(edition.asOf))?computed:edition;
 const awardsUnlocked=view==='weekly'&&weeklyAwardsUnlocked(board,clock);
 const ranked=useMemo(()=>rankSeasonChanges(board,firm),[board,firm]);
 const vestFrequency=useMemo(()=>{
  const rows=rankWeekly(board,'vest').sort((a,b)=>b.count-a.count||b.total-a.total||a.address.localeCompare(b.address));
  return rows.length?{winner:rows[0],ties:rows.filter(r=>r.count===rows[0].count).length}:null;
 },[board]);
 const addresses=ranked.map(r=>r.address).join(',');
 useEffect(()=>{if(!addresses)return;const c=new AbortController(),all=addresses.split(','),chunks=[];for(let i=0;i<all.length;i+=100)chunks.push(all.slice(i,i+100));
 (async()=>{try{const found=[];for(let i=0;i<chunks.length;i+=4){const batch=await Promise.all(chunks.slice(i,i+4).map(async chunk=>{const r=await fetch(API+'/profiles?addresses='+encodeURIComponent(chunk.join(',')),{signal:c.signal});if(!r.ok)throw Error();const d=await r.json();if(!Array.isArray(d.profiles))throw Error();return d.profiles}));found.push(...batch.flat());}if(!c.signal.aborted){const remote=Object.fromEntries(found.map(x=>{const address=x.address?.toLowerCase();return [address,{...x,address,...FEATURED_TRADERS[address]}]}));setProfiles(p=>({...p,...remote,...FEATURED_TRADERS}))}}catch{/* Remote claimed-profile lookup is optional; keep GitHub editorial profiles on failure. */}})();return()=>c.abort()},[addresses]);
 const limit=20;
 const filtered=query.trim()?ranked.filter(r=>traderWallets(r.address).some(a=>a.includes(query.trim().toLowerCase()))||profiles[r.address]?.username?.toLowerCase().includes(query.trim().replace('@','').toLowerCase())||profiles[r.address]?.displayName?.toLowerCase().includes(query.trim().toLowerCase())).slice(0,limit):ranked.slice(0,limit);
 const person=ranked.find(r=>r.address===selected),total=ranked.reduce((s,r)=>s+r.total,0),count=ranked.reduce((s,r)=>s+r.count,0),stale=board&&Date.now()-Date.parse(board.asOf)>3600000;
 useEffect(()=>{if(route.card==='yush-overall'&&!poster)setPoster(specialRow)},[route.card,poster]);
 useEffect(()=>{if((selected||poster||claim)&&dialog.current&&!dialog.current.open)dialog.current.showModal();else if(dialog.current?.open&&!selected&&!poster&&!claim)dialog.current.close()},[selected,poster,claim]);
 function close(){setSelected(null);setPoster(null);setClaim(null);setError('');}
 function linkFor(wallet){return location.origin+location.pathname+'#leaderboard?season='+week+'&firm='+firm+(view==='weekly'?'&view=weekly&weekly='+selectedWeekKey:'')+(wallet?'&wallet='+wallet:'');}
 async function copy(wallet){try{await navigator.clipboard.writeText(linkFor(wallet));setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{setError('Could not copy link. You can copy the wallet address below.')}}
 async function download(){
  if(!posterRef.current)return;
  if(view==='weekly'&&route.card!=='yush-overall'&&(!weeklyAwardsUnlocked(board,Date.now())||(poster?.address&&!ranked.slice(0,3).some(r=>r.address===poster.address)))){setError('Weekly cards unlock after the completed results are confirmed.');return;}
  setExporting(true);setError('');
  try{
   const {toJpeg}=await import('html-to-image');
   await document.fonts.ready.catch(()=>{});
   const capture=view==='weekly'?posterRef.current.querySelector('.wk-award-canvas'):posterRef.current;
   if(!capture)throw Error('Missing card');
   const artwork=view==='weekly'?null:capture.querySelector('svg'),bounds=artwork?.viewBox.baseVal;
   if(view!=='weekly'&&(!bounds?.width||!bounds?.height))throw Error('Missing card dimensions');
   const width=view==='weekly'?capture.scrollWidth:capture.getBoundingClientRect().width,height=view==='weekly'?capture.scrollHeight:width*bounds.height/bounds.width;
   const baseOptions={quality:0.97,width,height,canvasWidth:width,canvasHeight:height,pixelRatio:(view==='season'&&firm==='vest'&&!poster?.address?1800:3600)/width,backgroundColor:'#09090b',cacheBust:true,imagePlaceholder:'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',style:{margin:'0',padding:view==='weekly'&&!poster?.address?'24px':'0',border:'0',width:width+'px',height:height+'px',minHeight:'0',maxHeight:'none',maxWidth:'none',overflow:'hidden',transform:'none',boxSizing:'border-box'}};
   let fontEmbedCSS='';
   try{fontEmbedCSS=await posterFonts(capture)}catch{}
   let url;
   try{url=await toJpeg(capture,{...baseOptions,...(fontEmbedCSS?{fontEmbedCSS}:{})})}
   catch{url=await toJpeg(capture,{...baseOptions,skipFonts:true})}
   if(!url?.startsWith('data:image/jpeg'))throw Error('JPG render failed');
   const a=document.createElement('a');a.href=url;a.download=route.card==='yush-overall'?'massiveprop-yush-overall-rank-03.jpg':view==='weekly'?`massiveprop-week-${selectedWeekKey}-${firm}-${poster?.address?'rank-'+poster.rank:'top-3'}.jpg`:`massiveprop-season-${week}${poster?.address?'-rank-'+poster.rank:'-top'+limit}.jpg`;document.body.append(a);a.click();a.remove();
  }catch(err){
   console.error('Rank card export failed',err);
   setError('Image download failed. Reload once and try again.');
  }finally{setExporting(false)}
 }
 useEffect(()=>{setHistory(null);if(!selected||view==='weekly')return;const c=new AbortController();const old=weeks.filter(w=>w.closed&&w.week!==week).slice(0,8);Promise.all(old.map(async w=>{try{const b=await read('seasons/'+w.week+'.json',c.signal),r=rankWeekly(b,firm).find(r=>r.address===selected);return {week:w.week,start:w.start,row:r,available:true}}catch{return {week:w.week,start:w.start,available:false}}})).then(d=>{if(!c.signal.aborted)setHistory(d)});return()=>c.abort()},[selected,weeks,week,firm,view]);
 const name=r=>profiles[r.address]?'@'+profiles[r.address].username:short(r.address);
 const options=[...new Set([weekKey(weekStart()),...weeks.map(w=>w.week),week])].sort().reverse();
 const weeklyRange=weekRange(selectedWeekStart);
 return <main className="wk"><div className="wk-shell">{rankIntro&&<MoonLoader label="Loading standings"/>}
 <header className="wk-nav"><a href="#" className="wk-brand">MASSIVE.</a><a href="#flow" className="wk-flow-link">Flow trackers <ArrowUpRight size={14}/></a><button className="flat-claim-moon" onClick={()=>setClaim({address:''})} aria-label="Claim profile" title="Claim profile"><MoonAvatar seed="massive-claim"/></button></header>
 <section className="wk-hero"><div className="wk-hero-line"><div className="wk-hero-copy"><h1>THE TOP<br/><em>{'TWENTY.'}</em></h1></div><div className="wk-editorial-side wk-vest-edition"><div className="wk-vest-smoke" aria-hidden="true"/><img className="wk-vest-hero-mark" src={BRAND_ASSETS.vest} alt="" aria-hidden="true"/><span className="wk-issue-number" aria-hidden="true">20</span><div className="wk-league-seal"><b>{view==='weekly'?'WEEK / '+weeklyRange:'SEASON '+String(seasonNumber(seasonStart)).padStart(2,'0')+' / '+range(seasonStart)}</b></div></div></div>
 <div className="wk-overview"><div><strong>{board?usd(total):'—'}</strong><span>{view==='weekly'?'Weekly':'Season'} payouts</span></div><div><strong>{board?ranked.length.toLocaleString():'—'}</strong><span>payout profiles</span></div><div><strong>{board?count.toLocaleString():'—'}</strong><span>individual payouts</span></div><div className="wk-week">{view==='weekly'?<><label>WEEK / UTC</label><strong className="wk-week-current">{weeklyRange}</strong></>:<><label htmlFor="wk-week">Season / UTC</label><select id="wk-week" value={week} onChange={e=>{setWeek(e.target.value);setSelected(null)}}>{options.map(w=><option key={w} value={w}>{range(Date.parse(w+'T00:00:00Z'))}{w===weekKey(weekStart())?' · Live':''}</option>)}</select></>}</div></div></section>
 <div className="wk-utility-bar">
 <DataFreshness compact asOf={board?.asOf} completeThrough={board?.completeThrough} busy={busy} onRefresh={()=>refresh.current()}/>
 <div className="wk-view-switch" aria-label="Leaderboard period"><button className={view==='season'?'active':''} onClick={()=>{setView('season');setSelected(null);setQuery('')}}>Season</button><button className={view==='weekly'?'active':''} onClick={()=>{setView('weekly');setSelected(null);setQuery('')}}>Weekly <span>Top 20</span></button></div>
 <a className="wk-vest-offer" href="https://next.vestmarkets.com/r/isgigaprop" target="_blank" rel="sponsored noopener noreferrer" aria-label="Get 5% off Vest with the MASSIVE referral link"><span className="flat-vest-moon" aria-hidden="true"><MoonAvatar seed="massive-vest-offer"/><img src={BRAND_ASSETS.vestSymbol} alt=""/></span><span className="flat-vest-offer-copy"><strong>Vest</strong><b>5% off</b></span><ArrowUpRight size={16}/></a>
 <div className="wk-controls"><div className="wk-tabs" aria-label="Filter by firm">{[...WEEKLY_FIRMS].sort((a,b)=>(b.id==='vest')-(a.id==='vest')).map(f=><button key={f.id} className={firm===f.id?'active':''} onClick={()=>{setFirm(f.id);setQuery('')}}>{f.name}</button>)}</div>{view==='season'&&<button className="wk-export" disabled={!board||!ranked.length} onClick={()=>setPoster({})}><Download size={14}/> Season image</button>}</div>
 </div>
 {view==='weekly'&&<><div className="wk-weekly-tools"><span>{weeklyRange} · UTC{isPastWeek?' · Past edition':''}</span><button className="wk-archive-toggle" aria-expanded={archiveOpen} aria-controls="wk-week-archive" onClick={()=>setArchiveOpen(v=>!v)}>Past weeks {archiveOpen?'−':'+'}</button></div>{archiveOpen&&<div id="wk-week-archive" className="wk-week-archive"><button className={!isPastWeek?'active':''} onClick={()=>{setWeeklyChoice('');setSelected(null);setPoster(null)}}>This week · Live</button>{weeklyEditions.filter(w=>Date.parse(w.week+'T00:00:00Z')<currentWeekStart).map(w=><button key={w.week} className={selectedWeekKey===w.week?'active':''} onClick={()=>{setWeeklyChoice(w.week);setSelected(null);setPoster(null)}}>{weekRange(Date.parse(w.week+'T00:00:00Z'))}</button>)}</div>}{archiveError&&<p className="wk-refresh-note" role="status">{archiveError}</p>}<section className="wk-weekly-awards"><div className="wk-weekly-awards-head"><div><h3>Weekly cards</h3></div>{!awardsUnlocked&&<p>Available after the week closes.</p>}</div><div className="wk-weekly-award-actions"><button disabled={!awardsUnlocked||ranked.length<3} onClick={()=>setPoster({})}><Download size={13}/> Top 3 card</button>{[1,2,3].map(rank=><button key={rank} disabled={!awardsUnlocked||!ranked[rank-1]} onClick={()=>setPoster(ranked[rank-1])}><Download size={13}/> #{rank} card</button>)}</div></section></>}
 {board?<><div className="wk-arena-title"><b>Podium</b></div><div className="wk-podium flat-podium">{ranked.slice(0,3).map((r,i)=><PodiumCard key={r.address} row={r} profiles={profiles} view={view} board={board} selectedWeekKey={selectedWeekKey} week={week} start={start} seasonStart={seasonStart} onSelect={setSelected}><DailyChange row={r}/></PodiumCard>)}</div>

 <div className="wk-table-title"><h2>{view==='weekly'?'WEEKLY TOP 20':'LEAGUE STANDINGS'} <span>{WEEKLY_FIRMS.find(f=>f.id===firm)?.name}</span></h2><label className="wk-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a wallet or claimed name" aria-label="Search payout wallets"/></label></div>
 <div className="wk-table"><div className="wk-table-head"><span>RANK</span><span>Trader</span><span>Firm</span><span className="wk-daily-heading">24h gain</span><span>24h rank</span><span>{view==='weekly'?'WEEK PAYOUTS':'SEASON PAYOUTS'}</span><span/></div>{filtered.length?filtered.map(r=><div className="wk-row" data-rank={r.rank} role="button" tabIndex={0} key={r.address} onClick={()=>setSelected(r.address)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(r.address)}}}>{profiles[r.address]?.avatar&&<img className="wk-row-portrait" src={profiles[r.address].avatar} alt=""/>}<span className={'wk-rank '+(r.rank<=3?'wk-top-rank':'')}>{String(r.rank).padStart(2,'0')}</span><span className="wk-row-identity">{profiles[r.address]?.avatar?<img className="flat-list-avatar" src={profiles[r.address].avatar} alt=""/>:<MoonAvatar seed={r.address}/>}<span className="flat-list-name"><strong>{name(r)}{profiles[r.address]?.verifiedAt&&<ShieldCheck size={13}/>}</strong>{profiles[r.address]?.tag&&<TraderTag profile={profiles[r.address]} compact/>}</span></span><Badges firms={r.firms}/><span className="flat-row-gain">+{usd(r.received24h)}</span><span className="flat-row-move"><RankMovement row={r}/></span><span className="wk-row-amount"><strong>{usd(r.total)}</strong></span><ChevronRight size={15}/></div>):<div className="wk-empty">{query?'No matching payout wallet in this edition.':'No eligible payouts in this period.'}</div>}</div>
</>:<div className="wk-empty"><RefreshCw size={20}/><h2>{busy?'Reading the payout record…':'This edition is unavailable'}</h2><p>{busy?'Reading the selected firm’s payout history.':computed?.missing?.join(', ')||(view==='weekly'?'A complete snapshot is needed before we can rank this week.':'A complete snapshot is needed before we can rank this season.')}</p><button onClick={()=>refresh.current()}>Refresh</button></div>}
 <section className="wk-claim-compact"><div><strong>ON THE BOARD?</strong><span>Claim your payout profile.</span></div><button onClick={()=>setClaim({address:''})}>Claim profile <ArrowUpRight size={15}/></button></section>
 <details className="wk-method"><summary>How the rankings work</summary><div><h3>{view==='weekly'?'Money received this week':'Money received this season'}</h3><p>{view==='weekly'?'Weekly mode ranks eligible USDC received from Monday 00:00 UTC through the current data cutoff, capped at the Top 20. ':''}Ranked by eligible USDC sent from our tracked Vest, Breakout, Hypernova and Propr wallets, in calendar-quarter seasons. The extended launch season runs September 1 through December 31, 2026, ending January 1, 2027 at 00:00 UTC (exclusive). From 2027, seasons run January–March, April–June, July–September and October–December. Each firm refreshes directly from its tracked blockchain sources. Its standings use the oldest complete cutoff among that firm’s sources; other firms do not hold it back. Archived records preserve earlier season history. These are payout-recipient rankings, not trading PnL, ROI or a measure of skill.</p><h3>What is included</h3><p>Known internal firm wallets, identified bridges and transfers below 0.01 USDC are excluded. Refunds, affiliate payments, unidentified treasury transfers and custodial addresses may remain until their purpose is confirmed. Each entry exposes its transaction evidence. Equal totals are ordered by wallet address. The 24h USDC figure counts eligible payouts in the 24 hours ending at the displayed common data cutoff; it is not trading profit. Rank movement compares season-to-date standings with standings 24 hours earlier, within the selected firm filter and across all eligible wallets. NEW means no eligible payouts at the earlier cutoff. Rank movement is unavailable during the first 24 hours of a season. Closed editions show their final 24 hours.</p><h3>Wallets and names</h3><p>Each receiving address is one entry unless MASSIVE explicitly groups multiple wallets under one owner-confirmed profile. Grouped profiles combine eligible payouts, payout counts and 24-hour changes across their listed wallets, supported chains and firms. Original receiving addresses and transactions remain visible. Grouping does not prove wallet control by signature. An address is not necessarily one person; shared or contract addresses can have different controllers. Wallet verified means a signature proved control on the listed chain at the verification time. It does not establish legal identity, firm endorsement or trading-account ownership. Profile submissions are reviewed manually by MASSIVE against withdrawal confirmation and onchain payout records before publication. Submission does not automatically verify wallet control. Requested names and tags are subject to review. Featured names and social avatars are editorial mappings supplied by MASSIVE; they do not receive a wallet-control badge without a signature. Unclaimed wallets remain eligible.</p><h3>Season editions</h3><p>Season records accumulate before source history rolls off. Closed editions preserve the recorded transactions; visible usernames may update as profiles are claimed. Historical editions at launch are reconstructed from available complete history. Rankings cover Vest payout wallets on Arbitrum, Base and Ethereum. No paid placement affects rank.</p><a href="mailto:gp@gigaprop.xyz?subject=Season%20leaderboard%20data%20correction">Report a data correction <ArrowUpRight size={13}/></a></div></details>
 {vestFrequency&&(firm==='all'||firm==='vest')&&<button className="wk-frequent" title={'Most eligible Vest payout transfers '+(view==='weekly'?(isPastWeek?'that week':'this week'):'this season')+'. Equal counts are ordered by total USDC received, then wallet address.'} onClick={()=>{setFirm('vest');setSelected(vestFrequency.winner.address)}} aria-label={'View '+name(vestFrequency.winner)+', most Vest payouts '+(view==='weekly'?(isPastWeek?'that week':'this week'):'this season')}>
 <img className="wk-frequent-mark" src={BRAND_ASSETS.vestSymbol} alt=""/>
 <span className="wk-frequent-copy"><span className="wk-frequent-kicker">VEST / SIDE QUEST{vestFrequency.ties>1?' / JOINT LEAD':''}</span><strong>Frequent Withdrawer.</strong></span>
 <span className="wk-frequent-person"><b>{name(vestFrequency.winner)}</b><span>{usd(vestFrequency.winner.total)} received · {view==='weekly'?(isPastWeek?'that week':'this week'):'this season'}</span></span>
 <span className="wk-frequent-count"><b>{vestFrequency.winner.count.toLocaleString()}</b><span>individual payouts</span></span><ArrowUpRight size={17}/>
 </button>}
 {error&&<p className="wk-refresh-note" role="status">{error}</p>}
 <footer className="wk-footer"><a href="#">MASSIVE.</a><a href="#flow">Explore the evidence <ArrowUpRight size={13}/></a></footer>
 <dialog ref={dialog} className="wk-modal" onCancel={close} onClose={close}><button className="wk-close" onClick={close} aria-label="Close"><X size={20}/></button>
 {claim?<ClaimForm initialAddress={claim.address} onDone={close}/>:poster&&(board||route.card==='yush-overall')?<><div ref={posterRef} className="wk-poster">{route.card==='yush-overall'?<WeeklyAwards board={{available:true,closed:true,start:SEASON_ONE,end:Date.parse('2027-01-01T00:00:00Z'),week:'2026-09-01',asOf:'2026-10-05T20:54:15.478Z',transfers:specialRow.transfers}} rows={[specialRow]} profiles={profiles} firm="vest" person={specialRow} renderCard={r=><PodiumCard row={r} profiles={profiles} view="season" board={{closed:false}} selectedWeekKey="2026-09-01" week="2026-09-01" start={SEASON_ONE} seasonStart={SEASON_ONE} editionLabel="OVERALL / VEST"/>}/>:view==='weekly'?<WeeklyAwards board={board} rows={ranked} profiles={profiles} firm={firm} person={poster.address?poster:null} renderCard={r=><PodiumCard row={r} profiles={profiles} view="weekly" board={board} selectedWeekKey={selectedWeekKey} week={week} start={start} seasonStart={seasonStart}/>}/>:<WeeklyPoster board={board} rows={ranked} profiles={profiles} firm={firm} person={poster.address?poster:null}/>}</div><button className="wk-primary" onClick={download} disabled={exporting||(view==='weekly'&&!awardsUnlocked&&route.card!=='yush-overall')}><Download size={15}/>{exporting?'Preparing JPG…':'Download JPG'}</button></>:person?<><div className="wk-profile-label">{view==='weekly'?'WEEK RANK / '+selectedWeekKey:'SEASON RANK / '+week}</div>{profiles[person.address]?.avatar&&<img className="wk-profile-portrait" src={profiles[person.address].avatar} alt={profiles[person.address].displayName}/>}<div className="wk-profile-rank">#{String(person.rank).padStart(2,'0')}</div><h2>{name(person)}</h2><TraderTag profile={profiles[person.address]}/>{profiles[person.address]?.social&&<a className="wk-social" href={profiles[person.address].social} target="_blank" rel="noreferrer">View on X <ArrowUpRight size={12}/></a>}<div className="wk-profile-address">{traderWallets(person.address).length>1&&<strong>{traderWallets(person.address).length} wallets · combined payout record</strong>}{traderWallets(person.address).map(address=><div key={address}>{address}</div>)}</div><strong className="wk-profile-total">{usd(person.total)}</strong><DailyChange row={person}/><Badges firms={person.firms}/><div className="wk-profile-actions">{(view==='season'||person.rank<=3)&&<button disabled={view==='weekly'&&!awardsUnlocked} onClick={()=>{setSelected(null);setPoster(person)}}><Download size={14}/>{view==='weekly'?(awardsUnlocked?'Weekly podium card':'Unlocks after week closes'):'Rank card'}</button>}<button onClick={()=>copy(person.address)}>{copied?<Check size={14}/>:<Copy size={14}/>} Copy profile link</button><button onClick={()=>{setSelected(null);setClaim({address:person.address})}}><Wallet size={14}/>{profiles[person.address]?.verifiedAt?'Manage name':'Claim profile'}</button></div><h3 className="wk-evidence-title">Payout evidence <span>{person.count} transfers</span></h3><div className="wk-evidence">{person.transfers.map(t=><a key={t.id} href={t.explorer+'/tx/'+t.hash} target="_blank" rel="noopener noreferrer"><span>{WEEKLY_FIRMS.find(f=>f.id===t.firm)?.name}<small>{new Date(t.timestamp).toLocaleString()} · {t.chain}{traderWallets(person.address).length>1?' · to '+short(t.to):''}</small></span><b>{usd(t.amount)}</b><ArrowUpRight size={13}/></a>)}</div></>:selected?<div className="wk-empty">{busy?'Loading wallet…':'This wallet has no eligible payouts in the selected edition or filter.'}</div>:null}{error&&<p className="wk-alert" role="status">{error}</p>}
 </dialog>
 </div></main>;
}
function ClaimForm({initialAddress,onDone}){
 const [wallets,setWallets]=useState(()=>initialAddress?traderWallets(initialAddress):['']),[twitter,setTwitter]=useState(''),[displayName,setDisplayName]=useState(''),[tag,setTag]=useState(''),[email,setEmail]=useState(''),[proof,setProof]=useState(''),[agree,setAgree]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
 const submitted=useRef(false),submissionTimer=useRef(null),waitingRef=useRef(null);
 useEffect(()=>{
  if(!busy)return;
  waitingRef.current?.scrollIntoView({block:'nearest',behavior:'auto'});
  const warnBeforeLeaving=e=>{e.preventDefault();e.returnValue='';};
  window.addEventListener('beforeunload',warnBeforeLeaving);
  return()=>window.removeEventListener('beforeunload',warnBeforeLeaving);
 },[busy]);
 useEffect(()=>()=>{if(submissionTimer.current)clearTimeout(submissionTimer.current)},[]);
 const walletList=wallets.map(w=>w.trim().toLowerCase()).filter(Boolean);
 const primaryWallet=walletList[0]||'';
 function updateWallet(index,value){setWallets(current=>current.map((wallet,i)=>i===index?value.trim():wallet))}
 function addWallet(){setWallets(current=>current.length>=10?current:[...current,''])}
 function removeWallet(index){setWallets(current=>current.length===1?current:current.filter((_,i)=>i!==index))}
 function submittedFrameLoaded(e){
  if(!submitted.current)return;
  try{
   const url=e.currentTarget.contentWindow?.location?.href||'';
   if(!url.startsWith(location.origin+'/claim-received.html'))return;
  }catch{return}
  submitted.current=false;if(submissionTimer.current)clearTimeout(submissionTimer.current);setBusy(false);setSent(true);setStatus('Submitted for review. MASSIVE will check your withdrawal against the onchain record before publishing your profile.');
 }
 async function submit(e){
  e.preventDefault();if(busy||sent)return;if(!agree){setStatus('Check the consent box before submitting.');return;}
  const form=e.currentTarget,input=form.elements.attachment,attachment=input?.files?.[0];
  if(form.elements._honey?.value)return;
  if(!walletList.length){setStatus('Add at least one payout wallet.');return;}
  if(walletList.some(wallet=>!/^0x[a-f0-9]{40}$/.test(wallet))){setStatus('Check each payout wallet. Every address must be a complete 0x address.');return;}
  if(new Set(walletList).size!==walletList.length){setStatus('Remove duplicate wallet addresses before submitting.');return;}
  if(!attachment?.size){setStatus('Attach a screenshot of your Vest withdrawal confirmation email.');return;}
  if(attachment.size>10*1024*1024){setStatus('Please use an image under 10 MB.');return;}
  if(!['image/png','image/jpeg','image/webp'].includes(attachment.type)){setStatus('Use a PNG, JPG or WebP screenshot.');return;}
  setBusy(true);setStatus('Sending your screenshot and profile…');
  const controller=new AbortController();
  if(submissionTimer.current)clearTimeout(submissionTimer.current);
  submissionTimer.current=setTimeout(()=>controller.abort(),45000);
  try{
   const data=new FormData(form);
   data.set('attachment_filename',attachment.name||'withdrawal-proof');
   data.set('attachment_bytes',String(attachment.size));
   data.set('attachment_type',attachment.type||'unknown');
   // FormSubmit's AJAX endpoint gives us a real response instead of relying on
   // a cross-origin iframe redirect that mobile browsers can leave unresolved.
   data.delete('_next');
   const response=await fetch('https://formsubmit.co/ajax/gp@gigaprop.xyz',{method:'POST',body:data,headers:{Accept:'application/json'},signal:controller.signal});
   const result=await response.json().catch(()=>null);
   if(!response.ok||![true,'true'].includes(result?.success))throw Error(result?.message||('FormSubmit returned '+response.status));
   if(submissionTimer.current)clearTimeout(submissionTimer.current);
   submitted.current=false;setBusy(false);setSent(true);setStatus('Submitted for review. MASSIVE will check your withdrawal against the onchain record before publishing your profile.');
  }catch(error){
   if(submissionTimer.current)clearTimeout(submissionTimer.current);
   submitted.current=false;setBusy(false);
   setStatus(error?.name==='AbortError'?'FormSubmit timed out. Nothing was marked received — please try again.':'FormSubmit rejected the submission. Please try again.');
   console.error('MASSIVE profile claim submission failed',error);
  }
 }
 if(sent)return <div className="wk-claim-form wk-submission wk-submission-success" role="status" aria-live="polite"><div className="wk-success-mark"><Check size={32}/></div><span className="wk-profile-label">PROFILE CLAIM / RECEIVED</span><h2>Submission received.</h2><p>Your claim is in. MASSIVE will review the withdrawal confirmation and combine the approved payout wallets into one leaderboard profile.</p><div className="wk-success-wallet wk-success-wallets"><span>{walletList.length===1?'Submitted wallet':walletList.length+' submitted wallets'}</span><div>{walletList.map(wallet=><strong key={wallet}>{short(wallet)}</strong>)}</div></div><p className="wk-claim-note">You do not need to submit again. If anything is missing, MASSIVE will follow up using the contact email you provided.</p><button className="wk-primary wk-success-done" type="button" onClick={onDone}><Check size={16}/> Done</button></div>;
 return <form className="wk-claim-form wk-submission" onSubmit={submit} action="https://formsubmit.co/ajax/gp@gigaprop.xyz" method="POST" encType="multipart/form-data"><ShieldCheck size={30}/><span className="wk-profile-label">VEST / MANUAL PROFILE REVIEW</span><h2>Put your name on it.</h2><p>Submit your Vest withdrawal confirmation and every payout wallet you want under the profile. MASSIVE will cross-reference the receiving addresses onchain before publishing them as one combined identity.</p>
 <input name="_honey" type="text" tabIndex={-1} autoComplete="off" style={{display:'none'}} aria-hidden="true"/>
 <input type="hidden" name="_captcha" value="false"/>
  <input type="hidden" name="_subject" value={'MASSIVE VEST PROFILE REVIEW — @'+twitter.trim().replace(/^@/,'')}/>
 <input type="hidden" name="source" value="massiveprop.xyz/#leaderboard"/>
 <input type="hidden" name="consent" value="I agree to publication of the approved profile details and payout wallet(s)."/>
 <input type="hidden" name="payout_wallet" value={primaryWallet}/>
 <input type="hidden" name="payout_wallets" value={walletList.join('\n')}/>
 <input type="hidden" name="wallet_count" value={walletList.length}/>
 <input type="hidden" name="twitter" value={'@'+twitter.trim().replace(/^@/,'')}/>
 <input type="hidden" name="display_name" value={displayName.trim()}/>
 <input type="hidden" name="tag" value={tag.trim()}/>
 <input type="hidden" name="email" value={email.trim()}/>
 <input type="hidden" name="withdrawal_confirmation" value={proof.trim()}/>
 <div className="wk-wallet-group">
  <div className="wk-wallet-heading"><span>Payout wallet addresses</span><small>{walletList.length>1?walletList.length+' wallets':'Primary first'}</small></div>
  {wallets.map((wallet,index)=><div className="wk-wallet-entry" key={index}><div className="wk-wallet-entry-label"><span>{index===0?'Primary wallet':'Wallet '+(index+1)}</span></div><div className="wk-wallet-entry-control"><input required pattern="0x[a-fA-F0-9]{40}" maxLength={42} value={wallet} disabled={busy||sent} onChange={e=>updateWallet(index,e.target.value)} placeholder="0x…" autoComplete="off" aria-label={index===0?'Primary payout wallet':'Additional payout wallet '+(index+1)}/>{wallets.length>1&&<button type="button" className="wk-wallet-remove" onClick={()=>removeWallet(index)} disabled={busy||sent} aria-label={'Remove wallet '+(index+1)}><X size={14}/></button>}</div></div>)}
  <button type="button" className="wk-add-wallet" onClick={addWallet} disabled={busy||sent||wallets.length>=10}>+ Add another wallet</button>
  <small className="wk-wallet-help">Up to 10 wallets, combined after approval.</small>
 </div>
 <label>Contact email<input required type="email" maxLength={254} value={email} disabled={busy||sent} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
 <label>Twitter / X @<input required pattern="@?[A-Za-z0-9_]{1,15}" maxLength={16} value={twitter} disabled={busy||sent} onChange={e=>setTwitter(e.target.value)} placeholder="@yourhandle" autoComplete="off"/></label>
 <label>Desired display name<input required maxLength={40} value={displayName} disabled={busy||sent} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name on the board"/></label>
 <label>Desired tag <small>optional</small><input maxLength={40} value={tag} disabled={busy||sent} onChange={e=>setTag(e.target.value)} placeholder="#YOURGANG or yourbrand.com"/></label>
 <label>Withdrawal email screenshot<input name="attachment" type="file" required accept="image/png,image/jpeg,image/webp" disabled={sent}/><small>PNG, JPG or WebP · up to 10 MB</small></label>
 <label>Additional payout details (optional)<textarea maxLength={5000} rows={5} value={proof} disabled={busy||sent} onChange={e=>setProof(e.target.value)} placeholder="Include the withdrawal amount, date and receiving address. Add the transaction hash if available."/></label>
 <p className="wk-claim-note">Keep the payout details visible and remove unrelated personal information. If you added multiple wallets, use the details box to explain the connection if helpful. Your confirmation and contact email are sent through FormSubmit to MASSIVE for review, not published on the leaderboard.</p>
 <label className="wk-consent"><input type="checkbox" required checked={agree} disabled={busy||sent} onChange={e=>setAgree(e.target.checked)}/>I agree to my approved name, Twitter @, tag and payout wallet(s) appearing publicly as one combined profile.</label>
 {busy&&<div ref={waitingRef} className="flat-claim-wait" role="status"><MoonAvatar seed="submission"/><strong>Submitting…</strong><p>Keep this window open.</p></div>}
 <button className="wk-primary" disabled={busy||sent} type="submit">{busy?'Submitting…':'Submit profile for review'}<ArrowUpRight size={15}/></button>
 <p className="wk-claim-note">Your profile goes live after manual approval. No wallet connection or signature needed.</p><p role="status" className="wk-claim-status">{status}</p></form>;
}
