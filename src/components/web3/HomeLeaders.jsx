import {useEffect,useState} from 'react';
import FlatPodium from '../design/FlatPodium';
import {rankSeasonChanges} from '../../lib/season-changes.js';
import {seasonKey,seasonStart} from '../../lib/season-leaderboard.js';
import {FEATURED_TRADERS} from '../../lib/trader-profiles.js';
export default function HomeLeaders(){
 const [rows,setRows]=useState([]),[error,setError]=useState(false);
 useEffect(()=>{const c=new AbortController();let timer;async function refresh(){const key=seasonKey(seasonStart());for(const root of ['https://raw.githubusercontent.com/deciphe/massiveprop/vestflow-data/','/data/']){try{const r=await fetch(root+'seasons/'+key+'.json?t='+Math.floor(Date.now()/300000),{signal:AbortSignal.any([c.signal,AbortSignal.timeout(10000)])});if(!r.ok)throw Error();const d=await r.json();if(!d.available||!Array.isArray(d.transfers))throw Error();if(!c.signal.aborted){setRows(rankSeasonChanges(d,'vest').slice(0,3));setError(false)}return}catch{if(c.signal.aborted)return}}setError(true)}refresh();timer=setInterval(refresh,300000);return()=>{c.abort();clearInterval(timer)}},[]);
 return <section className="flat-home-leaders"><a className="flat-section-link" href="#leaderboard"><h2>Leaderboard <span>↗</span></h2></a><div className="flat-podium">{rows.map(row=><FlatPodium key={row.address} row={row} profile={FEATURED_TRADERS[row.address]} href={'#leaderboard?firm=vest&wallet='+row.address}/>)}</div>{!rows.length&&<p role="status">{error?'Standings unavailable. Open leaderboard ↗':'Loading standings…'}</p>}</section>;
}
