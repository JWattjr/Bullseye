import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(JSON.parse(await readFile(join(process.cwd(),'public/protocol-proof.json'),'utf8')),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({pending:true,reason:'The saved finalized protocol record is not yet available.'});}}
