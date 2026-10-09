import {useEffect, useState} from 'react';
import {ArrowLeft, ArrowUpRight} from 'lucide-react';
import data from './earnings.json';
import './affiliated.css';
const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const total = data.days.reduce((n,d)=>n+d.commissionCents,0);
const count = data.days.reduce((n,d)=>n+d.sales,0);
const best = data.days.reduce((a,b)=>a.commissionCents>b.commissionCents?a:b);
const dateParts = date => {const d=new Date(date+'T12:00:00');return {day:d.getDate().toString().padStart(2,'0'),month:d.toLocaleDateString('en-US',{month:'short'}),weekday:d.toLocaleDateString('en-US',{weekday:'long'})}};
const cumulative = [...data.days].reverse().reduce((points, day) => { points.push((points.at(-1)||0)+day.commissionCents); return points; }, []);
const trendPoints = cumulative.map((value,i)=>`${12+i*376/(cumulative.length-1)},${146-value/total*126}`).join(' ');
function EarningsTrend(){return <svg className="af-trend" viewBox="0 0 400 170" role="img" aria-label="Cumulative commissions rose to $10,627.69 from September 29 to October 8"><defs><linearGradient id="af-line" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#9b87f5" stopOpacity=".05"/><stop offset=".55" stopColor="#b8a5da" stopOpacity=".55"/><stop offset="1" stopColor="#efe6d2" stopOpacity=".85"/></linearGradient><linearGradient id="af-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b6a1dd" stopOpacity=".13"/><stop offset="1" stopColor="#b6a1dd" stopOpacity="0"/></linearGradient><filter id="af-haze" x="-30%" y="-50%" width="160%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs><polygon points={`12,164 ${trendPoints} 388,164`} fill="url(#af-fill)"/><polyline points={trendPoints} fill="none" stroke="#ad96d6" strokeWidth="9" opacity=".26" filter="url(#af-haze)"/><polyline points={trendPoints} fill="none" stroke="url(#af-line)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="388" cy="20" r="2" fill="#e3d8c5" opacity=".6"/></svg>}
function Amount({cents}){const [whole,decimal]=money(cents).split('.');return <>{whole}<span className="af-decimal">.{decimal}</span></>}
export default function Affiliated(){
 const [metric,setMetric]=useState('earnings');
 useEffect(()=>{const title=document.title;document.title='Affiliated · MASSIVE';return()=>{document.title=title}},[]);
 return <main className="af-page">
  <header className="af-nav"><a href="#" className="af-brand">MASSIVE<span>.</span></a><span className="af-nav-edition">THE BLACK CARD / AFFILIATED</span><a href="#leaderboard" className="af-back"><ArrowLeft size={14}/> Leaderboard</a></header>
  <div className="af-wrap">
   <section className="af-intro"><div className="af-kicker"><i/> MASSIVE × VEST <span>01 / AFFILIATE STATEMENT</span></div><h1>Affiliated<span>.</span></h1><div className="af-intro-foot"><span>SEP 29 — OCT 08, 2026</span></div></section>
   <section className="af-hero" aria-label="Affiliate earnings summary">
    <div className="af-card-grain" aria-hidden="true"/><EarningsTrend/><span className="af-ghost" aria-hidden="true">M.</span>
    <div className="af-card-top"><span className="af-card-wordmark">MASSIVE<span> / BLACK CARD</span></span><span className="af-pending"><i/> PENDING COMMISSIONS</span></div>
    <div className="af-main-amount"><p>TOTAL EARNINGS <span>USD</span></p><div className="af-total"><Amount cents={total}/></div></div>
    <div className="af-hero-bottom"><div><span className="af-label">ESTIMATED SALES</span><strong><Amount cents={total/data.rate}/></strong></div><div><span className="af-label">SALES</span><strong>{count}<small>transactions</small></strong></div><div><span className="af-label">COMMISSION</span><strong>20<span className="af-percent">%</span></strong></div></div>
    <div className="af-card-bottom"><span>VEST MARKETS</span><span>SEP 29 <i/> OCT 08</span><span className="af-card-chip" aria-hidden="true">▥</span></div>
   </section>
   <section className="af-record"><div className="af-record-title"><span className="af-label">THE HIGH WATERMARK</span><p>One day.<br/><em>{best.sales} sales.</em></p></div><div className="af-record-number"><span className="af-label">BEST DAY · OCTOBER 05</span><strong><Amount cents={best.commissionCents}/></strong><span className="af-record-sales">{money(best.commissionCents/data.rate)} estimated sales <ArrowUpRight size={16}/></span></div></section>
   <section className="af-daily" aria-labelledby="af-daily-title"><div className="af-daily-head"><div><span className="af-label">THE DAILY STATEMENT</span><h2 id="af-daily-title">Day by <em>day.</em></h2></div><div className="af-switch" aria-label="Daily amount display">{[['earnings','Earnings'],['sales','Est. sales']].map(([value,label])=><button key={value} aria-pressed={metric===value} onClick={()=>setMetric(value)}>{label}</button>)}</div></div>
    <div className="af-days">{data.days.map((d,i)=>{const date=dateParts(d.date);const isBest=d.date===best.date;return <article className={`af-day ${isBest?'af-day-best':''} ${i===0?'af-day-latest':''}`} key={d.date}><span className="af-day-ghost" aria-hidden="true">{date.day}</span><div className="af-day-head"><time dateTime={d.date}><b>{date.month} {date.day}</b><span>{date.weekday}</span></time><span className="af-day-tag">{isBest?'BEST DAY':i===0?'THROUGH 15:17':String(data.days.length-i).padStart(2,'0')}</span></div><div className="af-day-amount"><span className="af-label">{metric==='earnings'?'EARNINGS':'ESTIMATED SALES'}</span><strong><Amount cents={metric==='earnings'?d.commissionCents:d.commissionCents/data.rate}/></strong></div><div className="af-day-foot"><span><b>{d.sales}</b> {d.sales===1?'sale':'sales'}</span><span>{money(metric==='earnings'?d.commissionCents/data.rate:d.commissionCents)} <span>{metric==='earnings'?'est. sales':'earnings'}</span></span></div></article>})}</div>
   </section>
   <footer className="af-footer"><div><a href="#" className="af-brand">MASSIVE<span>.</span></a><span>THE NUMBERS SPEAK.</span></div><p>Snapshot · {data.asOf} · Times as exported · USD<br/>Commissions pending. Sales estimated at a 20% commission rate.</p></footer>
  </div>
 </main>
}
