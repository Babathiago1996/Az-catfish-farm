"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/providers/auth-provider";

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
