import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {FLOW_SOURCES} from '../src/lib/flow-config.js';
import {seasonStart,seasonKey,seasonBoard,seasonEnd,validSeasonKey,seedSeason,SEASON_ONE} from '../src/lib/season-leaderboard.js';
const dest=process.argv[2]||'public/data',root='https://raw.githubusercontent.com/deciphe/massiveprop/vestflow-data/';
async function remote(path){const r=await fetch(root+path,{signal:AbortSignal.timeout(20000)});if(r.status===404)return null;if(!r.ok)throw Error(`Cannot preserve ${path}: ${r.status}`);return r.json();}
await mkdir(dest+'/seasons',{recursive:true});const snapshots={};
for(const source of FLOW_SOURCES){try{snapshots[source.slug]=JSON.parse(await readFile(`${dest}/${source.slug}.json`,'utf8'));}catch{snapshots[source.slug]=await remote(source.slug+'.json');}}
const prior=await remote('season-index.json')||{weeks:[]};const editions=new Map(prior.weeks.filter(w=>validSeasonKey(w.week)).map(w=>[w.week,w]));
for(const w of prior.weeks||[]){if(!validSeasonKey(w.week))continue;try{const old=await remote('seasons/'+w.week+'.json');if(old)await writeFile(`${dest}/seasons/${w.week}.json`,JSON.stringify(old));}catch(error){console.warn('Season archive preserve failed',w.week,error.message);}}
for(let start=SEASON_ONE;start<=seasonStart();start=seasonEnd(start)){const key=seasonKey(start);if(editions.get(key)?.closed)continue;
 let old=await remote('seasons/'+key+'.json');
 if(!old){const index=await remote('weekly-index.json');const archives=[];for(const w of index?.weeks||[]){if(w.start<seasonEnd(start)&&w.start+7*86400000>start){let a;try{a=JSON.parse(await readFile(`${dest}/weekly/${w.week}.json`,'utf8'));}catch{a=await remote('weekly/'+w.week+'.json');}if(a)archives.push(a);}}old=seedSeason(archives,start);}
 const board=seasonBoard(snapshots,start,Date.now(),old,'all');
 if(!board.available){console.warn('Season unavailable',key,board.missing);continue;}
 await writeFile(`${dest}/seasons/${key}.json`,JSON.stringify(board));editions.set(key,{week:key,start,season:board.season,closed:board.closed,asOf:board.asOf});}
await writeFile(dest+'/season-index.json',JSON.stringify({weeks:[...editions.values()].sort((a,b)=>b.start-a.start)}));
console.log(`Season editions: ${editions.size}`);
