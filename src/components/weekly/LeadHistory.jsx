import {useMemo,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import MoonAvatar from '../design/MoonAvatar';
import {leadHistory,leadDuration} from '../../lib/lead-history.js';
import './lead-history.css';

export default function LeadHistory({board,firm,profiles}){
 const history=useMemo(()=>leadHistory(board,firm),[board,firm]),[limit,setLimit]=useState(5);
 const {reigns,through}=history;
 const known=a=>Boolean(profiles[a]?.displayLabel||profiles[a]?.displayName||profiles[a]?.username);
 const holders=history.holders.filter(h=>known(h.address));
 const recent=[...reigns].reverse().filter(r=>known(r.address)),latest=recent[0];
 const current=board.closed?null:reigns.at(-1)?.address;
 const name=a=>profiles[a]?.displayLabel||profiles[a]?.displayName||profiles[a]?.username;
 const avatar=a=>profiles[a]?.avatar?<img src={profiles[a].avatar} alt="" loading="lazy"/>:<MoonAvatar seed={a}/>;
 const returned=r=>reigns.some(x=>x.address===r.address&&x.start<r.start);
 const date=t=>new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
 if(!latest)return null;
 const previous=reigns[reigns.indexOf(latest)-1];
 const live=latest===reigns.at(-1)&&!board.closed;
 const maxDuration=Math.max(1,...holders.map(h=>h.duration));
 return <div className="lead-history" onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
  <details key={firm+'-'+board.start}>
   <summary><span className="lead-history-stack" aria-hidden="true">{[...new Set(recent.map(r=>r.address))].slice(0,3).map(a=><span key={a}>{avatar(a)}</span>)}</span><span><b>#1</b> history</span><ChevronDown size={14}/></summary>
   <div className="lead-history-body">
    <div className="lead-history-hero">
     <div className="lead-history-eyebrow">{live?<><i/> ON TOP NOW</>:'LATEST KNOWN TAKEOVER'}<span>{board.duration?'SEASON':'WEEK'} · {firm==='all'?'ALL FIRMS':firm==='nova'?'HYPERNOVA':firm.toUpperCase()}</span></div>
     <div className="lead-history-headline">{avatar(latest.address)}<div><strong>{name(latest.address)}</strong><h3>{returned(latest)?'Took back #1.':'Took #1.'}</h3></div></div>
     <p className="lead-history-story">{previous&&known(previous.address)?<>Passed <b>{name(previous.address)}</b> after their {leadDuration(previous.end-previous.start)} reign.</>:<>The latest move to the top.</>}</p>
     <div className="lead-history-clock"><div><strong>{leadDuration(latest.end-latest.start)}</strong><span>{live?'IN THIS REIGN':'HELD THE TOP SPOT'}</span></div><div><b>{holders.find(h=>h.address===latest.address)?.count}×</b><span>AT #1</span></div></div>
     <time className="lead-history-taken" dateTime={new Date(latest.start).toISOString()}>Took the lead · {date(latest.start)}</time>
    </div>
    <div className="lead-history-heading"><strong>THE CHASE</strong><span>Latest first</span></div>
    <ol className="lead-history-timeline">{recent.slice(0,limit).map(r=><li key={r.start+':'+r.address} className={r===latest?'is-current':''}>{avatar(r.address)}<span className="lead-history-person">{name(r.address)}<small className="lead-history-action">{returned(r)?'Took back #1':'Took #1'} <span>· {date(r.start)}</span></small></span><span className="lead-history-held"><b>{leadDuration(r.end-r.start)}</b><small>{r===reigns.at(-1)&&!board.closed?'AND COUNTING':'AT THE TOP'}</small></span></li>)}</ol>
    {recent.length>limit&&<button className="lead-history-more" type="button" onClick={()=>setLimit(n=>n+10)}>Earlier takeovers +</button>}
    <div className="lead-history-heading"><strong>TIME ON TOP</strong><span>Total · {holders.length} known {holders.length===1?'trader':'traders'}</span></div>
    <div className="lead-history-holders">{holders.map(h=><div className={'lead-history-holder'+(h.address===current?' is-current':'')} key={h.address}>{avatar(h.address)}<span className="lead-history-person">{name(h.address)}<small>{h.count}× at #1</small><span className="lead-history-meter"><i style={{width:Math.max(2,h.duration/maxDuration*100)+'%'}}/></span></span><strong>{leadDuration(h.duration)}</strong></div>)}</div>
    <p className="lead-history-cutoff">Known profiles only · Actual #1 history across all wallets.<br/>{board.closed?'Final record':'Data through '+date(through)} · Durations update with payout data.</p>
   </div>
  </details>
 </div>;
}
