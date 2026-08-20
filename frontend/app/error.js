"use client";
import {useEffect} from "react";import {Button} from "@/components/ui/button";
export default function Error({reset}){useEffect(()=>{},[]);return <main className="grid min-h-screen place-items-center bg-[var(--background)] p-6"><div className="max-w-md text-center"><h1 className="text-3xl font-black">Something went wrong.</h1><p className="mt-2 text-sm text-[var(--muted)]">The interface hit an unexpected error. Your farm data is still controlled by the backend.</p><Button className="mt-6" onClick={()=>reset()}>Try again</Button></div></main>}
