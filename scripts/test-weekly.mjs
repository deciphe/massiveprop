import assert from 'node:assert/strict';import {weekStart,weeklyBoard,rankWeekly,WEEK} from '../src/lib/weekly-leaderboard.js';import {FLOW_SOURCES} from '../src/lib/flow-config.js';
const start=Date.parse('2026-09-28T00:00:00Z'),end=start+WEEK,recipient='0x1111111111111111111111111111111111111111';
assert.equal(weekStart(start+WEEK-1),start);assert.equal(weekStart(end),end);
const snapshots=Object.fromEntries(FLOW_SOURCES.map(s=>[s.slug,{complete:true,wallet:s.wallet,token:s.token,chain:s.chain,updatedAt:new Date(end).toISOString(),windowEnd:new Date(end).toISOString(),periodStart:new Date(start-86400000).toISOString(),balance:0,transfers:[]}]));
let idx=0;const add=(slug,raw,time,to=recipient)=>{const s=FLOW_SOURCES.find(s=>s.slug===slug);snapshots[slug].transfers.push({id:'tx'+idx,hash:'0x'+String(idx++).padStart(64,'0'),logIndex:1,block:1,timestamp:new Date(time).toISOString(),from:s.wallet,to,direction:'out',raw:String(raw),amount:Number(raw)/1e6})};
add('vestflow',1000000,start);add('breakoutflow',2000000,start+1);add('vestflow',9000000,end);add('vestflow',9999,start+1);add('vestflow',8000000,start+1,FLOW_SOURCES.find(s=>s.slug==='novaflow').wallet);snapshots.vestflow.transfers.push({...snapshots.vestflow.transfers[0]});
let board=weeklyBoard(snapshots,start,end);assert(board.available&&board.closed);assert.equal(board.transfers.length,2);let ranks=rankWeekly(board);assert.equal(ranks.length,1);assert.equal(ranks[0].total,3);assert.equal(rankWeekly(board,'vest')[0].total,1);assert.equal(rankWeekly(board,'breakout')[0].total,2);
snapshots.proprflow.windowEnd=new Date(start).toISOString();board=weeklyBoard(snapshots,start,end);assert.equal(board.closed,false);assert.equal(board.transfers.length,1);snapshots.proprflow.complete=false;assert.equal(weeklyBoard(snapshots,start,end).available,false);
console.log('Weekly boundaries, integer totals, cross-firm aggregation, deduplication, treasury/dust exclusions, firm filters and common cutoff passed.');

const {rankSeasonChanges}=await import('../src/lib/season-changes.js');
const day=86400000,cutoff=start+3*day;
const transfer=(to,amount,time,firm='vest')=>({to,raw:String(amount*1e6),amount,timestamp:new Date(time).toISOString(),firm});
const season={available:true,start,end:cutoff,asOf:new Date(cutoff).toISOString(),transfers:[
 transfer('a',100,start),transfer('b',200,start),transfer('a',150,cutoff-100),transfer('c',300,cutoff-50),transfer('d',1000,cutoff-50,'propr'),transfer('b',1,cutoff-day)
]};
const daily=rankSeasonChanges(season,'vest'),byAddress=Object.fromEntries(daily.map(r=>[r.address,r]));
assert.equal(byAddress.a.received24h,150);assert.equal(byAddress.a.rankChange,0);
assert.equal(byAddress.b.received24h,0);assert.equal(byAddress.b.rankChange,-2);assert.equal(byAddress.c.isNew,true);
assert.equal(daily.length,3);
const gain=rankSeasonChanges({...season,transfers:season.transfers.filter(t=>t.to!=='c')},'vest');
assert.equal(gain.find(r=>r.address==='a').rankChange,1);
const early=rankSeasonChanges({...season,end:start+day/2,asOf:new Date(start+day/2).toISOString(),transfers:[transfer('a',1,start)]});
assert.equal(early[0].changeAvailable,false);assert.equal(early[0].isNew,false);
const closed=rankSeasonChanges({...season,asOf:new Date(cutoff+5*day).toISOString()},'vest');
assert.equal(closed.find(r=>r.address==='a').received24h,150);
console.log('Season 24h payouts, boundary, rank gains/losses, NEW, firm filters and closed-season cutoff passed.');

// A failed unrelated firm must not freeze a selected firm's live rankings.
const vestOnly=weeklyBoard(snapshots,start,end,WEEK,'vest');
assert(vestOnly.available&&vestOnly.closed);
assert.equal(vestOnly.transfers.length,1);
assert(vestOnly.coverage.every(c=>c.firm==='vest'));
const {seasonBoard,SEASON_ONE,seasonDuration}=await import('../src/lib/season-leaderboard.js');
const historyCutoff=SEASON_ONE+10*day;
const selectedSnapshots=structuredClone(snapshots);
for(const s of FLOW_SOURCES){selectedSnapshots[s.slug].periodStart=new Date(historyCutoff).toISOString();selectedSnapshots[s.slug].windowEnd=new Date(cutoff).toISOString();}
const priorSeason={available:true,start:SEASON_ONE,end:historyCutoff,duration:seasonDuration(SEASON_ONE),transfers:[{...transfer('historical',12,SEASON_ONE),id:'historical'},{...transfer('unrelated',15,SEASON_ONE,'propr'),id:'unrelated'}]};
const currentVest=seasonBoard(selectedSnapshots,SEASON_ONE,cutoff,priorSeason,'vest');
assert(currentVest.available);
assert.equal(currentVest.end,cutoff);
assert(currentVest.transfers.some(t=>t.id==='historical'));
assert(currentVest.transfers.every(t=>t.firm==='vest'));
assert.equal(seasonBoard(selectedSnapshots,SEASON_ONE,cutoff,{...priorSeason,end:historyCutoff-1},'vest').available,false);
console.log('Selected-firm refresh ignores unrelated failures, preserves season history, and rejects archive gaps.');

const {validWeeklyKey,validWeeklyEdition,weeklyAwardsUnlocked}=await import('../src/lib/weekly-awards.js');
const finalWeek={available:true,week:'2026-09-28',start,end,closed:true,asOf:new Date(end).toISOString(),transfers:[]};
assert(validWeeklyKey('2026-09-28'));
assert(!validWeeklyKey('2026-09-29'));
assert(!validWeeklyKey('2026-02-30'));
assert(validWeeklyEdition(finalWeek,'2026-09-28'));
assert(!validWeeklyEdition(finalWeek,'2026-09-21'));
assert(!weeklyAwardsUnlocked(finalWeek,end-1));
assert(weeklyAwardsUnlocked(finalWeek,end));
assert(!weeklyAwardsUnlocked({...finalWeek,closed:false},end+WEEK));
assert(!weeklyAwardsUnlocked({...finalWeek,end:end-1},end+WEEK));
assert(!weeklyAwardsUnlocked({...finalWeek,asOf:new Date(end-1).toISOString()},end+WEEK));
assert(!weeklyAwardsUnlocked(null,end));
console.log('Weekly cards stay locked before close and with incomplete snapshots; matching final archives unlock.');

const {weekEnd,weekKey,weekStartForKey}=await import('../src/lib/weekly-leaderboard.js');
const transition=Date.parse('2026-10-11T22:00:00Z');
assert.equal(weekStart(transition-1),Date.parse('2026-10-05T00:00:00Z'));
assert.equal(weekEnd(weekStart(transition-1)),transition);
assert.equal(weekStart(transition),transition);
assert.equal(weekStartForKey('2026-10-11'),transition);
assert.equal(weekEnd(transition),Date.parse('2026-10-18T22:00:00Z'));
assert.equal(weekEnd(Date.parse('2026-10-25T22:00:00Z')),Date.parse('2026-11-01T23:00:00Z'));
assert.equal(weekStart(Date.parse('2026-11-01T22:30:00Z')),Date.parse('2026-10-25T22:00:00Z'));
assert.equal(weekStart(Date.parse('2026-11-01T23:00:00Z')),Date.parse('2026-11-01T23:00:00Z'));
assert(validWeeklyKey('2026-10-11'));
const easternBoard={available:true,week:weekKey(transition),start:transition,end:weekEnd(transition),closed:true,asOf:new Date(weekEnd(transition)).toISOString(),transfers:[]};
assert(validWeeklyEdition(easternBoard,easternBoard.week));
assert(!weeklyAwardsUnlocked(easternBoard,easternBoard.end-1));
assert(weeklyAwardsUnlocked(easternBoard,easternBoard.end));
console.log('Eastern Sunday 6 PM handoff, historical UTC editions, and daylight saving transition passed.');
