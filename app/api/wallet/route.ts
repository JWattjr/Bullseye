import {walletBalance} from '@/lib/film-market-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return Response.json({error: 'Invalid wallet address.'}, {status: 400});
  try {return Response.json({balance: await walletBalance(address as `0x${string}`), network: 'StudioNet'});}
  catch {return Response.json({error: 'Balance is temporarily unavailable.'}, {status: 502});}
}
