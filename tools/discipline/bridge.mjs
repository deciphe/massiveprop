/**
 * MASSIVE Discipline / private local bridge
 * Node 20+, no dependencies. Only the documented MFP REST API is used.
 * API keys never enter the browser extension.
 */
import http from 'node:http';
import crypto from 'node:crypto';

const KEY = process.env.FP_API_KEY || '';
const TOKEN = process.env.MASSIVE_BRIDGE_TOKEN || '';
const LIVE = KEY.startsWith('fp_live_');
if (!/^fp_(test|live)_/.test(KEY)) throw Error('Set an fp_test_ API key in FP_API_KEY');
if (LIVE && process.env.MASSIVE_ALLOW_LIVE !== 'YES_I_UNDERSTAND') throw Error('Live account access is disabled; start with a sandbox key.');
if (TOKEN.length < 24) throw Error('MASSIVE_BRIDGE_TOKEN must contain at least 24 characters');
const BASE = process.env.NODE_ENV==='test' && process.env.MASSIVE_TEST_UPSTREAM==='YES' 
  ? 'http://127.0.0.1:18839' // CI-only local stub; never forwards production traffic here
  : (LIVE ? 'https://developers.myfundedperpetuals.com' : 'https://sandbox.myfundedperpetuals.com');
const PORT = Number(process.env.MASSIVE_BRIDGE_PORT || 18740);
const sessions = new Map();
const previews = new Map();
const nyDay = () => new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const finite = (v) => typeof v === 'number' ? Number.isFinite(v) : v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));
const val = (v) => Number(v);
const bad = (msg,status=400) => Object.assign(new Error(msg),{status});
const clean = (v) => typeof v === 'string' && v.length <= 120 && /^[a-zA-Z0-9|_.:-]+$/.test(v);
const positive = (v) => finite(v) && Number(v) > 0;

async function api(method,path,body,idem) {
  const control = new AbortController();
  const timeout = setTimeout(() => control.abort(), 12000);
  try {
    const response = await fetch(BASE + path, {
      method, signal: control.signal, headers: {
        Authorization: 'Bearer ' + KEY,
        ...(body ? {'Content-Type':'application/json'} : {}),
        ...(idem ? {'Idempotency-Key':idem} : {})
      },
      ...(body ? {body:JSON.stringify(body)} : {})
    });
    const raw = await response.text();
    let json;
    try { json = JSON.parse(raw); } catch { throw bad('Unexpected MFP API response',502); }
    if (!response.ok) {
      const e = bad(json?.error?.message || 'MFP rejected request',response.status);
      e.code = json?.error?.code || 'upstream_error';
      e.details = json?.error?.details;
      throw e;
    }
    return json.data ?? json;
  } finally { clearTimeout(timeout); }
}
async function account(id) {
  if (!clean(id)) throw bad('Invalid account');
  return api('GET','/v1/accounts/' + encodeURIComponent(id));
}
function getSession(id) {
  const session = sessions.get(id);
  if (!session || session.day !== nyDay() || !session.armed) throw bad('ARM a fresh session before entering orders',409);
  return session;
}
function validateOrder(o) {
  if (!o || !clean(o.account_id) || !clean(o.market_id) || !['buy','sell'].includes(o.side)) throw bad('Choose account, market and side');
  if (!['market','limit'].includes(o.type)) throw bad('Unsupported entry order type');
  if (!positive(o.size) || !positive(o.leverage)) throw bad('Size and leverage must be positive');
  if(o.margin_mode != null && !['cross','isolated'].includes(o.margin_mode))throw bad('Invalid margin mode');
  if (o.type === 'limit' && !positive(o.limit_price)) throw bad('Set a valid limit price');
  if (o.stop_loss_price != null && !positive(o.stop_loss_price)) throw bad('Invalid stop price');
  if (o.take_profit_price != null && !positive(o.take_profit_price)) throw bad('Invalid TP price');
  return {
    account_id: o.account_id, market_id:o.market_id, side:o.side, type:o.type,
    size:val(o.size), leverage:val(o.leverage), margin_mode:o.margin_mode||'cross',
    ...(o.type === 'limit' ? {limit_price:val(o.limit_price)} : {}),
    ...(o.stop_loss_price != null ? {stop_loss_price:val(o.stop_loss_price)} : {}),
    ...(o.take_profit_price != null ? {take_profit_price:val(o.take_profit_price)} : {})
  };
}
function signature(order) {
  return crypto.createHash('sha256').update(JSON.stringify(order)).digest('hex');
}
async function evaluate(o) {
  const order=validateOrder(o), session=getSession(order.account_id);
  const [a,quote,positions,working] = await Promise.all([
    account(order.account_id),
    api('GET','/v1/markets/' + encodeURIComponent(order.market_id) + '/quote?side=' + order.side + '&size=' + encodeURIComponent(order.size)),
    api('GET','/v1/positions?account_id='+encodeURIComponent(order.account_id)),
    api('GET','/v1/orders?account_id='+encodeURIComponent(order.account_id)+'&status=working')
  ]);
  if (a.status !== 'active') throw bad('Account is not active',409);
  if (a.risk?.marks_complete !== true || !finite(a.risk?.equity)) throw bad('Account marks unavailable. Order held until fresh.',409);
  if (quote.fillable === false) throw bad('Size not fillable at market precision',409);
  const entry = order.type==='limit' ? order.limit_price : Number(quote.estimated_fill_price || quote.mid);
  if (!positive(entry)) throw bad('No fresh execution quote',503);
  const stop = order.stop_loss_price;
  const stopValid = positive(stop) && (order.side==='buy' ? stop < entry : stop > entry);
  const fee = Number(quote.estimated_fee) || 0;
  const slippageBps = Number(quote.slippage_bps) || 0;
  const slippageBuffer = positive(stop) ? val(stop)*order.size*slippageBps/10000 : null;
  const risk = stopValid ? Math.abs(entry-stop)*order.size + 2*fee + slippageBuffer : null;
  const pnl = val(a.risk.equity)-session.startEquity;
  const reasons=[];
  // V1 deliberately does not resize or reverse existing positions. Attached exits
  // may protect the entire resulting position, not just the incremental order.
  const positionList=Array.isArray(positions)?positions:positions?.data||[];
  const workingList=Array.isArray(working)?working:working?.data||[];
  if(positionList.some(p=>p.market_id===order.market_id && Number(p.size)>0 && p.status!=='closed')) reasons.push({code:'existing_position',text:'Existing position in this market; manage through the native terminal'});
  if(workingList.some(o=>o.market_id===order.market_id && o.reduce_only!==true && !['canceled','filled','rejected'].includes(o.status))) reasons.push({code:'working_entry',text:'Unsettled entry already exists in this market'});
  if (!stopValid) reasons.push({code:'stop',text:'No valid protective stop'});
  if (risk != null && risk > session.maxRisk) reasons.push({code:'risk',text:'Risk exceeds $'+session.maxRisk.toFixed(2)+' per trade'});
  if (pnl >= session.target) reasons.push({code:'target',text:'Session profit target reached'});
  if (pnl <= -session.stop) reasons.push({code:'loss',text:'Session stop loss reached'});
  if (risk != null && pnl-risk < -session.stop) reasons.push({code:'projected',text:'This stop would exceed your session loss limit'});
  if (risk != null && Number.isFinite(Number(a.risk.max_drawdown_room)) && risk >= Number(a.risk.max_drawdown_room)) reasons.push({code:'drawdown',text:'Estimated risk consumes remaining maximum drawdown room'});
  const id=crypto.randomUUID();
  const preview={
    id,order,signature:signature(order), sessionDay:session.day, account_id:order.account_id,
    reasons, entry, risk, pnl, equity:a.risk.equity, room:a.risk.max_drawdown_room,
    fee, slippageBps, quote, expires:Date.now()+20000,
    idempotency:crypto.randomUUID(), clientId:'massive-' + crypto.randomUUID(),
    consumed:false
  };
  previews.set(id,preview);
  if (previews.size>250) for(const [k,v] of previews) if(v.expires<Date.now()-120000) previews.delete(k);
  return {preview_id:id, expires_at:preview.expires, account_id:order.account_id, entry,
    estimated_risk:risk, session_pnl:pnl, remaining_drawdown:a.risk.max_drawdown_room,
    fee_estimate:fee, slippage_bps:slippageBps, reasons, allowed:reasons.length===0,
    estimate_only:true, day:session.day };
}
async function route(req,url,body) {
  if(req.method==='GET' && url.pathname==='/health') return {ok:true,environment:LIVE?'LIVE':'SANDBOX',day:nyDay()};
  if(req.method==='GET' && url.pathname==='/accounts') return api('GET','/v1/accounts');
  if(req.method==='GET' && url.pathname==='/markets') return api('GET','/v1/markets');
  if(req.method==='GET' && url.pathname==='/account') return account(url.searchParams.get('id'));
  if(req.method==='GET' && url.pathname==='/session') {
    const id=url.searchParams.get('account_id'),s=getSession(id),a=await account(id);
    return {...s,session_pnl:val(a.risk.equity)-s.startEquity,drawdown_room:a.risk.max_drawdown_room};
  }
  if(req.method==='POST' && url.pathname==='/arm') {
    const id=body?.account_id;
    if(!clean(id) || !positive(body.target) || !positive(body.stop) || !positive(body.maxRisk)) throw bad('Enter positive daily target, stop and trade risk');
    const a=await account(id);
    if(a.status !== 'active' || a.risk?.marks_complete!==true || !finite(a.risk?.equity)) throw bad('Account is not active or prices unavailable',409);
    // Re-arming on the same trading day MUST NOT reset the original loss baseline.
    // Keep the first armed plan so an override cannot quietly rewrite history.
    const old=sessions.get(id);
    if(old && old.day===nyDay()) {old.armed=true;return old;}
    const s={account_id:id,day:nyDay(),armed:true,startEquity:val(a.risk.equity),
      target:val(body.target),stop:val(body.stop),maxRisk:val(body.maxRisk),armedAt:Date.now()};
    sessions.set(id,s);
    return s;
  }
  if(req.method==='POST' && url.pathname==='/preview') return evaluate(body);
  if(req.method==='POST' && url.pathname==='/place') {
    const p=previews.get(body?.preview_id);
    if(!p || p.expires<Date.now()) throw bad('Preview expired. Preview the order again.',409);
    if(p.consumed) return {submitted:true,order:p.result,client_order_id:p.clientId,replay:true};
    if(p.reasons.length) throw bad('Your plan rejected this order. Complete the Degen Gate to use the native ticket.',409);
    const s=getSession(p.account_id);
    if(s.day!==p.sessionDay || !s.armed) throw bad('Plan no longer armed',409);
    // A new authoritative account mark and quote is required before placement.
    // Check that the current risk is still within the plan, without minting a second order identity.
    const newer=await evaluate(p.order);
    if(newer.reasons.length) throw bad('Order no longer fits plan. Preview again.',409);
    const drift=Math.abs(newer.entry-p.entry)/p.entry;
    if(drift>0.002) throw bad('Price moved more than 0.2%. Preview again.',409);
    const request={...p.order, client_order_id:p.clientId};
    if(request.type==='market') request.expected_price=newer.entry;
    // Mark consumed BEFORE network submission. Ambiguous upstream errors must be reconciled.
    p.consumed=true;
    try {
      const result=await api('POST','/v1/orders',request,p.idempotency);
      p.result=result;
      return {submitted:true,order:result,client_order_id:p.clientId,replay:false};
    } catch(e) {
      p.result={status:'unknown',client_order_id:p.clientId,detail:'Reconcile through /order-lookup before retrying'};
      throw Object.assign(e,{client_order_id:p.clientId});
    }
  }
  if(req.method==='GET' && url.pathname==='/order-lookup') {
    const cid=url.searchParams.get('client_order_id');
    if(!clean(cid) || !cid.startsWith('massive-')) throw bad('Invalid order ID');
    return api('GET','/v1/orders?client_order_id='+encodeURIComponent(cid));
  }
  throw bad('Unknown endpoint',404);
}
const server=http.createServer(async (req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  if(req.headers.authorization!=='Bearer '+TOKEN) return send(401,{error:'Unauthorized'});
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(!['GET','POST'].includes(req.method)) throw bad('Method not allowed',405);
    let body=null;
    if(req.method==='POST'){
      const chunks=[];let len=0;
      for await(const chunk of req){len+=chunk.length;if(len>16384)throw bad('Payload too large',413);chunks.push(chunk);}
      try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw bad('Invalid JSON');}
    }
    send(200,{data:await route(req,url,body)});
  }catch(e){send(e.status||502,{error:e.message,code:e.code||'bridge_error',client_order_id:e.client_order_id});}
});
server.listen(PORT,'127.0.0.1',()=>console.log('MASSIVE Bridge / '+(LIVE?'LIVE':'SANDBOX')+' / listening on 127.0.0.1:'+PORT));
