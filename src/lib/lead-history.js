import {canonicalTraderWallet} from './trader-wallets.js';

// Replay eligible payouts at each timestamp, using the board's exact integer
// totals, grouped wallets and address tie-break. Never invent order within a second.
export function leadHistory(board,firm='all'){
 if(!board?.available)return {reigns:[],holders:[],changes:0,through:0};
 const through=Math.min(board.end,Date.parse(board.asOf||board.completeThrough));
 if(!Number.isFinite(through))return {reigns:[],holders:[],changes:0,through:0};
 const seen=new Set(),events=(board.transfers||[]).filter(t=>{
  const time=Date.parse(t.timestamp),id=t.id||`${t.chain}:${t.hash}:${t.logIndex}`;
  if((firm!=='all'&&t.firm!==firm)||time<board.start||time>through||seen.has(id))return false;
  seen.add(id);return true;
 }).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
 const totals=new Map(),reigns=[];let leader=null;
 for(let i=0;i<events.length;){
  const at=Date.parse(events[i].timestamp),changed=new Set();
  while(i<events.length&&Date.parse(events[i].timestamp)===at){const t=events[i++],address=canonicalTraderWallet(t.to);totals.set(address,(totals.get(address)||0n)+BigInt(t.raw));changed.add(address)}
  let next=leader;
  for(const address of changed)if(!next||totals.get(address)>totals.get(next)||(totals.get(address)===totals.get(next)&&address.localeCompare(next)<0))next=address;
  if(next!==leader){if(reigns.length)reigns[reigns.length-1].end=at;reigns.push({address:next,start:at,end:through,total:Number(totals.get(next))/1e6});leader=next}
 }
 const holders=new Map();
 for(const r of reigns){const h=holders.get(r.address)||{address:r.address,duration:0,count:0};h.duration+=Math.max(0,r.end-r.start);h.count++;holders.set(r.address,h)}
 return {reigns,holders:[...holders.values()].sort((a,b)=>b.duration-a.duration||a.address.localeCompare(b.address)),changes:Math.max(0,reigns.length-1),through};
}
export function leadDuration(ms){
 const minutes=Math.max(0,ms)/60000;
 if(minutes<1)return '<1 min';
 if(minutes<60)return Math.floor(minutes)+' min';
 if(minutes<1440)return Number((minutes/60).toFixed(1))+' hr';
 if(minutes<10080)return Number((minutes/1440).toFixed(1))+(minutes<1584?' day':' days');
 return Number((minutes/10080).toFixed(1))+(minutes<11088?' week':' weeks');
}
