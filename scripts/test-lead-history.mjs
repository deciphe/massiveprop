import assert from 'node:assert/strict';
import {leadHistory,leadDuration} from '../src/lib/lead-history.js';
const a='0x'+'1'.repeat(40),b='0x'+'2'.repeat(40),start=Date.parse('2026-10-12T00:00:00Z');
const tx=(to,raw,minute,id,firm='vest')=>({to,raw:String(raw),timestamp:new Date(start+minute*60000).toISOString(),id,firm});
const board={available:true,start,end:start+60*60000,completeThrough:new Date(start+60*60000).toISOString(),transfers:[tx(a,100,0,'1'),tx(b,150,10,'2'),tx(a,100,30,'3')]};
let h=leadHistory(board,'vest');assert.deepEqual(h.reigns.map(x=>x.address),[a,b,a]);assert.equal(h.changes,2);assert.equal(h.holders.find(x=>x.address===a).count,2);assert.equal(h.holders.find(x=>x.address===a).duration,40*60000);
// Same-second payouts produce one final state, regardless of input order.
const simultaneous={...board,transfers:[tx(b,150,0,'b'),tx(a,200,0,'a')]};assert.deepEqual(leadHistory(simultaneous).reigns.map(x=>x.address),[a]);
assert.deepEqual(leadHistory({...simultaneous,transfers:[...simultaneous.transfers].reverse()}).reigns.map(x=>x.address),[a]);
// Equal totals use the same address tie-break as the standings.
assert.equal(leadHistory({...board,transfers:[tx(b,100,0,'b'),tx(a,100,1,'a')]}).reigns.at(-1).address,a);
// Exclude future, other-firm and duplicate entries; stop at complete coverage.
h=leadHistory({...board,completeThrough:new Date(start+20*60000).toISOString(),transfers:[...board.transfers,tx(b,999,5,'other','nova'),board.transfers[0]]},'vest');assert.equal(h.reigns.length,2);assert.equal(h.holders.find(x=>x.address===b).duration,10*60000);
assert.deepEqual(leadHistory(null).reigns,[]);
assert.equal(leadDuration(30000),'<1 min');assert.equal(leadDuration(60000),'1 min');assert.equal(leadDuration(3600000),'1 hr');assert.equal(leadDuration(86400000),'1 day');assert.equal(leadDuration(604800000),'1 week');
console.log('Lead history: handovers, totals, ties, timestamp batches, cutoff and duration checks passed.');
