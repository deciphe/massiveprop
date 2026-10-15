import {useMemo,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import MoonAvatar from '../design/MoonAvatar';
import {leadHistory,leadDuration} from '../../lib/lead-history.js';
import './lead-history.css';

const short=a=>a.slice(0,6)+'…'+a.slice(-4);
export default function LeadHistory({board,firm,profiles}){
 const history=useMemo(()=>leadHistory(board,firm),[board,firm]),[limit,setLimit]=useState(10);
 const {reigns,holders,changes,through}=history;
 const recent=[...reigns].reverse(),current=reigns.at(-1)?.address;
 const name=a=>profiles[a]?.displayLabel||profiles[a]?.displayName||profiles[a]?.username||short(a);
 const avatar=a=>profiles[a]?.avatar?<img src={profiles[a].avatar} alt="" loading="lazy"/>:<MoonAvatar seed={a}/>;
 if(!reigns.length)return null;
 return <div className="lead-history" onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
  <details key={firm+'-'+board.start}>
   <summary><span className="lead-history-stack" aria-hidden="true">{[...new Set(recent.map(r=>r.address))].slice(0,3).map(a=><span key={a}>{avatar(a)}</span>)}</span><span><b>#1</b> history</span><ChevronDown size={14}/></summary>
   <div className="lead-history-body"><div className="lead-history-heading"><strong>TIME AT #1</strong><span>{holders.length} {holders.length===1?'leader':'leaders'}</span></div>
    <div className="lead-history-holders">{holders.map(h=><div className={'lead-history-holder'+(h.address===current?' is-current':'')} key={h.address}>{avatar(h.address)}<span className="lead-history-person">{name(h.address)}<small>{h.count}× at #1</small></span><strong>{leadDuration(h.duration)}</strong></div>)}</div>
    <div className="lead-history-heading"><strong>THE HANDOVERS</strong><span>Newest first</span></div>
    <ol className="lead-history-timeline">{recent.slice(0,limit).map((r,i)=><li key={r.start+':'+r.address} className={i===0?'is-current':''}>{avatar(r.address)}<span className="lead-history-person">{name(r.address)}<small><time dateTime={new Date(r.start).toISOString()}>{new Date(r.start).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time></small></span><span className="lead-history-held"><b>{leadDuration(r.end-r.start)}</b><small>{i===0&&!board.closed?'LEADING':reigns.filter(x=>x.address===r.address&&x.start<r.start).length?'TOOK IT BACK':'TOOK #1'}</small></span></li>)}</ol>
    {recent.length>limit&&<button className="lead-history-more" type="button" onClick={()=>setLimit(n=>n+20)}>Earlier handovers +</button>}
    <p className="lead-history-cutoff">{board.closed?'Final record':'Through '+new Date(through).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · {firm==='all'?'All firms':firm==='nova'?'Hypernova':firm} · this {board.duration?'season':'week'}</p>
   </div>
  </details>
 </div>;
}
