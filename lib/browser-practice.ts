'use client';
import {historicalRound} from './seed';
import {score,type Round,type Prediction} from './domain';
import {refreshRehearsal,startRehearsal,submitPractice,type Database} from './practice';
// This module uses pure domain helpers only; no filesystem calls reach the client.
export const browserPractice=process.env.NEXT_PUBLIC_PRACTICE_STORAGE==='browser';
const key='bullseye.practice.v1';
const guest='browser-guest';
function read():Database {const saved=localStorage.getItem(key);return saved?JSON.parse(saved):{rounds:[historicalRound()],predictions:[],profiles:{[guest]:{name:'Guest forecaster'}},drafts:{},receipts:{}};}
function save(db:Database){localStorage.setItem(key,JSON.stringify(db));}
export function browserLeague(){
  const db=read();const time=Math.floor(Date.now()/1000);db.rounds.forEach(r=>refreshRehearsal(r,time));save(db);
  const predictions=db.predictions.filter(p=>p.participant===guest||p.participant===db.profiles[guest]?.watchAddress);
  const standings=new Map<string,{name:string;points:number;correct:number;resolved:number}>();
  for(const p of db.predictions){const round=db.rounds.find(r=>r.id===p.roundId);if(!round)continue;const result=score(p,round);if(!result.counted)continue;const row=standings.get(p.participant)??{name:p.participant.slice(0,6)+'…'+p.participant.slice(-4),points:0,correct:0,resolved:0};row.points+=result.points;row.correct+=Number(result.correct);row.resolved+=1;standings.set(p.participant,row);}
  return {rounds:db.rounds,predictions,receipts:Object.values(db.receipts??{}),profile:db.profiles[guest],leaderboard:[...standings.values()].sort((a,b)=>b.points-a.points),draft:db.drafts[guest]??'',serverTime:time};
}
export function browserPost(body:Record<string,unknown>){const db=read();const time=Math.floor(Date.now()/1000);let result:unknown;
  if(body.action==='predict')result=submitPractice(db,guest,String(body.roundId),Number(body.range),time);
  else if(body.action==='rehearse')result=startRehearsal(db,guest,time);
  else if(body.action==='draft'){db.drafts[guest]=String(body.draft);result={saved:true};}
  else throw new Error('Unknown practice action.');save(db);return result;
}
export function applyLive(body:Record<string,unknown>,result:{state?:string;records?:{round:Round;entries:Prediction[]}[]}){const db=read();
  if(body.action==='watch')db.profiles[guest].watchAddress=String(body.address).toLowerCase();
  if(body.action==='receipt'){db.receipts??={};db.receipts[String(body.hash)]={hash:String(body.hash),roundId:String(body.roundId??''),state:result.state??'submitted'};}
  if(body.action==='sync')for(const {round,entries} of result.records??[]){const index=db.rounds.findIndex(r=>r.id===round.id);if(index<0)db.rounds.push(round);else db.rounds[index]=round;for(const p of entries){const prior=db.predictions.findIndex(e=>e.id===p.id);if(prior<0)db.predictions.push(p);else db.predictions[prior]=p;}}
  save(db);
}
