"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  WalletCards,
  TrendingUp,
  TrendingDown,
  Fish,
  HeartPulse,
  ReceiptText,
  Printer,
  Layers,
  Boxes,
  ChevronDown,
  Sprout,
  PackagePlus,
} from "lucide-react";

import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  labelize,
  pondName,
} from "@/lib/utils";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/*
 * ============================================================
 * STATUS PILL
 *
 * The backend returns a { code, label } status for every
 * audited year (still stocking & growing, harvest in
 * progress, or closed). This maps that status to a colour.
 * ============================================================
 */
const STATUS_STYLES = {
  IN_PROGRESS:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  CLOSED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  CLOSED_NO_SALES:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  NO_ACTIVITY:
    "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
};

function StatusPill({ status }) {
  if (!status) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
        STATUS_STYLES[status.code] || STATUS_STYLES.NO_ACTIVITY
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.label}
    </span>
  );
}

/**
 * Consistently colours a profit / loss figure green or red.
 */
function ProfitValue({ value, className = "" }) {
  const isProfit = Number(value) >= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 font-black ${
        isProfit ? "text-emerald-600" : "text-red-600"
      } ${className}`}
    >
      {isProfit ? (
        <TrendingUp className="h-4 w-4 shrink-0" />
      ) : (
        <TrendingDown className="h-4 w-4 shrink-0" />
      )}
      {formatCurrency(value)}
    </span>
  );
}

const COST_BUCKET_ICON = {
  stocking: Sprout,
  expenses: WalletCards,
  inventory: PackagePlus,
};

const COST_BUCKET_COLOR = {
  stocking: "bg-teal-600",
  expenses: "bg-amber-500",
  inventory: "bg-violet-600",
};

export default function Audit() {
  const [years, setYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(null);
  const [view, setView] = useState(null); // "overview" | a numeric year
  const [overview, setOverview] = useState(null);
  const [yearAudit, setYearAudit] = useState(null);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingView, setLoadingView] = useState(true);

  /*
   * Load the list of audit years once, then default the
   * screen straight onto the CURRENT year — "if I'm still
   * spending, show me the record so far" — rather than a
   * lifetime overview.
   */
  useEffect(() => {
    let mounted = true;

    setLoadingYears(true);

    api.audit
      .years()
      .then((data) => {
        if (!mounted) return;

        setYears(data?.years || []);
        setCurrentYear(data?.currentYear || new Date().getFullYear());
        setView(data?.currentYear || new Date().getFullYear());
      })
      .catch((error) => toast.error(error.message))
      .finally(() => {
        if (mounted) setLoadingYears(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Whenever the selected tab changes, pull either the
   * lifetime overview or the full ledger for that year.
   */
  useEffect(() => {
    if (view === null) return;

    let mounted = true;

    setLoadingView(true);

    const request =
      view === "overview" ? api.audit.overview() : api.audit.year(view);

    request
      .then((data) => {
        if (!mounted) return;

        if (view === "overview") {
          setOverview(data?.overview || null);
        } else {
          setYearAudit(data?.audit || null);
        }
      })
      .catch((error) => toast.error(error.message))
      .finally(() => {
        if (mounted) setLoadingView(false);
      });

    return () => {
      mounted = false;
    };
  }, [view]);

  const yearChips = useMemo(() => {
    const list = years.length ? years : currentYear ? [currentYear] : [];
    return list;
  }, [years, currentYear]);

  return (
    <AdminLayout
      title="Audit"
      description="A full account of every naira spent and earned"
    >
      <PageHeader
        eyebrow="Financial Audit"
        title="Farm Audit"
        description="Every naira spent — on stocking, on expenses, and on materials stocked into inventory — weighed against every naira earned from sales."
        secondary={
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        }
      />

      {/* ============================================================
          YEAR SELECTOR
          ============================================================ */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2">
        <button
          type="button"
          onClick={() => setView("overview")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${
            view === "overview"
              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          }`}
        >
          <Layers className="h-4 w-4" />
          All years
        </button>

        <div className="h-6 w-px bg-[var(--border)]" />

        {loadingYears && (
          <span className="px-3 text-xs text-[var(--muted)]">
            Loading years…
          </span>
        )}

        {yearChips.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => setView(year)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              view === year
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            {year}
            {year === currentYear && (
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                current
              </span>
            )}
          </button>
        ))}
      </div>

      {loadingView && (
        <div className="grid min-h-72 place-items-center gap-3 text-sm text-slate-400">
          <Spinner className="h-6 w-6" />
          Building the audit…
        </div>
      )}

      {!loadingView && view === "overview" && overview && (
        <OverviewView overview={overview} onSelectYear={setView} />
      )}

      {!loadingView && view !== "overview" && yearAudit && (
        <YearView audit={yearAudit} />
      )}
    </AdminLayout>
  );
}

/*
 * ============================================================
 * LIFETIME OVERVIEW — only what a manager actually needs at
 * a glance: total spent, total earned, net position, fish
 * lost, a trend chart, and a lean year-by-year table.
 * ============================================================
 */
function OverviewView({ overview, onSelectYear }) {
  const { lifetime, byYear } = overview;

  const chartData = [...byYear]
    .sort((a, b) => a.year - b.year)
    .map((row) => ({
      year: String(row.year),
      Revenue: row.revenue,
      Cost: row.totalCostOfProduction,
      Profit: row.netProfit,
    }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total spent (lifetime)"
          value={formatCurrency(lifetime.totals.totalCostOfProduction)}
          sub="Stocking + expenses + inventory"
          icon={WalletCards}
        />

        <MetricCard
          label="Total revenue (lifetime)"
          value={formatCurrency(lifetime.totals.totalRevenue)}
          sub={`${formatCurrency(lifetime.totals.totalCollected)} collected`}
          icon={ReceiptText}
        />

        <MetricCard
          label="Net profit / loss"
          value={formatCurrency(lifetime.totals.netProfit)}
          sub={
            lifetime.totals.netProfit >= 0
              ? "Profitable overall"
              : "Running at a loss overall"
          }
          icon={lifetime.totals.netProfit >= 0 ? TrendingUp : TrendingDown}
        />

        <MetricCard
          label="Fish lost (lifetime)"
          value={formatNumber(lifetime.mortality.totalQuantity)}
          sub={`≈ ${formatCurrency(lifetime.mortality.estimatedValue)} lost value`}
          icon={HeartPulse}
        />
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs cost vs profit, by year</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="Cost" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Profit" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader>
            <CardTitle>Year-by-year record</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {byYear.length ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Year</TH>
                    <TH>Total spent</TH>
                    <TH>Revenue</TH>
                    <TH>Net profit / loss</TH>
                    <TH>Status</TH>
                    <TH />
                  </TR>
                </THead>

                <TBody>
                  {byYear.map((row) => (
                    <TR key={row.year}>
                      <TD className="font-black">{row.year}</TD>
                      <TD>{formatCurrency(row.totalCostOfProduction)}</TD>
                      <TD>{formatCurrency(row.revenue)}</TD>
                      <TD>
                        <ProfitValue value={row.netProfit} />
                      </TD>
                      <TD>
                        <StatusPill status={row.status} />
                      </TD>
                      <TD>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectYear(row.year)}
                        >
                          View
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No audit history yet"
                  description="Once stocking, expenses, inventory or sales are recorded, they'll appear here year by year."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/*
 * ============================================================
 * SINGLE YEAR AUDIT
 * ============================================================
 */
function YearView({ audit }) {
  const { stocking, expenses, inventory, mortality, sales, totals, costBreakdown, status, isCurrentYear } =
    audit;

  return (
    <>
      {/* STATUS BANNER */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <div className="text-lg font-black">{audit.year} Audit</div>
            <div className="text-xs text-[var(--muted)]">
              {isCurrentYear
                ? "Running total — money spent and earned so far this year"
                : "Closed-year record"}
            </div>
          </div>
        </div>

        <StatusPill status={status} />
      </div>

      {/* HEADLINE KPIs — the only numbers that matter at a glance */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total spent this year"
          value={formatCurrency(totals.totalCostOfProduction)}
          sub="Stocking + expenses + inventory"
          icon={WalletCards}
        />

        <MetricCard
          label="Total sales revenue"
          value={formatCurrency(totals.totalRevenue)}
          sub={`${formatCurrency(totals.totalCollected)} collected · ${formatCurrency(
            totals.totalOutstanding,
          )} outstanding`}
          icon={ReceiptText}
        />

        <MetricCard
          label="Net profit / loss"
          value={formatCurrency(totals.netProfit)}
          sub={
            totals.profitMarginPercent === null
              ? "No sales recorded yet"
              : `${formatNumber(totals.profitMarginPercent, 1)}% margin on revenue`
          }
          icon={totals.netProfit >= 0 ? TrendingUp : TrendingDown}
        />

        <MetricCard
          label="Fish lost to mortality"
          value={formatNumber(mortality.totalQuantity)}
          sub={`≈ ${formatCurrency(mortality.estimatedValue)} in lost value`}
          icon={HeartPulse}
        />
      </div>

      {/* WHERE THE MONEY WENT — stocking vs expenses vs inventory,
          the three real cost centres, side by side */}
      <div className="mt-5">
        <Card>
          <CardHeader>
            <CardTitle>Where the money went</CardTitle>
          </CardHeader>

          <CardContent>
            {costBreakdown.length ? (
              <div className="space-y-4">
                {costBreakdown.map((row) => {
                  const percent =
                    totals.totalCostOfProduction > 0
                      ? (row.amount / totals.totalCostOfProduction) * 100
                      : 0;

                  const Icon = COST_BUCKET_ICON[row.key] || WalletCards;

                  return (
                    <div key={row.key}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-semibold">
                          <Icon className="h-4 w-4 text-[var(--muted)]" />
                          {row.label}
                        </span>
                        <span className="font-black">
                          {formatCurrency(row.amount)}
                          <span className="ml-2 text-xs font-semibold text-[var(--muted)]">
                            {formatNumber(percent, 0)}%
                          </span>
                        </span>
                      </div>

                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            COST_BUCKET_COLOR[row.key] || "bg-blue-600"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Nothing spent yet"
                description="Stocking cost, expenses and inventory purchases for this year will show up here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECONDARY OPERATIONAL METRICS */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Fingerlings stocked"
          value={formatNumber(stocking.totalQuantity)}
          sub={`${formatNumber(stocking.records)} stocking record(s)`}
          icon={Fish}
        />

        <MetricCard
          label="Fish sold"
          value={formatNumber(sales.totalFishSold)}
          sub={`${formatNumber(sales.totalWeightKg, 1)} kg total weight`}
          icon={Boxes}
        />

        <MetricCard
          label="Survival rate"
          value={
            mortality.survivalRatePercent === null
              ? "—"
              : `${formatNumber(mortality.survivalRatePercent, 1)}%`
          }
          sub="Stocked vs lost this year"
          icon={HeartPulse}
        />

        <MetricCard
          label="Cost per kg produced"
          value={
            totals.costPerKgSold === null
              ? "—"
              : formatCurrency(totals.costPerKgSold)
          }
          sub="Total cost ÷ total weight sold"
          icon={WalletCards}
        />
      </div>

      {/* FULL LEDGER — every record behind every figure above,
          tucked away behind a single drill-down so the page
          opens clean and only shows this on request. */}
      <DetailedLedger
        stocking={stocking}
        expenses={expenses}
        inventory={inventory}
        mortality={mortality}
        sales={sales}
      />
    </>
  );
}

/*
 * ============================================================
 * DETAILED LEDGER (collapsed by default)
 *
 * One drill-down section with a tab per record type, instead
 * of five permanently-open tables. Keeps the page focused on
 * the numbers that matter, while every underlying record
 * stays one click away for a real audit trail.
 * ============================================================
 */
function DetailedLedger({ stocking, expenses, inventory, mortality, sales }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("stocking");

  const tabs = [
    { key: "stocking", label: "Stocking", count: stocking.items?.length || 0 },
    { key: "expenses", label: "Expenses", count: expenses.items?.length || 0 },
    { key: "inventory", label: "Inventory", count: inventory.items?.length || 0 },
    { key: "mortality", label: "Mortality", count: mortality.items?.length || 0 },
    { key: "sales", label: "Sales", count: sales.items?.length || 0 },
  ];

  return (
    <div className="mt-5">
      <Card>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <div>
            <CardTitle>Detailed ledger</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Every stocking, expense, inventory, mortality and sales record
              behind the figures above.
            </p>
          </div>

          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[var(--muted)] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <CardContent className="pt-0">
            <div className="mb-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    tab === item.key
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 opacity-70">({item.count})</span>
                </button>
              ))}
            </div>

            {tab === "stocking" && (
              <LedgerTable
                rows={stocking.items}
                emptyTitle="No stocking recorded this year"
                emptyDescription="Fingerling purchases for this year will be listed here."
                head={
                  <TR>
                    <TH>Date</TH>
                    <TH>Pond</TH>
                    <TH>Quantity</TH>
                    <TH>Size</TH>
                    <TH>Supplier</TH>
                    <TH>Cost</TH>
                  </TR>
                }
                renderRow={(row) => (
                  <TR key={row._id}>
                    <TD>{formatDate(row.stockingDate)}</TD>
                    <TD>{pondName(row.pond)}</TD>
                    <TD>{formatNumber(row.fingerlingQuantity)}</TD>
                    <TD>
                      {formatNumber(row.fingerlingSize, 2)}{" "}
                      {row.fingerlingSizeUnit}
                    </TD>
                    <TD>{row.supplier || "—"}</TD>
                    <TD className="font-bold">{formatCurrency(row.cost)}</TD>
                  </TR>
                )}
              />
            )}

            {tab === "expenses" && (
              <LedgerTable
                rows={expenses.items}
                emptyTitle="No expenses recorded this year"
                emptyDescription="Every feed, medicine, fuel and other cost logged this year will be listed here."
                head={
                  <TR>
                    <TH>Date</TH>
                    <TH>Category</TH>
                    <TH>Description</TH>
                    <TH>Vendor</TH>
                    <TH>Amount</TH>
                  </TR>
                }
                renderRow={(row) => (
                  <TR key={row._id}>
                    <TD>{formatDate(row.expenseDate)}</TD>
                    <TD>{labelize(row.category)}</TD>
                    <TD className="max-w-xs truncate">{row.description}</TD>
                    <TD>{row.vendor || "—"}</TD>
                    <TD className="font-bold">{formatCurrency(row.amount)}</TD>
                  </TR>
                )}
              />
            )}

            {tab === "inventory" && (
              <LedgerTable
                rows={inventory.items}
                emptyTitle="No inventory stocked in this year"
                emptyDescription="Feed, medicine, nets, fuel and other materials brought into inventory this year will be listed here."
                head={
                  <TR>
                    <TH>Date</TH>
                    <TH>Item</TH>
                    <TH>Category</TH>
                    <TH>Quantity</TH>
                    <TH>Unit cost</TH>
                    <TH>Amount spent</TH>
                  </TR>
                }
                renderRow={(row) => (
                  <TR key={row._id}>
                    <TD>{formatDate(row.transactionDate)}</TD>
                    <TD>{row.inventoryItem?.name || "—"}</TD>
                    <TD>{labelize(row.inventoryItem?.category)}</TD>
                    <TD>
                      {formatNumber(row.quantity)} {row.inventoryItem?.unit || ""}
                    </TD>
                    <TD>{formatCurrency(row.unitCost)}</TD>
                    <TD className="font-bold">{formatCurrency(row.amount)}</TD>
                  </TR>
                )}
              />
            )}

            {tab === "mortality" && (
              <LedgerTable
                rows={mortality.items}
                emptyTitle="No mortality recorded this year"
                emptyDescription="Fish losses logged this year, and their estimated value, will be listed here."
                head={
                  <TR>
                    <TH>Date</TH>
                    <TH>Pond</TH>
                    <TH>Quantity lost</TH>
                    <TH>Cause</TH>
                    <TH>Est. value lost</TH>
                  </TR>
                }
                renderRow={(row) => (
                  <TR key={row._id}>
                    <TD>{formatDate(row.date)}</TD>
                    <TD>{pondName(row.pond)}</TD>
                    <TD className="font-bold text-red-600">
                      {formatNumber(row.quantity)}
                    </TD>
                    <TD>{labelize(row.estimatedCause)}</TD>
                    <TD>
                      {formatCurrency(
                        row.quantity * mortality.averageCostPerFishUsed,
                      )}
                    </TD>
                  </TR>
                )}
              />
            )}

            {tab === "sales" && (
              <LedgerTable
                rows={sales.items}
                emptyTitle="No sales recorded this year"
                emptyDescription="Every harvest sale logged this year will be listed here."
                head={
                  <TR>
                    <TH>Date</TH>
                    <TH>Invoice</TH>
                    <TH>Customer</TH>
                    <TH>Pond</TH>
                    <TH>Qty sold</TH>
                    <TH>Weight (kg)</TH>
                    <TH>Amount</TH>
                    <TH>Status</TH>
                  </TR>
                }
                renderRow={(row) => (
                  <TR key={row._id}>
                    <TD>{formatDate(row.saleDate)}</TD>
                    <TD className="font-mono text-xs">{row.invoiceNumber}</TD>
                    <TD>{row.customerName}</TD>
                    <TD>{pondName(row.pond)}</TD>
                    <TD>{formatNumber(row.quantitySold)}</TD>
                    <TD>{formatNumber(row.totalWeight, 2)}</TD>
                    <TD className="font-bold text-emerald-600">
                      {formatCurrency(row.totalAmount)}
                    </TD>
                    <TD>{labelize(row.paymentStatus)}</TD>
                  </TR>
                )}
              />
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/**
 * A single scrollable ledger table, or an empty state when
 * there are no records of that type for the selected year.
 */
function LedgerTable({ rows, head, renderRow, emptyTitle, emptyDescription }) {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <Table>
        <THead>{head}</THead>
        <TBody>{rows.map(renderRow)}</TBody>
      </Table>
    </div>
  );
}
