import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {guestToken,transaction,refreshRehearsal,startRehearsal,submitPractice} from '@/lib/store';
import {score} from '@/lib/domain';
import {historicalRounds} from '@/lib/seed';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function identity(){const jar=await cookies();const existing=jar.get('bullseye_guest')?.value;const token=existing&&/^[a-f0-9]{64}$/.test(existing)?existing:guestToken();return {token,fresh:token!==existing};}
function response(body:unknown,token:string,fresh:boolean,status=200){const res=NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});if(fresh)res.cookies.set('bullseye_guest',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:365*86400,path:'/'});return res;}
export async function GET(){
  const {token,fresh}=await identity();
  if(process.env.NEXT_PUBLIC_PRACTICE_STORAGE==='browser')return response({rounds:historicalRounds(),predictions:[],receipts:[],profile:{name:'Guest forecaster'},leaderboard:[],draft:'',serverTime:Math.floor(Date.now()/1000)},token,fresh);
  const data=await transaction(db=>{
    db.profiles[token]??={name:'Guest forecaster'};
    db.rounds.forEach(r=>refreshRehearsal(r,Math.floor(Date.now()/1000)));
    const predictions=db.predictions.filter(p=>p.participant===token||p.participant===db.profiles[token].watchAddress);
    // Competitive standings only contain finalized protocol participation.
    const standings=new Map<string,{participant:string;name:string;points:number;correct:number;resolved:number}>();
    for(const p of db.predictions){const r=db.rounds.find(r=>r.id===p.roundId);if(!r)continue;const result=score(p,r);if(!result.counted)continue;const row=standings.get(p.participant)??{participant:p.participant,name:db.profiles[p.participant]?.name??'Forecaster',points:0,correct:0,resolved:0};row.points+=result.points;row.correct+=Number(result.correct);row.resolved+=1;standings.set(p.participant,row);}
    return {rounds:db.rounds.filter(r=>!r.id.startsWith('rehearsal-')||db.profiles[token].rehearsals?.includes(r.id)),predictions,receipts:Object.values(db.receipts??{}).filter(r=>r.roundId.startsWith('guest-'+token.slice(0,8))),profile:{name:db.profiles[token].name,watchAddress:db.profiles[token].watchAddress},leaderboard:[...standings.values()].sort((a,b)=>b.points-a.points),draft:db.drafts[token]??'',serverTime:Math.floor(Date.now()/1000)};
  });return response(data,token,fresh);
}
export async function POST(request:Request){
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'Same-origin request required.'},{status:403});
  const {token,fresh}=await identity();
  try{
    const text=await request.text();if(text.length>12_000)throw new Error('Request too large.');
    const body=JSON.parse(text) as Record<string,unknown>;
    const result=await transaction(db=>{
      db.profiles[token]??={name:'Guest forecaster'};const time=Math.floor(Date.now()/1000);
      if(body.action==='predict')return submitPractice(db,token,String(body.roundId),Number(body.range),time,Number(body.guess??0));
      if(body.action==='rehearse')return startRehearsal(db,token,time);
      if(body.action==='draft'){if(typeof body.draft!=='string'||body.draft.length>8000)throw new Error('Draft too large.');db.drafts[token]=body.draft;return {saved:true};}
      throw new Error('Unknown action.');
    });return response(result,token,fresh);
  }catch(error){return response({error:error instanceof Error?error.message:'Request failed. Try again.'},token,fresh,400);}
}
