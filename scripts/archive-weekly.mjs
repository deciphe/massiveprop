import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {VEST_CHAINS as FLOW_SOURCES} from '../src/lib/flow-config.js';
import {weekStart,weekKey,WEEK,weeklyBoard} from '../src/lib/weekly-leaderboard.js';
const dest=process.argv[2]||'public/data',root='https://raw.githubusercontent.com/deciphe/massiveprop/vestflow-data/';
await mkdir(dest+'/weekly',{recursive:true});const snapshots={};
for(const source of FLOW_SOURCES){try{snapshots[source.slug]=JSON.parse(await readFile(`${dest}/${source.slug}.json`,'utf8'));}catch{try{const r=await fetch(root+source.slug+'.json');if(r.ok)snapshots[source.slug]=await r.json();}catch{}}}
let prior={weeks:[]};const indexResponse=await fetch(root+'weekly-index.json',{signal:AbortSignal.timeout(20000)});if(indexResponse.ok)prior=await indexResponse.json();else if(indexResponse.status!==404)throw Error('Cannot preserve existing weekly index: '+indexResponse.status);
for(const w of prior.weeks||[]){try{const r=await fetch(root+'weekly/'+w.week+'.json',{signal:AbortSignal.timeout(20000)});if(r.ok)await writeFile(`${dest}/weekly/${w.week}.json`,await r.text());else if(r.status!==404)throw Error('Cannot preserve weekly/'+w.week+'.json: '+r.status);}catch(error){console.warn('Weekly archive preserve failed',w.week,error.message);}}
const weeks=new Map((prior.weeks||[]).map(w=>[w.week,w]));
for(let offset=0;offset<5;offset++){
 let start=weekStart();for(let n=0;n<offset;n++)start=weekStart(start-1);const key=weekKey(start);
 if(weeks.get(key)?.closed)continue;
 const board=weeklyBoard(snapshots,start,Date.now(),WEEK,'vest');if(!board.available)continue;
 await writeFile(`${dest}/weekly/${key}.json`,JSON.stringify(board));
 weeks.set(key,{week:key,start,closed:board.closed,asOf:board.asOf});
}
await writeFile(dest+'/weekly-index.json',JSON.stringify({weeks:[...weeks.values()].sort((a,b)=>b.start-a.start)}));
console.log(`Weekly editions: ${weeks.size}`);
