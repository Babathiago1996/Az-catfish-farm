"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  Settings2,
  LayoutDashboard,
  Waves,
  Fish,
  CalendarCheck,
  Utensils,
  Droplets,
  TrendingUp,
  HeartPulse,
  ReceiptText,
  WalletCards,
  Boxes,
  UsersRound,
  Truck,
  FileBarChart,
  ChartNoAxesCombined,
  Images,
  UserCircle,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/hooks/use-notifications";
import { cn, initials } from "@/lib/utils";

const groups = [
  {
    title: "Overview",
    items: [["Dashboard", "/dashboard", "LayoutDashboard"]],
  },
  {
    title: "Farm Operations",
    items: [
      ["Ponds", "/ponds", "Waves"],
      ["Stocking", "/stocking", "Fish"],
      ["Daily Activities", "/activities", "CalendarCheck"],
      ["Feeding", "/feeding", "Utensils"],
      ["Water Management", "/water-management", "Droplets"],
      ["Growth", "/growth", "TrendingUp"],
      ["Mortality", "/mortality", "HeartPulse"],
    ],
  },
  {
    title: "Business",
    items: [
      ["Sales", "/sales", "ReceiptText"],
      ["Expenses", "/expenses", "WalletCards"],
      ["Inventory", "/inventory", "Boxes"],
      ["Customers", "/customers", "UsersRound"],
      ["Suppliers", "/suppliers", "Truck"],
    ],
  },
  {
    title: "Insights",
    items: [
      ["Reports", "/reports", "FileBarChart"],
      ["Analytics", "/analytics", "ChartNoAxesCombined"],
      ["Media Gallery", "/media", "Images"],
    ],
  },
  {
    title: "System",
    items: [
      ["Notifications", "/notifications", "Bell"],
      ["Settings", "/settings", "Settings2"],
    ],
  },
];

export function DashboardShell({
  children,
  title = "Dashboard",
  description = "Farm command center",
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, setTheme } = useTheme();

  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const doLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      setProfileOpen(false);
      setMobile(false);

      await logout();

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);

      setLoggingOut(false);

      /*
       * Even if the API logout request fails, do not leave
       * the administrator trapped inside the dashboard.
       */
      router.replace("/login");
      router.refresh();
    }
  };

  const profileImage =
    typeof admin?.avatar === "string"
      ? admin.avatar
      : admin?.avatar?.url ||
        admin?.avatar?.secure_url ||
        admin?.avatar?.secureUrl ||
        "";

  const profileName = admin?.name || "Administrator";
  const profileEmail = admin?.email || "";

  const closeMobileMenu = () => {
    setMobile(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ============================================================
          DESKTOP SIDEBAR
          ============================================================ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden border-r border-[var(--border)] bg-[var(--card)] transition-all lg:block",
          collapsed ? "w-[78px]" : "w-[260px]",
        )}
      >
        <div className="flex h-20 items-center border-b border-[var(--border)] px-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
              AZ
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-black">AZ Fish Farm</div>

                <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">
                  Management
                </div>
              </div>
            )}
          </Link>
        </div>

        <nav className="h-[calc(100vh-9rem)] overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title} className="mb-5">
              <div
                className={cn(
                  "mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400",
                  collapsed && "text-center",
                )}
              >
                {collapsed ? "•" : group.title}
              </div>

              {group.items.map(([label, href]) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);

                const Icon = iconFor(label);

                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                      active
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />

                    <span className={cn(collapsed && "hidden")}>{label}</span>

                    {label === "Notifications" &&
                      !collapsed &&
                      unreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border)] p-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {collapsed ? "→" : "Collapse navigation"}
          </button>
        </div>
      </aside>

      {/* ============================================================
          MOBILE SIDEBAR
          ============================================================ */}
      {mobile && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/50"
            onClick={closeMobileMenu}
          />

          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.2 }}
            className="relative h-full w-[280px] bg-[var(--card)] p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard"
                onClick={closeMobileMenu}
                className="flex items-center gap-3"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 font-black text-white dark:bg-white dark:text-slate-950">
                  AZ
                </div>

                <span className="font-black">AZ Fish Farm</span>
              </Link>

              <button
                type="button"
                onClick={closeMobileMenu}
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 h-[calc(100vh-6rem)] overflow-y-auto">
              {groups.map((group) => (
                <div key={group.title} className="mb-5">
                  <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
                    {group.title}
                  </div>

                  {group.items.map(([label, href]) => {
                    const active =
                      pathname === href || pathname.startsWith(`${href}/`);

                    const Icon = iconFor(label);

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeMobileMenu}
                        className={cn(
                          "mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                          active
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "hover:bg-slate-100 dark:hover:bg-slate-900",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{label}</span>

                        {label === "Notifications" && unreadCount > 0 && (
                          <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      )}

      {/* ============================================================
          MAIN CONTENT
          ============================================================ */}
      <div
        className={cn(
          "transition-[padding]",
          collapsed ? "lg:pl-[78px]" : "lg:pl-[260px]",
        )}
      >
        {/* ============================================================
            HEADER
            ============================================================ */}
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
            {/* LEFT */}
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobile(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] lg:hidden"
                aria-label="Open navigation"
                aria-expanded={mobile}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden min-w-0 lg:block">
                <h1 className="truncate text-xl font-black tracking-tight">
                  {title}
                </h1>

                <p className="truncate text-xs text-[var(--muted)]">
                  {description}
                </p>
              </div>

              <div className="relative hidden w-72 md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  placeholder="Search the farm..."
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-transparent pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* NOTIFICATIONS */}
              <Link
                href="/notifications"
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-900"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />

                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Link>

              {/* THEME */}
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)]"
                aria-label="Toggle theme"
              >
                <Sun className="h-4 w-4 dark:hidden" />
                <Moon className="hidden h-4 w-4 dark:block" />
              </button>

              <div className="hidden h-8 w-px bg-[var(--border)] sm:block" />

              {/* ======================================================
                  PROFILE AREA

                  IMPORTANT FIX:
                  The previous implementation relied on:
                    group-hover

                  That works with a mouse but is unreliable on
                  touch/mobile devices because there is no hover state.

                  This version uses real React state:
                    profileOpen

                  Therefore the profile button works on:
                    - desktop
                    - tablet
                    - Android
                    - iPhone
                    - touch screens
                  ====================================================== */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  className="flex items-center gap-1.5 rounded-xl p-1.5 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:hover:bg-slate-900 sm:gap-2 sm:px-2"
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  {/* PROFILE PICTURE */}
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-100 text-xs font-black text-blue-700 ring-2 ring-transparent transition group-hover:ring-blue-500/20">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={`${profileName} profile`}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      initials(profileName || profileEmail || "AZ")
                    )}
                  </span>

                  <div className="hidden text-left sm:block">
                    <div className="max-w-28 truncate text-xs font-bold">
                      {profileName}
                    </div>

                    <div className="max-w-28 truncate text-[10px] text-slate-500">
                      {profileEmail}
                    </div>
                  </div>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform",
                      profileOpen && "rotate-180",
                    )}
                  />
                </button>

                {/* ======================================================
                    PROFILE DROPDOWN

                    It is conditionally rendered instead of using
                    invisible/opacity/group-hover CSS.

                    This is the important mobile fix.
                    ====================================================== */}
                {profileOpen && (
                  <>
                    {/* MOBILE/TABLET BACKDROP */}
                    <button
                      type="button"
                      aria-label="Close profile menu"
                      className="fixed inset-0 z-40 cursor-default bg-transparent"
                      onClick={() => setProfileOpen(false)}
                    />

                    <div
                      className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,320px)] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-2xl"
                      role="menu"
                    >
                      {/* PROFILE PREVIEW */}
                      <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
                        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-100 text-sm font-black text-blue-700">
                          {profileImage ? (
                            <img
                              src={profileImage}
                              alt={`${profileName} profile`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials(profileName || profileEmail || "AZ")
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold">
                            {profileName}
                          </div>

                          <div className="truncate text-xs text-slate-500">
                            {profileEmail}
                          </div>
                        </div>
                      </div>

                      {/* VIEW PROFILE */}
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-900"
                        role="menuitem"
                      >
                        <UserCircle className="h-4 w-4" />
                        View profile
                      </Link>

                      {/* SETTINGS */}
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-900"
                        role="menuitem"
                      >
                        <Settings2 className="h-4 w-4" />
                        Settings
                      </Link>

                      {/* PUBLIC WEBSITE */}
                      <Link
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-900"
                        role="menuitem"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Public website
                      </Link>

                      <div className="my-1 border-t border-[var(--border)]" />

                      {/* LOGOUT */}
                      <button
                        type="button"
                        onClick={doLogout}
                        disabled={loggingOut}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/30"
                        role="menuitem"
                      >
                        {loggingOut ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}

                        {loggingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================
            PAGE CONTENT
            ============================================================ */}
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function iconFor(label) {
  return (
    {
      Dashboard: LayoutDashboard,
      Ponds: Waves,
      Stocking: Fish,
      "Daily Activities": CalendarCheck,
      Feeding: Utensils,
      "Water Management": Droplets,
      Growth: TrendingUp,
      Mortality: HeartPulse,
      Sales: ReceiptText,
      Expenses: WalletCards,
      Inventory: Boxes,
      Customers: UsersRound,
      Suppliers: Truck,
      Reports: FileBarChart,
      Analytics: ChartNoAxesCombined,
      "Media Gallery": Images,
      Notifications: Bell,
      Settings: Settings2,
    }[label] || LayoutDashboard
  );
}
