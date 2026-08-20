"use client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminPage } from "@/components/shared/admin-page";
export function AdminLayout({children,title,description}){return <AdminPage><DashboardShell title={title} description={description}>{children}</DashboardShell></AdminPage>}
