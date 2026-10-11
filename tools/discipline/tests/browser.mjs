import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.MASSIVE_PLAYWRIGHT_MODULE||'playwright');
const root=resolve('tools/discipline/extension'),out=resolve('artifacts/discipline');mkdirSync(out,{recursive:true});
const mock=`const db={};let handler;globalThis.chrome={runtime:{id:'fixture',getURL:p=>location.origin+'/'+p,onMessage:{addListener:f=>handler=f},sendMessage:m=>new Promise(r=>handler(m,{id:'fixture',tab:{url:'https://myfundedperpetuals.com/trade/BTC'}},r))},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(db[k])])),set:async v=>Object.assign(db,structuredClone(v)),remove:async keys=>(Array.isArray(keys)?keys:[keys]).forEach(k=>delete db[k])},onChanged:{addListener:()=>{}}}};`;
const server=createServer((req,res)=>{const path=req.url.split('?')[0];if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#161617;color:#eeeae2;font:14px Arial}#terminal{padding:35px}</style><div id="terminal">MFP trading terminal / fixture</div><script src="/mock.js"></script><script src="/background.js"></script><script src="/panel.js"></script>');return}if(path==='/mock.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(mock);return}try{const p=join(root,path);const data=readFileSync(p);res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css':'font/ttf');res.end(path==='/panel.js'?data.toString().replace("mode:'closed'","mode:'open'"):data)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.MASSIVE_CHROME?{executablePath:process.env.MASSIVE_CHROME}:{}),args:['--no-sandbox']});
let report=[];
try{
for(const [width,height]of [[1440,1000],[1280,720],[390,844],[320,568]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));let posts=0;
 await page.route('https://sandbox.myfundedperpetuals.com/**',async route=>{const u=route.request().url(),method=route.request().method();let data;if(u.endsWith('/v1/accounts'))data=[{id:'account-demo',name:'MASSIVE / sandbox',status:'active'}];else if(u.includes('/v1/accounts/'))data={status:'active',risk:{equity:10000,marks_complete:true,max_drawdown_room:1000}};else if(u.endsWith('/v1/markets'))data=[{market_id:'binance|BTCUSDT',symbol:'BTC',max_leverage:10,min_size:.001}];else if(u.includes('/quote'))data={mid:100,estimated_fee:1,slippage_bps:0,fillable:true};else if(method==='POST'){posts++;data={status:'working',client_order_id:route.request().postDataJSON().client_order_id}}else if(u.includes('client_order_id='))data=[{status:'filled',client_order_id:decodeURIComponent(u.split('client_order_id=')[1])}];else data=[];await route.fulfill({json:{data}})});
 await page.goto(url);const app=page.locator('#massive-discipline-root');
 const click=action=>app.locator('[data-action="'+action+'"]').click();
 const fill=(name,value)=>app.locator('[name="'+name+'"]').fill(String(value));
 async function capture(name){await page.evaluate(()=>document.fonts.ready);const overflow=await app.evaluate(host=>{const a=host.shadowRoot.querySelector('.window');return {width:a.clientWidth,scroll:a.scrollWidth,body:document.documentElement.scrollWidth,viewport:innerWidth}});assert.ok(overflow.scroll<=overflow.width+1,JSON.stringify(overflow));assert.ok(overflow.body<=overflow.viewport+1);await app.screenshot({path:join(out,width+'-'+name+'.png')});report.push({viewport:width+'x'+height,view:name,horizontalOverflow:false})}
 await capture('connect');await fill('mfpApiKey','fp_test_fixture');await click('connect');await app.locator('[data-action="arm"]').waitFor();await capture('plan');await click('arm');await app.locator('[data-action="preview"]').waitFor();await capture('ticket');
 await fill('size',1);await fill('sl',90);await fill('tp',120);await click('preview');await app.locator('[data-action="submit"]').waitFor();await capture('confirm');await click('submit');await app.locator('[data-action="reconcile"]').waitFor();await click('reconcile');await app.getByText('filled',{exact:true}).waitFor();assert.equal(posts,1);await capture('receipt');await click('back');
 await fill('size',11);await click('preview');await app.locator('[name="phrase"]').waitFor();await capture('gate');
 for(let i=1;i<=10;i++){await fill('phrase','I am a degen');await click('confess');if(i<10)await app.locator('[name="phrase"]').waitFor();}
 await app.getByText('10 / 10 ACKNOWLEDGED').waitFor();await capture('override');await click('back');await app.getByText('OVERRIDE ACTIVE',{exact:true}).waitFor();await capture('override-ticket');await click('history');await capture('trader-card');
 await click('back-history');await click('rearm');await app.getByText('PLAN ENGAGED',{exact:true}).waitFor();await click('collapse');await app.locator('.dock').waitFor();await click('expand');await app.locator('[data-action="preview"]').waitFor();
 // Invalid protective stop cannot enter the override gate.
 await fill('sl',110);await click('preview');await app.getByText('ENTRY HELD',{exact:true}).waitFor();await capture('held');assert.equal(await app.locator('[name="phrase"]').count(),0);
 assert.deepEqual(errors,[]);await page.close();
}
writeFileSync(join(out,'report.json'),JSON.stringify({passed:true,checks:report.length,results:report},null,2));console.log('PASS: '+report.length+' visual checks; complete connect, arm, send, reconcile, ten-step override, record, restore, collapse and protective hold flows at four viewport sizes.');
}finally{await browser.close();await new Promise(r=>server.close(r))}
