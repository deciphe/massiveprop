import {useId} from 'react';
import {weeklyAwardRange} from '../../lib/weekly-awards.js';
import {WEEKLY_FIRMS} from '../../lib/weekly-leaderboard.js';
import {seasonEnd} from '../../lib/season-leaderboard.js';
import {BRAND_ASSETS} from '../../lib/brand-assets.js';
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export const range=s=>new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})+' — '+new Date(seasonEnd(s)-1).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
function FitText({children,maxWidth,fontSize,...props}){
 const text=String(children??''),estimate=text.length*fontSize*.61,size=Math.min(fontSize,fontSize*maxWidth/Math.max(estimate,1));
 return <text {...props} fontSize={size} textLength={estimate>maxWidth?maxWidth:undefined} lengthAdjust="spacingAndGlyphs">{text}</text>;
}
// Six paths keep the cratered halftone moon compact in both SVG and JPG exports.
const moonPaths=(()=>{
 const paths=Array.from({length:6},()=>[]),r=620,cx=980,cy=830;
 const craters=[[-.5,-.55,.12],[-.2,-.7,.08],[-.65,-.3,.06],[-.3,-.35,.09],[.08,-.62,.1],[-.46,-.78,.04]];
 for(let y=190;y<800;y+=6)for(let x=(Math.round(y/6)%2)*3;x<1200;x+=6){const nx=(x-cx)/r,ny=(y-cy)/r,q=nx*nx+ny*ny;if(q>=1)continue;let terrain=Math.sin(nx*29+Math.sin(ny*17))*Math.cos(ny*23)*.15;for(const [a,b,s] of craters){const d=Math.hypot(nx-a,ny-b)/s;if(d<1.5)terrain-=.44*Math.exp(-d*d*3)-.19*Math.exp(-Math.pow((d-1)*6,2))}const v=Math.max(0,Math.min(.99,(-nx*.35-ny*.6+Math.sqrt(1-q)*.12)*(.55+terrain))),bucket=Math.floor(v*6),size=(.7+v*1.7).toFixed(2);paths[bucket].push(`M${x},${y}m-${size},0a${size},${size} 0 1,0 ${2*size},0a${size},${size} 0 1,0 -${2*size},0`)}
 return paths.map(p=>p.join(''));
})();
export function RankArtwork({person,profiles,weeklyBoard,weeklyTrack=[]}){
 const id=useId().replace(/:/g,''),ref=n=>`url(#${id}-${n})`,profile=profiles[person.address],name=profile?.displayLabel||(profile?.username?'@'+profile.username:profile?.displayName||'Trader');
 const primary=Object.keys(person.firms||{}).sort((a,b)=>person.firms[b]-person.firms[a])[0];
 const firm=WEEKLY_FIRMS.find(f=>f.id===primary),logo=primary==='vest'?BRAND_ASSETS.vestSymbol:firm?.logo;
 const champion=person.rank===1;
 const podium=!!weeklyBoard&&person.rank<=3,metal=person.rank===1?'#cdb887':person.rank===2?'#ccd0d5':'#b99078';
 return <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label={`${name}, rank ${person.rank}, ${usd(person.total)} in payouts`} style={{display:'block',width:'100%',height:'auto',fontFamily:'Manrope,sans-serif'}}>
  <defs>
   <radialGradient id={id+'-glow'} cx=".88" cy=".8" r=".85"><stop stopColor="#bcbab0" stopOpacity=".1"/><stop offset="1" stopColor="#080809" stopOpacity="0"/></radialGradient>
   <linearGradient id={id+'-metal'} x2=".8" y2="1"><stop stopColor="#eeece5"/><stop offset=".55" stopColor={champion?'#cec5ad':'#bebdb8'}/><stop offset="1" stopColor="#686866"/></linearGradient>
   <linearGradient id={id+'-portrait'}><stop stopColor="black"/><stop offset=".25" stopColor="white"/><stop offset=".9" stopColor="white"/><stop offset="1" stopColor="black"/></linearGradient>
   <linearGradient id={id+'-bottom'} x2="0" y2="1"><stop stopColor="black"/><stop offset=".13" stopColor="white"/><stop offset=".63" stopColor="white"/><stop offset="1" stopColor="black"/></linearGradient>
   <mask id={id+'-mask'} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={ref('portrait')}/></mask>
   <mask id={id+'-foot'} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={ref('bottom')}/></mask>
   <linearGradient id={id+'-mark-metal'} x2=".8" y2="1"><stop stopColor="#efede5"/><stop offset=".48" stopColor="#9d9c95"/><stop offset="1" stopColor="#44443f"/></linearGradient>
   <filter id={id+'-portrait-color'} colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values=".42"/></filter><filter id={id+'-mono'} colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  <rect width="1200" height="800" fill="#080809"/><rect x="18" y="18" width="1164" height="764" rx="14" fill="none" stroke="#d4d0da" strokeOpacity=".16" strokeWidth="1" strokeDasharray="1 7" strokeLinecap="round"/><rect width="1200" height="800" fill={ref('glow')}/>
  <g fill={podium?metal:"#c6c6bf"}>{moonPaths.map((d,i)=><path key={i} d={d} opacity={.20+i*.065}/>)}</g>
  {podium&&<g fill="none" stroke={metal} transform="rotate(-24 980 830)"><ellipse cx="980" cy="830" rx="720" ry="240" strokeWidth="1.5" opacity=".3"/><ellipse cx="980" cy="830" rx="744" ry="254" strokeWidth=".8" opacity=".17"/>{person.rank===1&&<ellipse cx="980" cy="830" rx="774" ry="270" strokeWidth=".8" strokeDasharray="1 9" opacity=".25"/>}<circle cx="350" cy="714" r={person.rank===1?8:5} fill={metal} stroke="none" opacity=".65"/></g>}
  {Array.from({length:28},(_,i)=><circle key={i} cx={(i*173+87)%1200} cy={(i*97+31)%650} r={i%4===0?1.2:.65} fill="#d6d5ce" opacity=".18"/>)}
  {profile?.avatar&&<g mask={ref('foot')}><image href={profile.avatar} x="605" y="105" width="560" height="620" preserveAspectRatio="xMidYMid slice" opacity=".88" mask={ref('mask')} filter={ref('portrait-color')}/></g>}
  <text x="68" y="88" fontSize="36" fontWeight="800" letterSpacing="-2.1" fill="#e8e5dc">MASSIVE.</text>
  {primary==='vest'&&<g transform="translate(888 633) scale(.38)" opacity=".48" fill={ref('mark-metal')}><path d="M546.559 104.307L418.198 1.642C415.785-.29 412.222 1.432 412.222 4.525V217.483L546.559 110.043C548.401 108.561 548.401 105.768 546.559 104.307Z"/><path d="M130.463 1.641L2.101 104.296C.259 105.778.259 108.571 2.101 110.032L136.429 217.472V4.524C136.429 1.431 132.865-.261 130.453 1.641Z"/><path d="M272.038 325.934L136.429 217.482V335.143C136.429 337.165 138.06 338.827 140.112 338.827H408.597C410.62 338.827 412.281 337.195 412.281 335.143V217.482L276.672 325.934C275.331 327.005 273.439 327.005 272.068 325.934Z"/></g>}
  {primary!=='vest'&&logo&&<g><image href={logo} x="985" y="57" width="38" height="27" preserveAspectRatio="xMidYMid meet" filter={ref('mono')} opacity=".8"/><text x="1040" y="80" fontSize="18" fontWeight="800" fill="#bab8b0">{firm?.name||'Vest'}</text></g>}
  <text x="58" y="391" fontSize={person.rank>99?230:290} fontWeight="800" letterSpacing="-23" fill={podium?metal:"#ded9cb"}>{String(person.rank).padStart(2,'0')}</text>
  <FitText x="70" y="468" maxWidth={490} fontSize={35} fontWeight="800" letterSpacing="-1" fill="#c9c7bf">{name}</FitText>
  {profile?.tag&&<FitText x="70" y="510" maxWidth={490} fontSize={22} fontWeight="700" fontStyle="italic" letterSpacing=".2" fill="#bdb6a7">{profile.tag}</FitText>}
  <FitText x="65" y="628" maxWidth={600} fontSize={88} fontWeight="800" letterSpacing="-4" fill="#eeece5">{usd(person.total)}</FitText>
  {!weeklyBoard&&Number.isFinite(person.received24h)&&<g><text x="70" y="699" fontSize="23" fontWeight="800" fill="#cfc4ae">+{usd(person.received24h)}</text><text x="70" y="731" fontSize="16" fontWeight="700" fill="#969187">24h gain</text><text x="340" y="699" fontSize="23" fontWeight="800" fill="#cfc4ae">{!person.changeAvailable?'—':person.isNew?'NEW':person.rankChange>0?'↑'+person.rankChange:person.rankChange<0?'↓'+Math.abs(person.rankChange):'—'}</text><text x="340" y="731" fontSize="16" fontWeight="700" fill="#969187">24h rank</text></g>}
 {weeklyBoard&&<g>
  {weeklyTrack.length>0?<g aria-label="Five-week rank history">{weeklyTrack.map((week,i)=>{
   const entry=week.rows?.[person.address],place=entry?.rank,podiumFinish=week.closed&&place>=1&&place<=3;
   const fill=podiumFinish?place===1?'#e7d6a6':place===2?'#d4d3ce':'#bfa99a':'#080809';
   const label=weeklyAwardRange(week.start)+' · '+(!week.available?'History unavailable':entry?'Rank #'+place+' · '+usd(entry.total)+(week.closed?'':' · live'):'No eligible payouts');
   return <g key={week.key} transform={`translate(${70+i*50} 662)`}><title>{label}</title><rect width="42" height="42" rx="8" fill={fill} stroke={podiumFinish?fill:'#eeeae24d'} strokeWidth="1" strokeDasharray={!week.closed&&week.available?'3 3':undefined}/><text x="21" y="27" textAnchor="middle" fontSize="18" fontWeight="800" fill={podiumFinish?'#171715':'#b8b4aa'}>{week.available?(place||'–'):'·'}</text>{i===weeklyTrack.length-1&&<rect x="-3" y="-3" width="48" height="48" rx="10" fill="none" stroke="#eeeae22e"/>}</g>;
  })}</g>:<path d="M70 671H560" stroke={metal} strokeOpacity=".25"/>}
  <text x={weeklyTrack.length?350:70} y={weeklyTrack.length?680:704} fontSize="13" fontWeight="800" letterSpacing="3" fill={metal}>{podium?'WEEKLY PODIUM':'WEEKLY RANK'} / {String(person.rank).padStart(2,'0')}</text>
  <text x="70" y="750" fontSize="20" fontWeight="700" fill="#aaa69d">{weeklyAwardRange(weeklyBoard.start)}</text>
 </g>}
 </svg>;
}
export default function WeeklyPoster({board,rows,profiles,firm,person}){
 if(person)return <RankArtwork person={person} profiles={profiles}/>;
 const list=rows.slice(0,firm==='vest'?100:15),h=300+list.length*76;
 return <svg xmlns="http://www.w3.org/2000/svg" width="1200" height={h} viewBox={`0 0 1200 ${h}`} role="img" aria-label="MASSIVE payout standings" style={{display:'block',width:'100%',height:'auto',fontFamily:'Manrope,sans-serif'}}>
 <rect width="1200" height={h} fill="#080809"/>
 <text x="65" y="82" fontSize="36" fontWeight="800" letterSpacing="-2" fill="#e8e5dc">MASSIVE.</text>
 <text x="65" y="174" fontSize="62" fontWeight="800" letterSpacing="-3" fill="#e8e5dc">THE TOP {list.length}.</text>
 <text x="1135" y="170" textAnchor="end" fontSize="17" fontWeight="700" fill="#929089">{range(board.start)}</text>
 {list.map((r,i)=><g key={r.address} transform={`translate(0 ${225+i*76})`}>
 <text x="65" y="42" fontSize="29" fontWeight="800" fill="#bdb6a7">{String(r.rank).padStart(2,'0')}</text>
 {profiles[r.address]?.avatar&&<image href={profiles[r.address].avatar} x="145" y="0" width="54" height="54" preserveAspectRatio="xMidYMid slice"/>}
 <FitText x="222" y="38" maxWidth={540} fontSize={26} fontWeight="800" fill="#d5d3cc">{profiles[r.address]?.displayLabel||(profiles[r.address]?.username?'@'+profiles[r.address].username:'Trader '+r.rank)}</FitText>
 <FitText x="1135" y="38" textAnchor="end" maxWidth={320} fontSize={32} fontWeight="800" fill="#e8e5dc">{usd(r.total)}</FitText>
 </g>)}
 </svg>;
}
