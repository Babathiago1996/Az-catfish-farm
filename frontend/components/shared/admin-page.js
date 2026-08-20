"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Spinner } from "@/components/ui/spinner";
export function AdminPage({children,title,description}){const {isAuthenticated,loading}=useAuth();const router=useRouter();useEffect(()=>{if(!loading&&!isAuthenticated)router.replace('/login')},[loading,isAuthenticated,router]);if(loading||!isAuthenticated)return <div className="grid min-h-screen place-items-center bg-[var(--background)]"><Spinner className="h-8 w-8"/></div>;return children;}
