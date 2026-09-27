import Image from 'next/image';

export function Brand({size=29}:{size?:number}) {
  return <span className="brand"><Image src={`${process.env.NEXT_PUBLIC_BASE_PATH??""}/knowverse-mark.svg`} width={size} height={size} alt="" className="brand-icon" priority/> <span>knowverse</span></span>;
}
