'use client';
import {ArrowRight} from 'lucide-react';
import {displayGen} from '@/lib/film-market';
import type {useMusic} from '@/lib/use-music';
export default function MusicCredit({state,marketId}:{state:ReturnType<typeof useMusic>;marketId?:string}) {
 const credit=state.data?.credit,withdrawal=credit?.withdrawal;
 if(!credit||BigInt(credit.available)<=0n&&!withdrawal)return null;
 const available=BigInt(credit.available)>0n;
 const verifying=!!withdrawal&&!['failed','paid'].includes(withdrawal.status);
 return <section className="music-review-credit" aria-label="Review credit">
 {available&&<><p><strong>{displayGen(credit.available)} GEN review credit available</strong></p><button className="button secondary" disabled={state.busy||state.pending||verifying} onClick={()=>void state.submit('challenges','claim',['challenge-credit',(withdrawal?.attempt??0)+1],0n,marketId).catch(()=>{})}>{withdrawal?.status==='failed'?'Retry review collection':'Collect review credit'} <ArrowRight size={16}/></button></>}
 {withdrawal&&<p role="status">Review withdrawal: {withdrawal.status.replaceAll('_',' ')} · {displayGen(withdrawal.amount)} GEN. {withdrawal.status==='failed'?'The transfer failed. Your credit is available for retry.':withdrawal.status==='paid'?'Native GEN credit independently verified.':'Native transfer verification is in progress. Wait before collecting again.'}</p>}
 </section>;
}
