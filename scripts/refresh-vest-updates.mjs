import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const target='public/data/vest-updates.json',index='https://docs.vestmarkets.com/llms.txt';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const clean=s=>s.replace(/\r/g,'').replace(/\{%[\s\S]*?%\}/g,'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const read=async url=>{const r=await fetch(url,{headers:{'User-Agent':'MASSIVE-DocsWatch/1.0','Accept':'text/plain'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(url+' returned '+r.status);return r.text()};
const original=JSON.parse(await fs.readFile(target,'utf8'));const state={...original,snapshots:{...(original.snapshots||{})},updates:[...(original.updates||[])]};
state.appNotices={...(original.appNotices||{})};

/* Public Vest frontend: announcements are localized in the shipped Vite bundle,
   not the trading API. Track each announcement text, not the bundle filename. */
async function scanAppNotices(){
 const page=await read('https://next.vestmarkets.com/');
 const entry=page.match(/(?:src=["'])([^"']*\/assets\/index-[^"']+\.js)(?:["'])/i)?.[1]
   ||page.match(/(?:src=["'])([^"']*\/mtx\/static\/[^"']+\.js)(?:["'])/i)?.[1];
 if(!entry)throw Error('Vest JS entry not discoverable from public HTML');
 const bundleUrl=new URL(entry,'https://next.vestmarkets.com/').href;
 const bundle=await read(bundleUrl);
 if(!bundle.includes('stopLossTitle')&&!bundle.includes('announcement:{'))throw Error('Announcement strings absent from entry; bundle structure changed');
 const start=bundle.indexOf('announcement:{');
 if(start<0)throw Error('Announcement object missing');
 const end=bundle.indexOf('},shared:{',start);
 if(end<0||end-start>15000)throw Error('Announcement object boundary changed');
 const raw=bundle.slice(start+'announcement:{'.length,end);
 const fields={};
 for(const match of raw.matchAll(/(\w+):("(?:\\.|[^"\\])*")(?=,|$)/g)){
  try{fields[match[1]]=JSON.parse(match[2])}catch{}
 }
 const notices=[
  ['stopLossTitle','stopLoss','Execution','inapp-stoploss-mid','Stop activation uses the mid price, but execution can still differ due to liquidity and slippage.'],
  ['fundingTitle','funding','Funding','inapp-funding-index','Review funding mechanics and normalization intervals before holding positions across funding events.']
 ];
 const seen=new Set;
 for(const [titleKey,textKey,category,seedId,impact] of notices){
  const title=fields[titleKey],message=fields[textKey];if(!title||!message)continue;
  const exact=message.replace(/<Docs>(.*?)<\/Docs>/g,'$1').replace(/<[^>]+>/g,'').trim();
  const noticeKey=titleKey;
  const digest=hash(title+'\n'+message);
  seen.add(noticeKey);
  const before=state.appNotices[noticeKey];
  state.appNotices[noticeKey]={hash:digest,title,body:exact,seenAt:now};
  if(!before){ // initial baseline: two in-app notices already represented in curated feed
   const known=state.updates.find(x=>x.id===seedId);
   if(known){known.originalText=exact;known.origin='Vest in-app announcement · verified in public JS';known.source=bundleUrl}
   else state.updates.unshift({id:hash(noticeKey+digest).slice(0,16),title,category,date:null,origin:'Vest in-app announcement · first observed',source:bundleUrl,summary:exact,impact,details:[exact],observed:true});
  }else if(before.hash!==digest){
   state.updates.unshift({id:hash(noticeKey+digest).slice(0,16),title,category,date:now,origin:'Changed Vest in-app announcement · detected',source:bundleUrl,summary:exact,impact,details:[exact],observed:true});
  }
 }
 if(!seen.size)throw Error('Found announcement object but no recognized notices');
 state.appCheckedAt=now;
 state.appSource=bundleUrl;
 console.log('Vest app announcements verified:',[...seen].join(', '));
}
try{await scanAppNotices()}catch(e){console.warn('App notices scan skipped:',e.message)}

const indexText=await read(index);
const links=[...indexText.matchAll(/\]\((https:\/\/docs\.vestmarkets\.com\/[^)]+\.md)\)/g)].map(x=>x[1]);
if(links.length<8)throw Error('Documentation index unexpectedly small; keeping previous dataset');
const now=new Date().toISOString();let changed=0,ok=0;
for(const url of [...new Set(links)]){
 try{
  const md=await read(url);if(md.length<80)continue;ok++;
  const body=md.replace(/\{%[\s\S]*?%\}/g,'').replace(/^Last updated .*$/gim,'').trim();
  const digest=hash(body);const before=state.snapshots[url];
  if(before?.hash===digest)continue;
  const title=(body.match(/^#\s+(.+)$/m)||[])[1]||url.split('/').pop().replace('.md','').replace(/-/g,' ');
  const lines=body.split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')&&!s.startsWith('|')&&!s.startsWith('---')&&!s.startsWith('!['));
  const relevant=lines.filter(s=>!/^(previous|next|on this page|table of contents|\[.*\]\(.*\))$/i.test(s));
  const previousLines=new Set(before?.lines||[]);
  const additions=before?relevant.filter(s=>!previousLines.has(s)):relevant;
  state.snapshots[url]={hash:digest,lines:relevant.slice(0,300)};
  if(!before)continue; // establish a baseline; never present existing rules as new announcements
  changed++;
  const excerpts=additions.map(clean).filter(s=>s.length>=22).slice(0,5);
  const summary=excerpts.slice(0,2).join(' ').slice(0,380)||'The source documentation was revised. Open the original page to inspect the latest rules.';
  const section=url.includes('funding')?'Funding':url.includes('order')||url.includes('market')?'Execution':url.includes('loss')||url.includes('capital')?'Prop rules':url.includes('notice')||url.includes('incident')?'Notices':'Documentation';
  const item={id:hash(url+digest).slice(0,16),title:title+' — documentation revised',category:section,date:now,origin:'Detected documentation revision',source:url.replace(/\.md$/,''),summary,impact:'Review the source before acting. Highlighted additions may include clarifications as well as rule changes.',details:excerpts.slice(0,4),observed:false};
  state.updates.unshift(item);
 }catch(e){console.warn('Source skipped:',url,e.message)}
}
if(ok<Math.ceil(links.length/2))throw Error('Too many documentation pages unavailable; no data published');
state.checkedAt=now;state.sourcesTracked=ok;state.updates=state.updates.slice(0,120);
await fs.writeFile(target,JSON.stringify(state,null,2)+'\n');
console.log('Checked',ok,'sources. Revised:',changed,'Total feed items:',state.updates.length);
