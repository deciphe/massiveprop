import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const code=readFileSync(new URL('../extension/background.js',import.meta.url),'utf8');
const db={};let listener,posts=0,failPost=false,equity=10000,quote=100;
const local={get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(db[k])])),set:async v=>Object.assign(db,structuredClone(v)),remove:async keys=>(Array.isArray(keys)?keys:[keys]).forEach(k=>delete db[k])};
function start(){const chrome={storage:{local},runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener:f=>listener=f}}};vm.runInNewContext(code,{chrome,crypto:webcrypto,Intl,Date,Number,String,Object,Array,Set,Promise,Error,AbortController,setTimeout,clearTimeout,fetch:async(url,opt)=>{let data;if(url.endsWith('/v1/accounts'))data=[{id:'a',status:'active'}];else if(url.endsWith('/v1/markets'))data=[{market_id:'btc',max_leverage:10,min_size:.001,size_step:.001,min_notional:10}];else if(url.includes('/v1/accounts/'))data={id:'a',status:'active',risk:{equity,marks_complete:true,max_drawdown_room:1000}};else if(url.includes('/quote'))data={mid:quote,estimated_fee:1,slippage_bps:0,fillable:true};else if(opt.method==='POST'){posts++;if(failPost)throw Error('Network lost');data={status:'working',client_order_id:JSON.parse(opt.body).client_order_id}}else data=[];return {ok:true,text:async()=>JSON.stringify({data})}}})}
const send=(action,body=null,query=null)=>new Promise(resolve=>listener({kind:'MASSIVE_BRIDGE',action,body,query},{id:'test',url:'chrome-extension://test/popup.html'},resolve));
const ok=async(...args)=>{const r=await send(...args);assert.ok(!r.error,r.error);return r.data};
start();await ok('connect',{api_key:'fp_test_fixture'});await ok('arm',{account_id:'a',target:400,stop:400,maxRisk:100});
const order={account_id:'a',market_id:'btc',side:'buy',type:'market',size:1,leverage:2,stop_loss_price:90,take_profit_price:120};
let p=await ok('preview',order);assert.equal(p.allowed,true);
// Preview survives MV3 worker suspension.
start();const [one,two]=await Promise.all([send('place',{preview_id:p.preview_id}),send('place',{preview_id:p.preview_id})]);assert.ok(one.data);assert.match(two.error,/Already submitted/);assert.equal(posts,1);
// Re-arm cannot reset losses or loosen the same-day plan.
equity=9850;await ok('arm',{account_id:'a',target:999,stop:999,maxRisk:999});const sess=await ok('session',null,{account_id:'a'});assert.equal(sess.session_pnl,-150);assert.equal(sess.maxRisk,100);
p=await ok('preview',{...order,size:11});assert.equal(p.overrideable,true);assert.ok((await send('place',{preview_id:p.preview_id})).error);
assert.ok((await send('confess',{preview_id:p.preview_id,phrase:'wrong'})).error);
for(let i=1;i<=10;i++){const gate=await ok('confess',{preview_id:p.preview_id,phrase:'I am a degen'});assert.equal(gate.step,i);assert.equal(gate.unlocked,i===10)}
await ok('place',{preview_id:p.preview_id});assert.equal(posts,2);
// Override never removes the protective-stop and drawdown checks.
p=await ok('preview',{...order,stop_loss_price:110});assert.equal(p.overrideable,false);assert.ok((await send('place',{preview_id:p.preview_id})).error);
assert.ok((await send('preview',{...order,take_profit_price:90})).error);
await ok('arm',{account_id:'a',target:400,stop:400,maxRisk:100});
// An ambiguous submission persists and blocks another entry in that market.
p=await ok('preview',order);failPost=true;const lost=await send('place',{preview_id:p.preview_id});assert.match(lost.error,/Client order: massive-/);start();p=await ok('preview',order);assert.ok(p.reasons.some(r=>r.code==='unresolved'));assert.ok((await send('place',{preview_id:p.preview_id})).error);
assert.ok((await send('connect',{api_key:'fp_live_forbidden'})).error);
console.log('PASS: durable previews, concurrent send deduplication, immutable day plan, ten-step override, protective checks, ambiguous-order recovery, sandbox-only keys.');
