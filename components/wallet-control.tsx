'use client';
import {useEffect,useState} from 'react';
import {Wallet} from 'lucide-react';

type Provider={request:(args:{method:string})=>Promise<unknown>;on?:(event:string,listener:(accounts:unknown)=>void)=>void;removeListener?:(event:string,listener:(accounts:unknown)=>void)=>void};
export default function WalletControl({connect}:{connect:()=>Promise<void>}){
  const [address,setAddress]=useState('');const [connecting,setConnecting]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{
    const provider=(window as unknown as {ethereum?:Provider}).ethereum;let active=true;
    const update=(accounts:unknown)=>{const first=Array.isArray(accounts)?accounts[0]:null;if(active)setAddress(typeof first==='string'&&/^0x[a-fA-F0-9]{40}$/.test(first)?first:'');};
    const connected=(event:Event)=>update([(event as CustomEvent<string>).detail]);
    // Read existing permissions only. Never request a connection on page load.
    provider?.request({method:'eth_accounts'}).then(update).catch(()=>{});
    provider?.on?.('accountsChanged',update);window.addEventListener('bullseye:wallet-connected',connected);
    return()=>{active=false;provider?.removeListener?.('accountsChanged',update);window.removeEventListener('bullseye:wallet-connected',connected);};
  },[]);
  async function request(){setConnecting(true);setError('');try{await connect();}catch(reason){const e=reason as {code?:number;message?:string};setError(e.code===4001?'Connection declined. Try again when you’re ready.':e.message??'Wallet connection failed. Try again.');}finally{setConnecting(false);}}
  return <div className="wallet-control"><button className="wallet-button" onClick={request} disabled={connecting} aria-label={address?'Wallet connected: '+address:undefined} title={address||'Connect to StudioNet for live participation'}><Wallet size={17}/>{connecting?'Connecting…':address?address.slice(0,6)+'…'+address.slice(-4):'Connect wallet'}</button>{error&&<div className="wallet-message" role="alert">{error}<p>Guest practice is still available.</p></div>}</div>;
}
