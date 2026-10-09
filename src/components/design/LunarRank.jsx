import {useId} from 'react';

// Monument numerals match the solid, oversized typography of the MASSIVE rank cards.
// Metal varies only slightly by placement: never chrome, texture, or heavy glow.
export default function LunarRank({rank}){
 const id='massive-rank-'+useId().replace(/:/g,'');
 const numeral=String(rank).padStart(2,'0');
 const metal=rank===1
  ?['#e4dfd1','#ddd5c0','#cbbd9d']
  :rank===2
   ?['#e4e5e2','#d7d9d8','#bfc3c4']
   :['#dcd8d2','#cfc4bc','#b8aaa2'];
 return <svg className="flat-lunar-rank" viewBox="0 0 350 280" role="img" aria-label={'Rank '+rank} preserveAspectRatio="xMinYMid meet">
  <defs>
   <linearGradient id={id} x1="0" y1="0" x2=".95" y2="1">
    <stop offset="0" stopColor={metal[0]}/>
    <stop offset=".55" stopColor={metal[1]}/>
    <stop offset="1" stopColor={metal[2]}/>
   </linearGradient>
  </defs>
  <text x="8" y="248" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="266" letterSpacing="-24" fill={'url(#'+id+')'}>{numeral}</text>
 </svg>;
}
