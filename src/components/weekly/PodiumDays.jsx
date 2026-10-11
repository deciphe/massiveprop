import './podium-days.css';
const DAY=86400000;
export function podiumDays(row,start){
 const days=Array.from({length:7},(_,i)=>({start:start+i*DAY,raw:0n}));
 for(const t of row.transfers){const i=Math.floor((Date.parse(t.timestamp)-start)/DAY);if(i>=0&&i<7)days[i].raw+=BigInt(t.raw);}
 return days.filter(d=>d.raw>0n).map(d=>({...d,amount:Number(d.raw)/1e6}));
}
const gain=n=>'+'+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n).replaceAll(',',"'");
export default function PodiumDays({row,start}){
 const days=podiumDays(row,start);
 return <div className="pd-calendar" aria-label="Daily USDC payouts, UTC">{days.map(d=><div className="pd-date" key={d.start}><time dateTime={new Date(d.start).toISOString().slice(0,10)}>{new Date(d.start).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})}</time><strong>{gain(d.amount)}</strong></div>)}</div>;
}
