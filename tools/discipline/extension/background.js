// MASSIVE Discipline / self-contained MV3 API service worker.
// Key remains in extension-local Chrome storage, never in page scripts or GitHub.
const BASE = {test:"https://sandbox.myfundedperpetuals.com",live:"https://developers.myfundedperpetuals.com"};
const allowed = new Set(["health","accounts","markets","account","session","arm","preview","place","order-lookup"]);
const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const validNum=x=>x!==undefined&&x!==null&&x!==""&&Number.isFinite(Number(x));
const num=x=>Number(x);
const fail=(message)=>{throw Error(message);};
const storage=async()=>chrome.storage.local.get(["mfpApiKey","mfpSessions","mfpPending"]);
async function upstream(method,path,body,idempotency) {
  const {mfpApiKey:key}=await storage();
  if(!/^fp_(test|live)_[\w-]+$/.test(key||""))fail("Enter a valid MFP API key.");
  const env=key.startsWith("fp_test_")?"test":"live";
  if(env==="live")fail("Live order sending is disabled in this unverified build. Use a sandbox key.");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetch(BASE[env]+path,{
      method,signal:controller.signal,
      headers:{Authorization:"Bearer "+key,...(body?{"Content-Type":"application/json"}:{}),...(idempotency?{"Idempotency-Key":idempotency}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const raw=await response.text();let parsed;
    try{parsed=JSON.parse(raw);}catch{fail("MFP returned an unreadable response.");}
    if(!response.ok)fail(parsed?.error?.message||parsed?.message||"MFP rejected request ("+response.status+")");
    return parsed?.data??parsed;
  }finally{clearTimeout(timer);}
}
async function getAccount(id){if(!/^[\w|.:-]{1,120}$/.test(id||""))fail("Invalid account");return upstream("GET","/v1/accounts/"+encodeURIComponent(id));}
async function getPlan(id){const {mfpSessions={}}=await storage();const s=mfpSessions[id];if(!s||s.day!==day())fail("ARM today's session first.");return s;}
function checkOrder(o) {
 if(!o||!o.account_id||!o.market_id||!["buy","sell"].includes(o.side)||!["market","limit"].includes(o.type))fail("Account, market, side and type required");
 if(!validNum(o.size)||num(o.size)<=0||!validNum(o.leverage)||num(o.leverage)<=0)fail("Set a valid size and leverage.");
 if(o.type==="limit"&&(!validNum(o.limit_price)||num(o.limit_price)<=0))fail("A limit entry needs a valid price.");
 if(o.stop_loss_price!=null&&(!validNum(o.stop_loss_price)||num(o.stop_loss_price)<=0))fail("Invalid stop price");
 const result={account_id:o.account_id,market_id:o.market_id,side:o.side,type:o.type,size:num(o.size),leverage:num(o.leverage),margin_mode:o.margin_mode==="isolated"?"isolated":"cross"};
 if(o.type==="limit")result.limit_price=num(o.limit_price);
 if(o.stop_loss_price!=null)result.stop_loss_price=num(o.stop_loss_price);
 if(o.take_profit_price!=null&&validNum(o.take_profit_price)&&num(o.take_profit_price)>0)result.take_profit_price=num(o.take_profit_price);
 return result;
}
async function analyze(o) {
 const order=checkOrder(o),plan=await getPlan(order.account_id);
 const [account,quote,positions,orders]=await Promise.all([
   getAccount(order.account_id),
   upstream("GET","/v1/markets/"+encodeURIComponent(order.market_id)+"/quote?side="+order.side+"&size="+encodeURIComponent(order.size)),
   upstream("GET","/v1/positions?account_id="+encodeURIComponent(order.account_id)),
   upstream("GET","/v1/orders?account_id="+encodeURIComponent(order.account_id)+"&status=working")
 ]);
 if(account.status!=="active"||account.risk?.marks_complete!==true||!validNum(account.risk.equity))fail("Account or live equity marks unavailable. Entry held.");
 const entry=order.type==="limit"?order.limit_price:num(quote.estimated_fill_price||quote.mid);
 if(!(entry>0)||quote.fillable===false)fail("No fillable execution quote.");
 const stop=order.stop_loss_price;
 const validStop=stop>0&&(order.side==="buy"?stop<entry:stop>entry);
 const fee=validNum(quote.estimated_fee)?Math.max(0,num(quote.estimated_fee)):0;
 const slip=validNum(quote.slippage_bps)?Math.max(0,num(quote.slippage_bps)):0;
 const risk=validStop?Math.abs(entry-stop)*order.size+fee*2+stop*order.size*slip/10000:null;
 const pnl=num(account.risk.equity)-plan.startEquity,room=num(account.risk.max_drawdown_room);
 const reasons=[];
 if(!validStop)reasons.push({code:"stop",text:"Missing or invalid stop-loss"});
 if(risk!==null&&risk>plan.maxRisk)reasons.push({code:"risk",text:"Risk exceeds trade maximum"});
 if(pnl>=plan.target)reasons.push({code:"target",text:"Daily target reached"});
 if(pnl<=-plan.stop)reasons.push({code:"loss",text:"Daily stop reached"});
 if(risk!==null&&pnl-risk < -plan.stop)reasons.push({code:"projected",text:"Projected loss exceeds today's stop"});
 if(risk!==null&&Number.isFinite(room)&&risk>=room)reasons.push({code:"drawdown",text:"Risk consumes account drawdown buffer"});
 const arr=v=>Array.isArray(v)?v:Array.isArray(v?.data)?v.data:Array.isArray(v?.positions)?v.positions:Array.isArray(v?.orders)?v.orders:[];
 if(arr(positions).some(x=>x.market_id===order.market_id&&num(x.size)>0&&x.status!=="closed"))reasons.push({code:"existing_position",text:"An existing position requires native MFP management"});
 if(arr(orders).some(x=>x.market_id===order.market_id&&x.reduce_only!==true&&!["filled","canceled","rejected"].includes(x.status)))reasons.push({code:"working_entry",text:"Working order already in this market"});
 return {order,entry,risk,fee,slip,pnl,room,reasons,planDay:plan.day};
}
const pending=new Map();
async function route(m) {
 if(m.action==="connect"){
   const key=String(m.body?.api_key||"").trim();
   if(!/^fp_(test|live)_[\w-]+$/.test(key))fail("Paste a complete MFP key, beginning fp_test_");
   if(key.startsWith("fp_live_"))fail("Use a sandbox fp_test_ key for this build. Live trading remains disabled.");
   await chrome.storage.local.set({mfpApiKey:key,mfpSessions:{}});
   try {const accounts=await upstream("GET","/v1/accounts");return {accounts};}
   catch(e){await chrome.storage.local.remove("mfpApiKey");throw e;}
 }
 if(m.action==="health")return {ok:true,environment:"sandbox"};
 if(m.action==="accounts")return upstream("GET","/v1/accounts");
 if(m.action==="markets")return upstream("GET","/v1/markets");
 if(m.action==="account")return getAccount(m.query?.id);
 if(m.action==="session"){const p=await getPlan(m.query?.account_id),a=await getAccount(p.account_id);return {...p,session_pnl:num(a.risk.equity)-p.startEquity,drawdown_room:a.risk.max_drawdown_room};}
 if(m.action==="arm"){
   const x=m.body||{};if(!x.account_id||![x.target,x.stop,x.maxRisk].every(v=>validNum(v)&&num(v)>0))fail("Set account, target, stop and max trade risk.");
   const a=await getAccount(x.account_id);
   if(a.status!=="active"||a.risk?.marks_complete!==true||!validNum(a.risk.equity))fail("Account is not active or live marks unavailable.");
   const {mfpSessions={}}=await storage();const prior=mfpSessions[x.account_id];
   if(prior?.day===day())return prior;
   const s={account_id:x.account_id,day:day(),armed:true,startEquity:num(a.risk.equity),target:num(x.target),stop:num(x.stop),maxRisk:num(x.maxRisk),armedAt:Date.now()};
   mfpSessions[x.account_id]=s;await chrome.storage.local.set({mfpSessions});return s;
 }
 if(m.action==="preview"){
   const p=await analyze(m.body),id=crypto.randomUUID();
   pending.set(id,{...p,id,expires:Date.now()+20000,client:"massive-"+crypto.randomUUID(),idem:crypto.randomUUID(),used:false});
   for(const [key,v] of pending)if(v.expires<Date.now())pending.delete(key);
   return {preview_id:id,expires_at:Date.now()+20000,entry:p.entry,estimated_risk:p.risk,session_pnl:p.pnl,remaining_drawdown:p.room,fee_estimate:p.fee,slippage_bps:p.slip,reasons:p.reasons,allowed:p.reasons.length===0,day:p.planDay,estimate_only:true};
 }
 if(m.action==="place"){
   const p=pending.get(m.body?.preview_id);
   if(!p||p.expires<Date.now())fail("Preview expired. Start a fresh preview.");
   if(p.used)fail("This order was already submitted or is awaiting reconciliation. Do not duplicate.");
   if(p.reasons.length)fail("Order is outside your plan.");
   const fresh=await analyze(p.order);
   if(fresh.reasons.length||fresh.planDay!==p.planDay)fail("Account changed. Recheck order.");
   if(Math.abs(fresh.entry-p.entry)/p.entry>0.002)fail("Quote drifted more than 0.2%. Recheck.");
   p.used=true;
   const order={...p.order,client_order_id:p.client};
   if(order.type==="market")order.expected_price=fresh.entry;
   const {mfpPending={}}=await storage();mfpPending[p.client]={created:Date.now(),status:"submitted",account_id:p.order.account_id};
   await chrome.storage.local.set({mfpPending});
   try{const placed=await upstream("POST","/v1/orders",order,p.idem);return {submitted:true,order:placed,client_order_id:p.client};}
   catch(e){throw Error(e.message+" [Client order: "+p.client+"]");}
 }
 if(m.action==="order-lookup"){
   const cid=m.query?.client_order_id;
   if(!/^massive-[\da-f-]{36}$/.test(cid||""))fail("Invalid client order ID");
   return upstream("GET","/v1/orders?client_order_id="+encodeURIComponent(cid));
 }
 fail("Unsupported action");
}
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
 if(m?.kind!=="MASSIVE_BRIDGE")return;
 if(!sender.tab?.url||!/^https:\/\/(www\.)?myfundedperpetuals\.com\/trade(?:\/|$)/.test(sender.tab.url))return respond({error:"Not an authorized MFP trading tab"});
 if(m.action!=="connect"&&!allowed.has(m.action))return respond({error:"Invalid action"});
 route(m).then(data=>respond({data})).catch(e=>respond({error:e.message||"Request failed"}));
 return true;
});