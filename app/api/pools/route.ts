import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {TransactionHashVariant,type TransactionHash} from 'genlayer-js/types';
import {readClient,successfulFinalized} from '@/lib/protocol';
import {creditedTransfer} from '@/lib/pool-proof';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const proof=JSON.parse(await readFile(join(process.cwd(),'public/pool-proof.json'),'utf8'));
    if(!proof.contract)return Response.json({error:'The StudioNet pool deployment is still being verified.'},{status:503});
    const contract=proof.contract as `0x${string}`,client=readClient();
    const hash=new URL(request.url).searchParams.get('receipt');
    if(hash){
      if(!/^0x[a-fA-F0-9]{64}$/.test(hash))return Response.json({error:'Invalid receipt hash.'},{status:400});
      const receipt=await client.getTransaction({hash:hash as TransactionHash});
      const r=receipt as unknown as Record<string,unknown>;
      if(String(r.recipient??r.to_address).toLowerCase()!==contract.toLowerCase())return Response.json({error:'Receipt targets another contract.'},{status:400});
      const hashes=await client.getTriggeredTransactionIds({hash:hash as TransactionHash});
      const transfers=await Promise.all(hashes.slice(0,4).map(async child=>{const transaction=await client.getTransaction({hash:child});const raw=transaction as unknown as Record<string,unknown>;return {hash:child,state:creditedTransfer(raw,contract)?'credited':successfulFinalized(transaction)?'finalized':String(raw.statusName??raw.status_name)==='FINALIZED'?'failed':'pending',recipient:String(raw.recipient??raw.to_address)};}));
      return Response.json({state:successfulFinalized(receipt)?'finalized':String(r.statusName??r.status_name)==='FINALIZED'?'failed':'pending',transfers});
    }
    const ids=await client.readContract({address:contract,functionName:'get_round_ids',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}) as string[];
    const pools=await Promise.all(ids.slice(-6).reverse().map(async id=>JSON.parse(String(await client.readContract({address:contract,functionName:'get_round',args:[id],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})))));
    return Response.json({contract,pools,payoutVerified:proof.payoutVerified===true});
  }catch{return Response.json({error:'StudioNet pools could not load. Retry in a moment; practice remains available.'},{status:502});}
}
