import {useId} from 'react';
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
 const paths=Array.from({length:6},()=>[]),r=710,cx=1100,cy=940;
 const craters=[[-.5,-.55,.12],[-.2,-.7,.08],[-.65,-.3,.06],[-.3,-.35,.09],[.08,-.62,.1],[-.46,-.78,.04]];
 for(let y=190;y<800;y+=6)for(let x=(Math.round(y/6)%2)*3;x<1200;x+=6){const nx=(x-cx)/r,ny=(y-cy)/r,q=nx*nx+ny*ny;if(q>=1)continue;let terrain=Math.sin(nx*29+Math.sin(ny*17))*Math.cos(ny*23)*.15;for(const [a,b,s] of craters){const d=Math.hypot(nx-a,ny-b)/s;if(d<1.5)terrain-=.44*Math.exp(-d*d*3)-.19*Math.exp(-Math.pow((d-1)*6,2))}const v=Math.max(0,Math.min(.99,(-nx*.35-ny*.6+Math.sqrt(1-q)*.12)*(.55+terrain))),bucket=Math.floor(v*6),size=(.7+v*1.7).toFixed(2);paths[bucket].push(`M${x},${y}h${size}v${size}h-${size}z`)}
 return paths.map(p=>p.join(''));
})();
function RankArtwork({person,profiles}){
 const id=useId().replace(/:/g,''),ref=n=>`url(#${id}-${n})`,profile=profiles[person.address],name=profile?.username?'@'+profile.username:profile?.displayName||'Trader';
 const primary=Object.keys(person.firms||{}).sort((a,b)=>person.firms[b]-person.firms[a])[0];
 const firm=WEEKLY_FIRMS.find(f=>f.id===primary),logo=primary==='vest'?BRAND_ASSETS.vestSymbol:firm?.logo;
 const champion=person.rank===1;
 return <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label={`${name}, rank ${person.rank}, ${usd(person.total)} in payouts`} style={{display:'block',width:'100%',height:'auto',fontFamily:'Manrope,sans-serif'}}>
  <defs>
   <radialGradient id={id+'-glow'} cx=".88" cy=".8" r=".85"><stop stopColor="#bcbab0" stopOpacity=".1"/><stop offset="1" stopColor="#080809" stopOpacity="0"/></radialGradient>
   <linearGradient id={id+'-metal'} x2=".8" y2="1"><stop stopColor="#eeece5"/><stop offset=".55" stopColor={champion?'#cec5ad':'#bebdb8'}/><stop offset="1" stopColor="#686866"/></linearGradient>
   <linearGradient id={id+'-portrait'}><stop stopColor="black"/><stop offset=".25" stopColor="white"/><stop offset=".9" stopColor="white"/><stop offset="1" stopColor="black"/></linearGradient>
   <linearGradient id={id+'-bottom'} x2="0" y2="1"><stop stopColor="black"/><stop offset=".13" stopColor="white"/><stop offset=".63" stopColor="white"/><stop offset="1" stopColor="black"/></linearGradient>
   <mask id={id+'-mask'} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={ref('portrait')}/></mask>
   <mask id={id+'-foot'} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={ref('bottom')}/></mask>
   <filter id={id+'-mono'} colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  <rect width="1200" height="800" fill="#080809"/><rect width="1200" height="800" fill={ref('glow')}/>
  <g fill="#c6c6bf">{moonPaths.map((d,i)=><path key={i} d={d} opacity={.06+i*.028}/>)}</g>
  {Array.from({length:28},(_,i)=><circle key={i} cx={(i*173+87)%1200} cy={(i*97+31)%650} r={i%4===0?1.2:.65} fill="#d6d5ce" opacity=".18"/>)}
  {profile?.avatar&&<g mask={ref('foot')}><image href={profile.avatar} x="590" y="105" width="610" height="690" preserveAspectRatio="xMidYMid slice" opacity=".87" mask={ref('mask')} filter={ref('mono')}/></g>}
  <text x="68" y="88" fontSize="36" fontWeight="800" letterSpacing="-2.1" fill="#e8e5dc">MASSIVE.</text>
  {logo&&<g><image href={logo} x="985" y="57" width="38" height="27" preserveAspectRatio="xMidYMid meet" filter={ref('mono')} opacity=".8"/><text x="1040" y="80" fontSize="18" fontWeight="800" fill="#bab8b0">{firm?.name||'Vest'}</text></g>}
  <text x="58" y="391" fontSize={person.rank>99?230:290} fontWeight="800" letterSpacing="-23" fill={ref('metal')}>{String(person.rank).padStart(2,'0')}</text>
  <FitText x="70" y="468" maxWidth={490} fontSize={35} fontWeight="800" letterSpacing="-1" fill="#c9c7bf">{name}</FitText>
  <FitText x="65" y="598" maxWidth={600} fontSize={88} fontWeight="800" letterSpacing="-4" fill="#eeece5">{usd(person.total)}</FitText>
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
 <text x="65" y="42" fontSize="29" fontWeight="800" fill={i===0?'#c7b485':'#929089'}>{String(r.rank).padStart(2,'0')}</text>
 {profiles[r.address]?.avatar&&<image href={profiles[r.address].avatar} x="145" y="0" width="54" height="54" preserveAspectRatio="xMidYMid slice"/>}
 <FitText x="222" y="38" maxWidth={540} fontSize={26} fontWeight="800" fill="#d5d3cc">{profiles[r.address]?.username?'@'+profiles[r.address].username:'Trader '+r.rank}</FitText>
 <FitText x="1135" y="38" textAnchor="end" maxWidth={320} fontSize={32} fontWeight="800" fill="#e8e5dc">{usd(r.total)}</FitText>
 </g>)}
 </svg>;
}
