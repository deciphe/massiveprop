import {useEffect,useRef,useState} from 'react';
import {weeklyAwardRange} from '../../lib/weekly-awards.js';
import './weekly-awards.css';
import {RankArtwork} from './WeeklyPoster';
export default function WeeklyAwards({board,rows,person,renderCard,profiles,weeklyTrack=[],showWeekDates=false}){
 const weekLabel=showWeekDates?weeklyAwardRange(board.start):null;
 const host=useRef(null),canvas=useRef(null),[size,setSize]=useState({scale:1,height:750});
 useEffect(()=>{
  const resize=()=>{if(!host.current||!canvas.current)return;const scale=Math.min(1,host.current.clientWidth/canvas.current.offsetWidth);setSize({scale,height:canvas.current.offsetHeight*scale})};
  const observer=new ResizeObserver(resize);observer.observe(host.current);observer.observe(canvas.current);resize();return()=>observer.disconnect();
 },[person?.address,board.week]);
 if(showWeekDates)return <div ref={host} className="wk-award-preview wk-rank-award-preview" style={{height:size.height}}><div ref={canvas} className={'wk-award-canvas wk-rank-award-canvas'+(person?' wk-award-single':'')} style={{transform:`scale(${size.scale})`}} aria-label={person?'Weekly rank '+person.rank:'Weekly top three rank cards'}>{(person?[person]:rows.slice(0,3)).map(row=><RankArtwork key={row.address} person={row} profiles={profiles} weeklyBoard={board} weeklyTrack={weeklyTrack}/>)}</div></div>;
 return <div ref={host} className="wk-award-preview" style={{height:size.height}}><div ref={canvas} className={'wk-award-canvas'+(person?' wk-award-single':'')} style={{transform:`scale(${size.scale})`}} aria-label={person?'Weekly rank '+person.rank:'Weekly top three podium cards'}><div className="wk-award-heading"><b>MASSIVE.</b><span>Weekly</span><small>{weeklyAwardRange(board.start)} · UTC</small></div><div className="wk-podium flat-podium">{(person?[person]:rows.slice(0,3)).map(row=><div className={'wk-award-place wk-award-place-'+row.rank} key={row.address}>{renderCard(row)}{weekLabel&&<div className="wk-award-edition"><div className="wk-award-edition-top"><span>{row.rank<=3?'WEEKLY PODIUM':'WEEKLY RANK'}</span><span className="wk-award-edition-rank">NO. {String(row.rank).padStart(2,"0")}</span></div><strong>{weekLabel}</strong><div className="wk-award-edition-rule" aria-hidden="true"><i/><i/><i/></div></div>}</div>)}</div><div className="wk-award-signoff">massiveprop.xyz </div></div></div>;
}
