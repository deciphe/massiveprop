import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fetchFlow,fetchContractBalance} from '../src/lib/flow-data.js';
import {FLOW_SOURCES} from '../src/lib/flow-config.js';
const dest=process.argv[2]||'public/data';
await mkdir(dest,{recursive:true});
const results=[];
// Publish successful sources independently; preserve explicit stale fallbacks.
const isSnapshot=(d,c)=>d?.complete&&d.wallet===c.wallet&&d.token===c.token&&d.chain===c.chain&&Array.isArray(d.transfers);
for(const [i,config] of FLOW_SOURCES.entries()){
 let previous;
 try{previous=JSON.parse(await readFile(`${dest}/${config.slug}.json`,'utf8'));}catch{}
 try{
  const response=await fetch(`https://raw.githubusercontent.com/deciphe/massiveprop/vestflow-data/${config.slug}.json`,{signal:AbortSignal.timeout(15000)});
  if(response.ok){const remote=await response.json();if(!previous||Date.parse(remote.updatedAt)>Date.parse(previous.updatedAt))previous=remote;}
 }catch{}
 try{const bundled=JSON.parse(await readFile(new URL(`../public/data/${config.slug}.json`,import.meta.url),'utf8'));if(!previous||Date.parse(bundled.updatedAt)>Date.parse(previous.updatedAt))previous=bundled;}catch{}
 try{
  let snapshot;
  try{snapshot=await fetchFlow(config,{previous,signal:AbortSignal.timeout(config.id==='vest'?90000:30000),historyDays:32,includeBalance:true,onProgress:page=>{if(page%10===0)console.log(`${config.title} / ${config.chain}: page ${page}`);}});}
  catch(error){
   if(!config.balanceRpcs||!previous?.complete)throw error;
   // Keep transfer timestamps unchanged when only the contract balance can refresh.
   snapshot={...previous,...await fetchContractBalance(config),transferRefreshFailed:true};
   console.warn(`${config.title} / ${config.chain}: transfer refresh unavailable; refreshed onchain balance only.`);
  }
  await writeFile(`${dest}/${config.slug}.json`,JSON.stringify(snapshot));
  console.log(`${config.title} / ${config.chain}: ${snapshot.transfers.length} transfers; balance ${snapshot.balance} USDC`);
  if(snapshot.transferRefreshFailed)console.warn(`::warning::${config.slug}: retained transfer snapshot from ${snapshot.windowEnd||snapshot.updatedAt}`);
  results.push({status:'fulfilled'});
 }catch(error){
  console.error(`${config.title} / ${config.chain}:`,error);
  if(isSnapshot(previous,config)){
   await writeFile(`${dest}/${config.slug}.json`,JSON.stringify({...previous,transferRefreshFailed:true}));
   console.warn(`::warning::${config.slug}: live refresh failed; preserved ${previous.windowEnd||previous.updatedAt}`);
   results.push({status:'preserved'});
  }else results.push({status:'rejected',reason:error});
 }
 // Blockscout public endpoints are shared by several tracked wallets. Avoid burst-rate limiting.
 if(i<FLOW_SOURCES.length-1)await new Promise(resolve=>setTimeout(resolve,1200));
}
if(results.some(result=>result.status==='rejected'))process.exitCode=1;
