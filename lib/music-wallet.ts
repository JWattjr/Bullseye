'use client';
import {walletProvider} from './use-wallet';

export async function musicWalletClient() {
  const provider = walletProvider();
  if (!provider) throw Error('Enable your MetaMask wallet and the GenLayer plugin to connect.');
  let accounts = await provider.request({method: 'eth_accounts'}) as string[];
  if (!accounts.length) accounts = await provider.request({method: 'eth_requestAccounts'}) as string[];
  if (!/^0x[a-fA-F0-9]{40}$/.test(accounts[0] ?? '')) throw Error('Choose an account in your wallet.');
  const [{createClient}, {studionet}] = await Promise.all([import('genlayer-js'), import('genlayer-js/chains')]);
  const client = createClient({chain: studionet, account: accounts[0] as `0x${string}`, provider: provider as never});
  await client.connect('studionet');
  window.dispatchEvent(new CustomEvent('bullseye:wallet-connected', {detail: accounts[0]}));
  return client;
}
