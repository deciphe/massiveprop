import {BRAND_ASSETS} from './brand-assets.js';
import {canonicalTraderWallet,traderWallets} from './trader-wallets.js';
import {FLOW_CONFIGS,VEST_CHAINS,NOVA_WALLETS,FLOW_SOURCES} from './flow-config.js';
import {combineFlows} from './flow-metrics.js';
import {isPayoutRecipientTransfer} from './flow-classification.js';
export const WEEK=7*86400000;
export const WEEKLY_FIRMS=[{id:'vest',name:'Vest',logo:BRAND_ASSETS.vestSymbol,color:'#d4bc7d'},{id:'breakout',name:'Breakout',logo:BRAND_ASSETS.breakout,color:'#b2bfdc'},{id:'nova',name:'Hypernova',logo:BRAND_ASSETS.hypernova,color:'#bc9ed8'},{id:'propr',name:'Propr',logo:BRAND_ASSETS.propr,color:'#8fc5b5'}];
export const weeklySources=id=>id==='all'?FLOW_SOURCES:id==='vest'?VEST_CHAINS:id==='nova'?NOVA_WALLETS:FLOW_CONFIGS[id]?[FLOW_CONFIGS[id]]:[];
// Legacy Monday editions remain readable. Starting Oct 11, 2026, new weeks
// roll at Sunday 6 PM America/New_York (18:00 EDT/EST).
export const WEEKLY_CUTOVER=Date.parse('2026-10-11T22:00:00Z');
const oldWeekStart=time=>{const d=new Date(time);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.getTime()};
const easternOffset=time=>{
 const tz=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(new Date(time)).find(p=>p.type==='timeZoneName')?.value||'GMT-4';
 return Number(tz.match(/GMT([+-]\d+)/)?.[1]||-4);
};
const sundayAtSix=(time)=>{
 const d=new Date(time);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-d.getUTCDay());
 const noon=d.getTime()+12*3600000;
 return d.getTime()+(18-easternOffset(noon))*3600000;
};
export function weekStart(time=Date.now()){
 if(time<WEEKLY_CUTOVER)return oldWeekStart(time);
 const candidate=sundayAtSix(time);
 return time>=candidate?candidate:sundayAtSix(candidate-86400000);
}
export function weekEnd(start){
 if(start===Date.parse('2026-10-05T00:00:00Z'))return WEEKLY_CUTOVER;
 if(start<WEEKLY_CUTOVER)return start+WEEK;
 return sundayAtSix(start+8*86400000);
}
export const weekStartForKey=key=>{
 const day=Date.parse(key+'T00:00:00Z');
 if(!Number.isFinite(day))return NaN;
 return day>=Date.parse('2026-10-11T00:00:00Z')&&new Date(day).getUTCDay()===0?sundayAtSix(day):day;
};
export const weekKey=t=>new Date(t).toISOString().slice(0,10);
export function validSnapshot(d,s){return d?.complete&&d.wallet?.toLowerCase()===s.wallet.toLowerCase()&&d.chain===s.chain&&d.token?.toLowerCase()===s.token.toLowerCase()&&Array.isArray(d.transfers)&&Number.isFinite(Date.parse(d.periodStart))&&Number.isFinite(Date.parse(d.windowEnd||d.updatedAt));}
export function weeklyBoard(snapshots,start,now=Date.now(),duration=WEEK,firmId='all',{live=false}={}){
 const groups=WEEKLY_FIRMS.filter(f=>firmId==='all'||f.id===firmId).map(f=>{const sources=weeklySources(f.id),ds=sources.map(s=>snapshots[s.slug]);return {firm:f,sources,data:ds.every((d,i)=>validSnapshot(d,sources[i]))?combineFlows(ds,sources):null};});
 if(groups.some(g=>!g.data))return {available:false,missing:groups.filter(g=>!g.data).map(g=>g.firm.name)};
 const sources=groups.flatMap(g=>g.sources);
 const cutoffs=sources.map(s=>Math.min(now,Date.parse(snapshots[s.slug].windowEnd||snapshots[s.slug].updatedAt)));
 const completeThrough=Math.min(...cutoffs);
 const cutoff=live?Math.max(...cutoffs):completeThrough,finish=duration===WEEK?weekEnd(start):start+duration,end=Math.min(finish,cutoff);
 if(groups.some(g=>Date.parse(g.data.periodStart)>start))return {available:false,missing:['Complete history for this week']};
 if(end<start)return {available:false,missing:['A snapshot covering this week']};
 const seen=new Set(),transfers=[];
 for(const {firm,sources,data} of groups)for(const t of data.transfers){
  const time=Date.parse(t.timestamp),id=`${t.chain}:${t.hash}:${t.logIndex}`;
  const sourceCutoff=live?Math.max(...sources.filter(s=>s.chain===t.chain&&s.wallet.toLowerCase()===t.from.toLowerCase()).map(s=>Math.min(now,Date.parse(snapshots[s.slug].windowEnd||snapshots[s.slug].updatedAt)))):cutoff;
  if(time<start||time>=finish||time>sourceCutoff||seen.has(id)||!isPayoutRecipientTransfer(t,sources))continue;
  if(FLOW_SOURCES.some(s=>s.chain===t.chain&&s.wallet.toLowerCase()===t.to.toLowerCase()))continue;
  seen.add(id);transfers.push({...t,id,firm:firm.id,amount:Number(BigInt(t.raw))/1e6});
 }
 return {available:true,version:1,start,end,week:weekKey(start),closed:completeThrough>=finish,asOf:new Date(cutoff).toISOString(),completeThrough:new Date(completeThrough).toISOString(),transfers,coverage:sources.map(s=>({firm:s.id,source:s.slug,updatedAt:snapshots[s.slug].windowEnd||snapshots[s.slug].updatedAt})),methodology:'Eligible USDC recipient transfers; known firm wallets, bridges and dust excluded. Recipients and purpose are not independently verified.'};
}
export function rankWeekly(board,firm='all'){
 const wallets=new Map();for(const t of board?.transfers||[]){if(firm!=='all'&&t.firm!==firm)continue;
 const address=canonicalTraderWallet(t.to),r=wallets.get(address)||{address,addresses:traderWallets(address),raw:0n,count:0,firms:{},transfers:[],largest:0};
 r.raw+=BigInt(t.raw);r.count++;r.firms[t.firm]=(r.firms[t.firm]||0)+t.amount;r.largest=Math.max(r.largest,t.amount);r.transfers.push(t);wallets.set(address,r);
 }
 return [...wallets.values()].sort((a,b)=>a.raw===b.raw?a.address.localeCompare(b.address):a.raw>b.raw?-1:1).map((r,i)=>({...r,rank:i+1,total:Number(r.raw)/1e6,raw:String(r.raw),transfers:r.transfers.sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp))}));
}
