import LunarRank from './LunarRank';
import MoonAvatar from './MoonAvatar';
import {BRAND_ASSETS} from '../../lib/brand-assets.js';
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
export function RankMovement({row}){return <>{!row.changeAvailable?'—':row.isNew?'NEW':row.rankChange>0?'↑'+row.rankChange:row.rankChange<0?'↓'+Math.abs(row.rankChange):'—'}</>}
export default function FlatPodium({row,profile,onSelect,href}){
 const name=profile?.username?'@'+profile.username:profile?.displayName||row.address.slice(0,6)+'…'+row.address.slice(-4),Tag=href?'a':'div';
 const tag=profile?.tag?.trim();const tagLink=tag&&/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(tag)?tag:tag&&/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(tag)?'https://'+tag:null;
 return <Tag className={'flat-podium-card flat-place-'+row.rank} href={href} role={!href&&onSelect?'button':undefined} tabIndex={!href&&onSelect?0:undefined} onClick={onSelect?()=>onSelect(row.address):undefined} onKeyDown={onSelect?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(row.address)}}:undefined}>
 <div className="flat-podium-art"><LunarRank rank={row.rank}/>{profile?.avatar?<img className="flat-podium-face" src={profile.avatar} alt=""/>:<MoonAvatar seed={row.address}/>}<img className="flat-podium-mark" src={BRAND_ASSETS.vestSymbol} alt=""/></div>
 <div className="flat-podium-name">{name}</div>{tagLink&&!href?<a className="flat-podium-tag" href={tagLink} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>{profile.tag} ↗</a>:<div className="flat-podium-tag">{profile?.tag||'\u00a0'}</div>}
 <strong className="flat-podium-total">{usd(row.total)}</strong><div className="flat-podium-metrics"><span><b>{Number.isFinite(row.received24h)?'+'+usd(row.received24h):'—'}</b><small>24h gain</small></span><span><b><RankMovement row={row}/></b><small>24h rank</small></span></div>
 </Tag>;
}
