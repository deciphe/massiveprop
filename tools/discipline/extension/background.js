// Credentials and execution live exclusively in the extension worker.
const BASE='https://sandbox.myfundedperpetuals.com';
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const valid=x=>x!==undefined&&x!==null&&x!==''&&Number.isFinite(Number(x));
const fail=m=>{throw Error(m)};
const list=v=>Array.isArray(v)?v:v?.accounts||v?.markets||v?.positions||v?.orders||[];
const read=()=>chrome.storage.local.get(['mfpApiKey','mfpSessions','mfpPending','mfpPreviews','mfpOverrides']);
async function upstream(method,path,body,idempotency){
 const {mfpApiKey:key}=await read();
 if(!/^fp_test_[\w-]+$/.test(key||''))fail('Connect a sandbox API key first.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(BASE+path,{method,signal:controller.signal,headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let value;try{value=JSON.parse(await response.text())}catch{fail('Unreadable API response. Check order history before repeating a submission.')}
  if(!response.ok)fail(value?.error?.message||value?.message||'API request rejected ('+response.status+')');
  return value?.data??value;
 }finally{clearTimeout(timer)}
}
function id(x){if(!/^[\w|.:-]{1,120}$/.test(x||''))fail('Invalid account or market');return encodeURIComponent(x)}
const account=x=>upstream('GET','/v1/accounts/'+id(x));
async function plan(x){const {mfpSessions={}}=await read();const p=mfpSessions[x];if(!p||p.day!==day())fail('Arm this account for today first.');return p}
function orderCheck(o){
 if(!o||!['buy','sell'].includes(o.side)||!['market','limit'].includes(o.type))fail('Choose side and order type.');
 id(o.account_id);id(o.market_id);
 if(![o.size,o.leverage].every(x=>valid(x)&&Number(x)>0))fail('Size and leverage must be positive.');
 const r={account_id:o.account_id,market_id:o.market_id,side:o.side,type:o.type,size:Number(o.size),leverage:Number(o.leverage),margin_mode:o.margin_mode==='isolated'?'isolated':'cross'};
 for(const k of ['limit_price','stop_loss_price','take_profit_price'])if(o[k]!=null){if(!valid(o[k])||Number(o[k])<=0)fail('Invalid '+k.replaceAll('_',' '));r[k]=Number(o[k])}
 if(r.type==='limit'&&!r.limit_price)fail('Set a limit entry price.');
 return r;
}
async function analyze(input){
 const order=orderCheck(input),p=await plan(order.account_id);
 const markets=list(await upstream('GET','/v1/markets')),market=markets.find(m=>(m.id||m.market_id)===order.market_id);
 if(!market)fail('Market is unavailable.');
 if(valid(market.max_leverage)&&order.leverage>Number(market.max_leverage))fail('Leverage exceeds this market limit.');
 if(valid(market.min_size)&&order.size<Number(market.min_size))fail('Size is below this market minimum.');
 if(valid(market.size_step)){const units=order.size/Number(market.size_step);if(Math.abs(units-Math.round(units))>1e-7)fail('Size must follow the market size step.');}
 const [a,q,positions,orders]=await Promise.all([account(order.account_id),upstream('GET','/v1/markets/'+id(order.market_id)+'/quote?side='+order.side+'&size='+order.size),upstream('GET','/v1/positions?account_id='+id(order.account_id)),upstream('GET','/v1/orders?account_id='+id(order.account_id)+'&status=working')]);
 if(a.status!=='active'||a.risk?.marks_complete!==true||!valid(a.risk.equity)||!valid(a.risk.max_drawdown_room))fail('Live account risk marks unavailable. Entry held.');
 const entry=order.type==='limit'?order.limit_price:Number(q.estimated_fill_price||q.mid);
 if(!(entry>0)||q.fillable===false)fail('No fillable execution quote.');
 if(valid(market.min_notional)&&entry*order.size<Number(market.min_notional))fail('Order is below minimum notional.');
 const stop=order.stop_loss_price,goodStop=stop>0&&(order.side==='buy'?stop<entry:stop>entry);
 if(order.take_profit_price&&(order.side==='buy'?order.take_profit_price<=entry:order.take_profit_price>=entry))fail('Take profit must be on the profitable side of entry.');
 const fee=valid(q.estimated_fee)?Math.max(0,Number(q.estimated_fee)):0,slip=valid(q.slippage_bps)?Math.max(0,Number(q.slippage_bps)):valid(q.reference_price)&&Number(q.reference_price)>0?Math.abs(Number(q.estimated_fill_price||entry)-Number(q.reference_price))/Number(q.reference_price)*10000:0;
 const risk=goodStop?Math.abs(entry-stop)*order.size+2*fee+stop*order.size*slip/10000:null;
 const pnl=Number(a.risk.equity)-p.startEquity,room=Number(a.risk.max_drawdown_room),reasons=[];
 const add=(code,text,hard=false)=>reasons.push({code,text,hard});
 if(!goodStop)add('stop','Set a protective stop on the loss side.',true);
 if(risk>p.maxRisk)add('risk','Trade risk exceeds your plan.');
 if(pnl>=p.target)add('target','Your daily target is reached.');
 if(pnl<=-p.stop)add('loss','Your daily stop is reached.');
 if(risk!==null&&pnl-risk < -p.stop)add('projected','This stop would exceed your daily budget.');
 if(risk!==null&&risk>=room)add('drawdown','Risk consumes the account drawdown buffer.',true);
 if(list(positions).some(x=>x.market_id===order.market_id&&Number(x.size)>0&&x.status!=='closed'))add('existing_position','Manage the existing position in MFP.',true);
 if(list(orders).some(x=>x.market_id===order.market_id&&x.reduce_only!==true&&!['filled','canceled','cancelled','rejected'].includes(x.status)))add('working_entry','An entry is already working in this market.',true);
 const {mfpPending={}}=await read();
 if(Object.values(mfpPending).some(x=>x.account_id===order.account_id&&x.market_id===order.market_id&&x.status==='unknown'))add('unresolved','Reconcile the earlier submission first.',true);
 return {order,entry,risk,fee,slip,pnl,room,reasons,planDay:p.day};
}
function publicPreview(p){return {preview_id:p.id,expires_at:p.expires,entry:p.entry,estimated_risk:p.risk,session_pnl:p.pnl,remaining_drawdown:p.room,fee_estimate:p.fee,slippage_bps:p.slip,reasons:p.reasons,allowed:!p.reasons.length,overrideable:p.reasons.length>0&&!p.reasons.some(x=>x.hard),day:p.planDay}}
async function preview(body){const p={...await analyze(body),id:crypto.randomUUID(),expires:Date.now()+60000,client:'massive-'+crypto.randomUUID(),idem:crypto.randomUUID(),used:false,confessions:0};const {mfpPreviews={}}=await read();for(const [k,v]of Object.entries(mfpPreviews))if(v.expires<Date.now())delete mfpPreviews[k];mfpPreviews[p.id]=p;await chrome.storage.local.set({mfpPreviews});return publicPreview(p)}
async function place(pid){
 const {mfpPreviews={},mfpPending={}}=await read(),p=mfpPreviews[pid];
 if(!p||p.expires<Date.now())fail('Preview expired. Check the order again.');
 if(p.used)fail('Already submitted. Reconcile this order; do not repeat it.');
 const {mfpOverrides={}}=await read(),over=mfpOverrides[p.order.account_id]?.day===day();
 if(p.reasons.some(x=>x.hard)||p.reasons.length&&!over)fail('Order held by your plan.');
 const fresh=await analyze(p.order);
 if(fresh.planDay!==p.planDay||fresh.reasons.some(x=>x.hard)||fresh.reasons.length&&!over)fail('Account changed. Check the order again.');
 if(Math.abs(fresh.entry-p.entry)/p.entry>.002)fail('Quote moved more than 0.2%. Check again.');
 p.used=true;mfpPreviews[pid]=p;mfpPending[p.client]={created:Date.now(),status:'unknown',account_id:p.order.account_id,market_id:p.order.market_id};
 await chrome.storage.local.set({mfpPreviews,mfpPending});
 const order={...p.order,client_order_id:p.client,...(p.order.type==='market'?{expected_price:fresh.entry}:{})};
 try{const placed=await upstream('POST','/v1/orders',order,p.idem);mfpPending[p.client].status='accepted';await chrome.storage.local.set({mfpPending});return {submitted:true,order:placed,client_order_id:p.client}}
 catch(e){throw Error(e.message+' [Client order: '+p.client+']')}
}
async function route(m){
 const x=m.body||{},query=m.query||{};
 switch(m.action){
 case 'connect':{
  const key=String(x.api_key||'').trim();if(!/^fp_test_[\w-]+$/.test(key))fail('Use an fp_test_ sandbox API key.');
  const prior=await read();await chrome.storage.local.set({mfpApiKey:key});
  try{const accounts=await upstream('GET','/v1/accounts');if(prior.mfpApiKey!==key)await chrome.storage.local.set({mfpOverrides:{},mfpPreviews:{}});return {accounts}}
  catch(e){if(prior.mfpApiKey)await chrome.storage.local.set({mfpApiKey:prior.mfpApiKey});else await chrome.storage.local.remove('mfpApiKey');throw e}
 }
 case 'disconnect':await chrome.storage.local.remove(['mfpApiKey','mfpPreviews','mfpOverrides']);return {ok:true};
 case 'accounts':return upstream('GET','/v1/accounts');
 case 'markets':return upstream('GET','/v1/markets');
 case 'account':return account(query.id);
 case 'session':{const p=await plan(query.account_id),a=await account(p.account_id);if(!valid(a.risk?.equity))fail('Equity unavailable');return {...p,session_pnl:Number(a.risk.equity)-p.startEquity,drawdown_room:a.risk.max_drawdown_room}}
 case 'arm':{
  if(![x.target,x.stop,x.maxRisk].every(v=>valid(v)&&Number(v)>0))fail('Plan values must be positive.');
  const a=await account(x.account_id);if(a.status!=='active'||a.risk?.marks_complete!==true||!valid(a.risk.equity))fail('Account marks unavailable.');
  const {mfpSessions={},mfpOverrides={}}=await read();let p=mfpSessions[x.account_id];
  if(p?.day!==day())p={account_id:x.account_id,day:day(),startEquity:Number(a.risk.equity),target:Number(x.target),stop:Number(x.stop),maxRisk:Number(x.maxRisk),armedAt:Date.now()};
  mfpSessions[x.account_id]=p;delete mfpOverrides[x.account_id];await chrome.storage.local.set({mfpSessions,mfpOverrides});return p;
 }
 case 'preview':return preview(x);
 case 'place':return place(x.preview_id);
 case 'confess':{
  const {mfpPreviews={},mfpOverrides={}}=await read(),p=mfpPreviews[x.preview_id];
  if(!p||p.used||!p.reasons.length||p.reasons.some(r=>r.hard))fail('This order cannot be overridden.');
  if(String(x.phrase||'').trim().toLowerCase()!=='i am a degen')fail('Type I am a degen.');
  p.confessions=Math.min(10,p.confessions+1);p.expires=Date.now()+600000;
  if(p.confessions===10)mfpOverrides[p.order.account_id]={day:day(),at:Date.now()};
  await chrome.storage.local.set({mfpPreviews,mfpOverrides});return {step:p.confessions,unlocked:p.confessions===10};
 }
 case 'order-lookup':{
  const cid=query.client_order_id;if(!/^massive-[\da-f-]{36}$/.test(cid||''))fail('Invalid client order ID');
  const orders=await upstream('GET','/v1/orders?client_order_id='+encodeURIComponent(cid)),matched=list(orders).find(o=>o.client_order_id===cid);
  if(matched){const {mfpPending={}}=await read();if(mfpPending[cid]){mfpPending[cid].status=matched.status||'accepted';await chrome.storage.local.set({mfpPending})}}
  return orders;
 }
 case 'pending':{const {mfpPending={}}=await read();return Object.entries(mfpPending).filter(([,p])=>p.status==='unknown').map(([client_order_id,p])=>({client_order_id,...p}))}
 default:fail('Unsupported action');
 }
}
// Serialize messages so two tabs cannot pass the same preview's used check.
let queue=Promise.resolve();
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
 if(m?.kind!=='MASSIVE_BRIDGE')return;
 const url=sender.tab?.url||sender.url||'';
 if(sender.id!==chrome.runtime.id||!(/^https:\/\/(www\.)?myfundedperpetuals\.com\/trade(?:\/|$)/.test(url)||url.startsWith(chrome.runtime.getURL(''))))return respond({error:'Unauthorized extension context'});
 const work=queue.then(()=>route(m));queue=work.catch(()=>{});work.then(data=>respond({data})).catch(e=>respond({error:e.message||'Request failed'}));return true;
});
