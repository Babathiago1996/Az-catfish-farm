"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
export function useNotifications(){const {isAuthenticated}=useAuth();const [unreadCount,setUnreadCount]=useState(0);useEffect(()=>{if(!isAuthenticated)return;let mounted=true;const load=()=>api.notifications.unreadCount().then((r)=>{if(mounted)setUnreadCount(typeof r==='number'?r:r?.count??0)}).catch(()=>{});load();const id=setInterval(load,60000);return()=>{mounted=false;clearInterval(id)}},[isAuthenticated]);return{unreadCount,setUnreadCount};}
