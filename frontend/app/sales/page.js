"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  ReceiptText,
  WalletCards,
  Download,
  Search,
  Edit3,
  Trash2,
  Loader2,
} from "lucide-react";

import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { PAYMENT_STATUSES, PAYMENT_METHODS } from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  pondName,
  toInputDate,
} from "@/lib/utils";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";

const DEFAULT_VALUES = {
  saleDate: toInputDate(),
  pond: "",
  customerName: "",
  phoneNumber: "",
  quantitySold: 100,
  averageWeight: 500,
  pricePerKilogram: 5000,
  amountPaid: 0,
  paymentStatus: "pending",
  paymentMethod: "cash",
  notes: "",
};

export default function Sales() {
  const [rows, setRows] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    pond: "",
    paymentStatus: "",
    search: "",
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  /*
   * Extra safety net against double-submission.
   *
   * react-hook-form's formState.isSubmitting already
   * covers the normal case (see submit() below), but this
   * ref-based lock guarantees a second submit can never
   * slip through even if the button re-render lags a click
   * (e.g. very fast double-click or double Enter key press).
   */
  const isSubmittingRef = useRef(false);

  const load = () =>
    Promise.all([
      api.sales.list({ page, limit: 30, ...filters }),
      api.sales.summary(filters.pond ? { pond: filters.pond } : {}),
    ])
      .then(([r, s]) => {
        setRows(r?.sales || []);
        setPagination(r?.pagination || {});
        setSummary(s?.summary || s);
      })
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    api.ponds
      .list({ limit: 100 })
      .then((r) => setPonds(r?.ponds || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.pond, filters.paymentStatus, filters.search]);

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  const q = useWatch({ control: form.control, name: "quantitySold" });
  const w = useWatch({ control: form.control, name: "averageWeight" });
  const price = useWatch({
    control: form.control,
    name: "pricePerKilogram",
  });

  const total =
    (((Number(q) || 0) * (Number(w) || 0)) / 1000) * (Number(price) || 0);

  const openCreateDialog = () => {
    setEditing(null);
    form.reset(DEFAULT_VALUES);
    setOpen(true);
  };

  const openEditDialog = (row) => {
    setEditing(row);
    form.reset({
      saleDate: toInputDate(row.saleDate),
      pond: row.pond?._id || row.pond || "",
      customerName: row.customerName || "",
      phoneNumber: row.phoneNumber || "",
      quantitySold: row.quantitySold,
      averageWeight: row.averageWeight,
      pricePerKilogram: row.pricePerKilogram,
      amountPaid: row.amountPaid,
      paymentStatus: row.paymentStatus,
      paymentMethod: row.paymentMethod || "cash",
      notes: row.notes || "",
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
  };

  /*
   * This is the fix for sales getting duplicated on
   * submit: previously the submit button had no disabled
   * state and no guard, so a fast double-click (or a slow
   * network response) let the click handler fire twice,
   * creating two identical sales before the first request
   * had even come back.
   *
   * react-hook-form's handleSubmit() automatically tracks
   * this async function's pending promise as
   * formState.isSubmitting, which we use below to disable
   * the button and show a spinner. The isSubmittingRef is
   * a second, synchronous guard so nothing can double-fire
   * inside the same tick before React re-renders the
   * disabled button.
   */
  const submit = async (d) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      const payload = {
        ...d,
        quantitySold: Number(d.quantitySold),
        averageWeight: Number(d.averageWeight),
        pricePerKilogram: Number(d.pricePerKilogram),
        amountPaid: Number(d.amountPaid),
      };

      if (editing) {
        await api.sales.update(editing._id, payload);
        toast.success("Sale updated successfully.");
      } else {
        await api.sales.create(payload);
        toast.success("Sale recorded and pond stock updated.");
      }

      closeDialog();
      form.reset(DEFAULT_VALUES);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const remove = async (row) => {
    if (
      !confirm(
        `Delete the sale for ${row.customerName} (${row.invoiceNumber})? This restores the sold fish back to the pond's stock.`,
      )
    ) {
      return;
    }

    setDeletingId(row._id);

    try {
      await api.sales.remove(row._id);
      toast.success("Sale deleted and pond stock restored.");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * The backend generates a fully formatted, printable
   * invoice as an HTML page (with its own print button and
   * print stylesheet) rather than a real PDF binary. Trying
   * to force-download that HTML with a ".pdf" filename (the
   * previous behavior) produced a broken/mislabeled file
   * that wouldn't open as a PDF.
   *
   * Opening it in a new tab instead lets the invoice render
   * properly, and the person can use the browser's native
   * Print dialog (Ctrl/Cmd+P -> Save as PDF) to get a real,
   * saved PDF copy — the standard, reliable pattern for
   * HTML-based invoices.
   */
  const invoice = async (id) => {
    setDownloadingId(id);

    try {
      const r = await api.sales.invoice(id);
      const blob = new Blob([r.data], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      const invoiceWindow = window.open(url, "_blank");

      if (!invoiceWindow) {
        toast.error("Please allow pop-ups for this site to view the invoice.");
      }

      // Give the new tab time to load the blob before revoking it.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AdminLayout
      title="Sales"
      description="Record harvest sales, payments and customer transactions"
    >
      <PageHeader
        eyebrow="Business"
        title="Sales"
        description="Revenue is tied directly to fish sold and pond stock."
        action={{
          label: "Record sale",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateDialog,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={formatCurrency(summary?.totals?.totalRevenue)}
          icon={ReceiptText}
        />
        <MetricCard
          label="Collected"
          value={formatCurrency(summary?.totals?.totalCollected)}
          icon={WalletCards}
        />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(summary?.totals?.totalOutstanding)}
          icon={WalletCards}
        />
        <MetricCard
          label="Fish sold"
          value={formatNumber(summary?.totals?.totalFishSold)}
          sub={`${formatNumber(summary?.totals?.totalWeightKg, 3)} kg`}
          icon={ReceiptText}
        />
      </div>

      <Card className="mt-5 p-5">
        <div className="mb-5 grid gap-2 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(e) => {
                setPage(1);
                setFilters((v) => ({ ...v, search: e.target.value }));
              }}
              className="pl-9"
              placeholder="Search customer, phone, invoice..."
            />
          </div>

          <Select
            value={filters.pond}
            onChange={(e) => {
              setPage(1);
              setFilters((v) => ({ ...v, pond: e.target.value }));
            }}
          >
            <option value="">All ponds</option>
            {ponds.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>

          <Select
            value={filters.paymentStatus}
            onChange={(e) => {
              setPage(1);
              setFilters((v) => ({ ...v, paymentStatus: e.target.value }));
            }}
          >
            <option value="">All payment states</option>
            {PAYMENT_STATUSES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </div>

        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Invoice</TH>
                <TH>Date</TH>
                <TH>Customer</TH>
                <TH>Pond</TH>
                <TH>Weight</TH>
                <TH>Amount</TH>
                <TH>Payment</TH>
                <TH></TH>
              </TR>
            </THead>

            <TBody>
              {rows.map((r) => (
                <TR key={r._id}>
                  <TD className="font-bold">{r.invoiceNumber}</TD>
                  <TD>{formatDate(r.saleDate)}</TD>
                  <TD>
                    <div className="font-semibold">{r.customerName}</div>
                    <div className="text-xs text-slate-400">
                      {r.phoneNumber || "—"}
                    </div>
                  </TD>
                  <TD>{pondName(r.pond)}</TD>
                  <TD>{formatNumber(r.totalWeight, 3)} kg</TD>
                  <TD>{formatCurrency(r.totalAmount)}</TD>
                  <TD>
                    <StatusBadge status={r.paymentStatus} />
                    <div className="mt-1 text-xs text-slate-400">
                      Due {formatCurrency(r.balanceDue)}
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => invoice(r._id)}
                        disabled={downloadingId === r._id}
                        title="View / print invoice"
                      >
                        {downloadingId === r._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(r)}
                        title="Edit sale"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(r)}
                        disabled={deletingId === r._id}
                        title="Delete sale"
                      >
                        {deletingId === r._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            No sales found.
          </div>
        )}

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          onChange={setPage}
        />
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            closeDialog();
            return;
          }

          setOpen(next);
        }}
        title={editing ? "Update sale" : "Record a sale"}
        description={
          editing
            ? "Update payment status, amount paid, or any other detail on this sale."
            : "The backend calculates total weight and amount and deducts fish from the selected pond."
        }
      >
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <Label required>Sale date</Label>
            <Input type="date" {...form.register("saleDate")} />
          </div>

          <div>
            <Label required>Pond</Label>
            <Select {...form.register("pond")}>
              <option value="">Select pond</option>
              {ponds.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} · {formatNumber(p.currentFishCount)} fish
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label required>Customer name</Label>
            <Input {...form.register("customerName")} />
          </div>

          <div>
            <Label>Phone</Label>
            <Input {...form.register("phoneNumber")} />
          </div>

          <div>
            <Label required>Quantity sold</Label>
            <Input type="number" min="1" {...form.register("quantitySold")} />
          </div>

          <div>
            <Label required>Average weight (g)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              {...form.register("averageWeight")}
            />
          </div>

          <div>
            <Label required>Price per kg</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("pricePerKilogram")}
            />
          </div>

          <div>
            <Label>Amount paid</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("amountPaid")}
            />
          </div>

          <div>
            <Label>Payment status</Label>
            <Select {...form.register("paymentStatus")}>
              {PAYMENT_STATUSES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Payment method</Label>
            <Select {...form.register("paymentMethod")}>
              {PAYMENT_METHODS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4 sm:col-span-2 dark:bg-blue-950/30">
            <div className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Estimated total
            </div>
            <div className="mt-1 text-2xl font-black">
              {formatCurrency(total)}
            </div>
            <div className="mt-1 text-xs text-[var(--muted)]">
              {formatNumber(((Number(q) || 0) * (Number(w) || 0)) / 1000, 3)} kg
              total weight
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <textarea
              {...form.register("notes")}
              className="min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={closeDialog}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editing ? "Saving..." : "Recording..."}
                </>
              ) : editing ? (
                "Update sale"
              ) : (
                "Record sale"
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
