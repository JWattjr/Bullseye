import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {TransactionHashVariant,type TransactionHash} from 'genlayer-js/types';
import {readClient,successfulFinalized} from '@/lib/protocol';
import {creditedTransfer} from '@/lib/pool-proof';
export const dynamic='force-dynamic';
const movies=['barbie-practice','oppenheimer-practice','dune-two-practice'];
export async function GET(request:Request){
  const query=new URL(request.url).searchParams,movie=query.get('movie');
  if(!movie||!movies.includes(movie))return Response.json({error:'Choose Barbie, Oppenheimer or Dune: Part Two.'},{status:400});
  try{
    const proof=JSON.parse(await readFile(join(process.cwd(),'public/film-pool-proof.json'),'utf8'));
    if(!proof.contract)return Response.json({error:'Movie staking is being deployed.'},{status:503});
    const client=readClient(),contract=proof.contract as `0x${string}`,sourceRoundId=proof.sourceRounds[movie] as string;
    const hash=query.get('receipt');
    if(hash){
      if(!/^0x[a-fA-F0-9]{64}$/.test(hash))return Response.json({error:'Invalid transaction hash.'},{status:400});
      const transaction=await client.getTransaction({hash:hash as TransactionHash}),raw=transaction as unknown as Record<string,unknown>;
      if(String(raw.recipient??raw.to_address).toLowerCase()!==contract.toLowerCase())return Response.json({error:'Receipt belongs to a different contract.'},{status:400});
      const hashes=await client.getTriggeredTransactionIds({hash:hash as TransactionHash});
      const transfers=await Promise.all(hashes.slice(0,4).map(async child=>{const receipt=await client.getTransaction({hash:child}),r=receipt as unknown as Record<string,unknown>;return {hash:child,state:creditedTransfer(r,contract)?'credited':successfulFinalized(receipt)?'finalized':String(r.statusName??r.status_name)==='FINALIZED'?'failed':'pending',recipient:String(r.recipient??r.to_address)};}));
      return Response.json({state:successfulFinalized(transaction)?'finalized':String(raw.statusName??raw.status_name)==='FINALIZED'?'failed':'pending',transfers});
    }
    const [source,ids]=await Promise.all([
      client.readContract({address:proof.bullseye,functionName:'get_round',args:[sourceRoundId],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}),
      client.readContract({address:contract,functionName:'get_source_pool_ids',args:[sourceRoundId],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})
    ]);
    const record=JSON.parse(String(source)),list=ids as string[],before=query.get('before');
    if(before!==null&&!/^\d{1,5}$/.test(before))return Response.json({error:'Invalid pool cursor.'},{status:400});
    const end=before===null?list.length:Math.min(Number(before),list.length),start=Math.max(0,end-5);
    const pools=await Promise.all(list.slice(start,end).reverse().map(async id=>JSON.parse(String(await client.readContract({address:contract,functionName:'get_pool',args:[id],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})))));
    return Response.json({contract,sourceRoundId,source:record,pools,olderBefore:start>0?start:null,ready:proof.payoutVerified===true&&record.status==='resolved'});
  }catch{return Response.json({error:'GEN pools could not load from StudioNet. Refresh pools to retry.'},{status:502});}
}
