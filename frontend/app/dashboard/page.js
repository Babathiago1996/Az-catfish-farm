"use client";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils";
import {
  Fish,
  Waves,
  WalletCards,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";
import { toInputDate } from "@/lib/utils";
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({
    from: toInputDate(new Date(Date.now() - 29 * 86400000)),
    to: toInputDate(),
  });
  const load = () => {
    setLoading(true);
    api.dashboard
      .get(range)
      .then((r) => setData(r?.dashboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [range.from, range.to]);
  const o = data?.overview || {};
  const sales = data?.charts?.salesByDay || [];
  const expenses = data?.charts?.expensesByDay || [];
  const growth = data?.charts?.growth || [];
  return (
    <AdminLayout title="Dashboard" description="Your farm command center">
      <PageHeader
        eyebrow="Overview"
        title="Good morning. Here’s the farm."
        description="A connected view of production, cash flow, inventory and recent activity."
        action={{
          label: "Record activity",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => (window.location.href = "/activities"),
        }}
        secondary={
          <div className="flex items-center gap-2 rounded-xl border bg-[var(--card)] p-1">
            <input
              type="date"
              value={range.from}
              onChange={(e) =>
                setRange((v) => ({ ...v, from: e.target.value }))
              }
              className="h-8 rounded-lg bg-transparent px-2 text-xs outline-none"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((v) => ({ ...v, to: e.target.value }))}
              className="h-8 rounded-lg bg-transparent px-2 text-xs outline-none"
            />
          </div>
        }
      />
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Current fish"
              value={formatNumber(o.fish?.currentCount)}
              sub={`${formatNumber(o.fish?.biomassKg, 3)} kg estimated biomass`}
              icon={Fish}
            />
            <MetricCard
              label="Active ponds"
              value={formatNumber(o.ponds?.active)}
              sub={`${formatNumber(o.ponds?.total)} total ponds`}
              icon={Waves}
            />
            <MetricCard
              label="Net revenue"
              value={formatCurrency(o.financial?.netRevenue)}
              sub={`${formatCurrency(o.financial?.revenue)} revenue`}
              icon={WalletCards}
            />
            <MetricCard
              label="Low stock"
              value={formatNumber(o.inventory?.lowStock)}
              sub={`${formatNumber(o.inventory?.outOfStock)} out of stock`}
              icon={Boxes}
            />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue vs expenses</CardTitle>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Daily activity for the selected period
                    </p>
                  </div>
                  <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"
                  >
                    View analytics <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  {sales.length || expenses.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mergeSeries(sales, expenses)}>
                        <defs>
                          <linearGradient
                            id="revenueFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#2563eb"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#2563eb"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => String(v).slice(5)}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                        />
                        <Tooltip
                          formatter={(v, n) => [
                            formatCurrency(v),
                            n === "revenue" ? "Revenue" : "Expenses",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#2563eb"
                          fill="url(#revenueFill)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#f59e0b"
                          fill="none"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Production pulse</CardTitle>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Selected period
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Pulse label="Stocked" value={o.fish?.stocked} />
                  <Pulse label="Mortality" value={o.fish?.mortality} danger />
                  <Pulse label="Surviving" value={o.fish?.estimatedSurviving} />
                  <Pulse
                    label="Survival rate"
                    value={o.fish?.survivalRate}
                    suffix="%"
                  />
                </div>
                <div className="mt-5 rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300">
                    <TrendingUp className="h-4 w-4" /> Growth records
                  </div>
                  <div className="mt-2 text-2xl font-black">
                    {formatNumber(o.growth?.totalRecords)}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    records captured
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Sales by day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  {sales.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sales}>
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => String(v).slice(5)}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis hide />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Bar
                          dataKey="revenue"
                          fill="#2563eb"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Expense mix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  {data?.charts?.expensesByCategory?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.charts.expensesByCategory}
                          dataKey="amount"
                          nameKey="category"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={3}
                        >
                          {data.charts.expensesByCategory.map((x, i) => (
                            <Cell
                              key={x.category}
                              fill={
                                [
                                  "#2563eb",
                                  "#0f766e",
                                  "#f59e0b",
                                  "#8b5cf6",
                                  "#ef4444",
                                ][i % 5]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Low stock attention</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.inventory?.lowStockItems?.length ? (
                  <div className="space-y-3">
                    {data.inventory.lowStockItems.slice(0, 5).map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between gap-3 rounded-xl border p-3"
                      >
                        <div>
                          <div className="text-sm font-bold">{item.name}</div>
                          <div className="text-xs text-[var(--muted)]">
                            Reorder at {formatNumber(item.reorderLevel)}{" "}
                            {item.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-red-600">
                            {formatNumber(item.quantity)} {item.unit}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            remaining
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link
                      href="/inventory"
                      className="block text-center text-xs font-bold text-blue-600"
                    >
                      Manage inventory
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                    Inventory is comfortably above configured reorder levels.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="mt-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent activity</CardTitle>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Latest audit events across the farm
                  </p>
                </div>
                <Link
                  href="/activities"
                  className="text-xs font-bold text-blue-600"
                >
                  View daily activities
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-[var(--border)]">
                {(data?.recentActivities || []).map((a) => (
                  <div key={a._id} className="flex items-start gap-3 py-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {a.description}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {a.entityType} • {formatDateTime(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
function mergeSeries(a, b) {
  const map = new Map();
  [...a, ...b].forEach((x) =>
    map.set(x.date, { ...map.get(x.date), date: x.date }),
  );
  a.forEach((x) =>
    map.set(x.date, { ...map.get(x.date), revenue: x.revenue || 0 }),
  );
  b.forEach((x) =>
    map.set(x.date, {
      ...map.get(x.date),
      expenses: x.amount || x.expenses || 0,
    }),
  );
  return [...map.values()].sort((x, y) => x.date.localeCompare(y.date));
}
function Pulse({ label, value, danger, suffix = "" }) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-3">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span
        className={
          danger ? "text-sm font-black text-red-600" : "text-sm font-black"
        }
      >
        {formatNumber(value, 2)}
        {suffix}
      </span>
    </div>
  );
}
function EmptyChart() {
  return (
    <div className="grid h-full place-items-center text-xs text-slate-400">
      No chart data for this period.
    </div>
  );
}
function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
