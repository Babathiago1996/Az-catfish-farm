"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useFarmSettings } from "@/hooks/use-farm-settings";

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { farm } = useFarmSettings();
  const nav = [["Home","/"],["About","/about"],["Farm Overview","/overview"],["Gallery","/gallery"],["Contact","/contact"]];
  const name = farm?.farmName || "AZ Fish Farm";
  return <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80">
    <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3" onClick={()=>setOpen(false)}>
        <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-slate-950 text-white shadow-lg">
          {farm?.farmLogo?.url ? <img src={farm.farmLogo.url} alt={name} className="h-full w-full object-cover" /> : <span className="text-lg font-black">AZ</span>}
        </div>
        <div><div className="text-sm font-black tracking-tight">{name}</div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">Catfish • Quality • Trust</div></div>
      </Link>
      <nav className="hidden items-center gap-1 md:flex">
        {nav.map(([label, href]) => <Link key={href} href={href} className={`relative rounded-xl px-3.5 py-2 text-sm font-semibold ${pathname===href ? "text-blue-600" : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}>{label}{pathname===href && <motion.span layoutId="nav" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600" />}</Link>)}
      </nav>
      <div className="hidden md:flex"><Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"><span>Farm Portal</span><ArrowRight className="h-4 w-4" /></Link></div>
      <button className="grid h-10 w-10 place-items-center rounded-xl border md:hidden" onClick={()=>setOpen(v=>!v)}>{open?<X/>:<Menu/>}</button>
    </div>
    {open && <div className="border-t bg-white px-4 py-4 dark:bg-slate-950 md:hidden"><div className="grid gap-1">{nav.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900">{label}</Link>)}<Link href="/login" onClick={()=>setOpen(false)} className="mt-2 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white">Open Farm Portal</Link></div></div>}
  </header>;
}
