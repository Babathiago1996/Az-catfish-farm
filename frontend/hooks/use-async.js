"use client";
import { useCallback, useState } from "react";
import { toast } from "sonner";
export function useAsync(action,{successMessage}={}){const [loading,setLoading]=useState(false);const run=useCallback(async(...args)=>{setLoading(true);try{const result=await action(...args);if(successMessage)toast.success(successMessage);return result}catch(error){toast.error(error.message||"Something went wrong.");throw error}finally{setLoading(false)}},[action,successMessage]);return{run,loading};}
