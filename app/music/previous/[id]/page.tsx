import MusicApp from '@/components/music-app';
export default async function Page({params}:{params:Promise<{id:string}>}) {const {id}=await params;return <MusicApp id={id} previous/>;}
