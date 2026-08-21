import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return <Link href={href} className="adaptara-brand" aria-label="Adaptara home">
    <Image src="/brand/logo.png" alt="" width={42} height={42} className="adaptara-brand__mark" priority />
    {!compact ? <span>Adaptara</span> : null}
  </Link>;
}
