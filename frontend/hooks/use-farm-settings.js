"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
const FALLBACK={farmName:"AZ Fish Farm",farmLogo:{url:"",publicId:""},email:"",phone:"",address:"",about:"",socialLinks:{}};
export function useFarmSettings(){
 const [farm,setFarm]=useState(FALLBACK); const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;api.public.home().then((r)=>{if(active&&r?.content?.farm)setFarm(r.content.farm)}).catch(()=>{}).finally(()=>active&&setLoading(false));return()=>{active=false}},[]);
 return {farm,loading};
}
