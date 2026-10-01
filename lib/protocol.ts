import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import type {GenLayerTransaction} from 'genlayer-js/types';
export const readClient=()=>createClient({chain:studionet});
export function successfulFinalized(receipt:GenLayerTransaction|Record<string,unknown>):boolean {
  const r=receipt as unknown as Record<string,unknown>;
  const status=r.statusName??r.status_name;
  const consensus=r.consensus_data as {leader_receipt?:Array<{execution_result?:string;result?:{status?:string}}> }|undefined;
  const leader=consensus?.leader_receipt?.[0];
  const execution=r.txExecutionResultName??leader?.execution_result;
  return status==='FINALIZED' && (execution==='SUCCESS'||execution==='FINISHED_WITH_RETURN') && leader?.result?.status!=='rollback';
}
