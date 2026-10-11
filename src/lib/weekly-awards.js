import {WEEK,weekStart,weekKey,weekEnd,weekStartForKey} from './weekly-leaderboard.js';

export function validWeeklyKey(key){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(key||''))return false;
 const start=weekStartForKey(key);
 return Number.isFinite(start)&&weekKey(start)===key&&weekStart(start)===start;
}
export function validWeeklyEdition(board,key){
 return validWeeklyKey(key)&&board?.available===true&&board.week===key&&board.start===weekStartForKey(key)&&Array.isArray(board.transfers)&&Number.isFinite(Date.parse(board.asOf))&&Number.isFinite(board.end);
}
export function weeklyAwardsUnlocked(board,now=Date.now()){
 if(!validWeeklyEdition(board,board?.week))return false;
 const close=weekEnd(board.start);
 return board.closed===true&&now>=close&&board.end>=close&&Date.parse(board.asOf)>=close;
}
const dayLabel=(t,legacy)=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:legacy?'UTC':'America/New_York'});
export const weeklyAwardRange=start=>{const legacy=start<Date.parse('2026-10-11T22:00:00Z');return dayLabel(start,legacy)+' — '+dayLabel(weekEnd(start)-1,legacy)};
