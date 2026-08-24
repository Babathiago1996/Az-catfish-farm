"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  WalletCards,
  Trash2,
  Edit3,
  Loader2,
  Receipt,
  ExternalLink,
  X,
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
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatDate, toInputDate, labelize } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const DEFAULT_VALUES = {
  category: "feed",
  description: "",
  amount: 0,
  expenseDate: toInputDate(),
  vendor: "",
  notes: "",
  receiptImage: null,
};

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category: "", search: "" });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /*
   * Synchronous guard against double-submission, on top of
   * react-hook-form's own formState.isSubmitting (used to
   * disable/spin the button below). Belt and suspenders.
   */
  const isSubmittingRef = useRef(false);

  const load = () =>
    Promise.all([
      api.expenses.list({ page, limit: 30, ...filters }),
      api.expenses.summary(
        filters.category ? { category: filters.category } : {},
      ),
    ])
      .then(([r, s]) => {
        setRows(r?.expenses || []);
        setPagination(r?.pagination || {});
        setSummary(s?.summary || s);
      })
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.category, filters.search]);

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  const newReceiptFile = form.watch("receiptImage");

  const openCreateDialog = () => {
    setEditing(null);
    setRemoveReceipt(false);
    form.reset(DEFAULT_VALUES);
    setOpen(true);
  };

  const openEditDialog = (row) => {
    setEditing(row);
    setRemoveReceipt(false);
    form.reset({
      category: row.category,
      description: row.description,
      amount: row.amount,
      expenseDate: toInputDate(row.expenseDate),
      vendor: row.vendor || "",
      notes: row.notes || "",
      receiptImage: null,
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setRemoveReceipt(false);
  };

  const submit = async (d) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      /*
       * A plain object is enough when there's no file to
       * upload. FormData is only needed when a receipt
       * image was actually chosen (or is being removed),
       * matching how the mortality page handles uploads.
       */
      const hasFile = d.receiptImage && d.receiptImage.length > 0;

      let payload;

      if (hasFile || removeReceipt) {
        payload = new FormData();
        payload.append("category", d.category);
        payload.append("description", d.description);
        payload.append("amount", Number(d.amount));
        payload.append("expenseDate", d.expenseDate);
        payload.append("vendor", d.vendor || "");
        payload.append("notes", d.notes || "");

        if (hasFile) {
          payload.append("receiptImage", d.receiptImage[0]);
        } else if (removeReceipt) {
          payload.append("removeReceiptImage", "true");
        }
      } else {
        payload = {
          category: d.category,
          description: d.description,
          amount: Number(d.amount),
          expenseDate: d.expenseDate,
          vendor: d.vendor || "",
          notes: d.notes || "",
        };
      }

      if (editing) {
        await api.expenses.update(editing._id, payload);
        toast.success("Expense updated.");
      } else {
        await api.expenses.create(payload);
        toast.success("Expense recorded.");
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

  const remove = async (id) => {
    if (!confirm("Delete this expense?")) return;

    setDeletingId(id);

    try {
      await api.expenses.remove(id);
      toast.success("Expense deleted.");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title="Expenses"
      description="Track operating costs and understand where money is going"
    >
      <PageHeader
        eyebrow="Business"
        title="Expenses"
        description="Keep every farm cost visible and categorized."
        action={{
          label: "Add expense",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateDialog,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total expenses"
          value={formatCurrency(summary?.totalExpenses)}
          icon={WalletCards}
        />
        <MetricCard
          label="Expense records"
          value={summary?.expenseCount || 0}
          sub="selected view"
          icon={WalletCards}
        />
      </div>

      <Card className="mt-5 p-5">
        <div className="mb-5 flex gap-2">
          <Input
            value={filters.search}
            onChange={(e) => {
              setPage(1);
              setFilters((v) => ({ ...v, search: e.target.value }));
            }}
            placeholder="Search description, vendor..."
          />
          <Select
            value={filters.category}
            onChange={(e) => {
              setPage(1);
              setFilters((v) => ({ ...v, category: e.target.value }));
            }}
            className="w-48"
          >
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </div>

        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Category</TH>
                <TH>Description</TH>
                <TH>Vendor</TH>
                <TH>Amount</TH>
                <TH>Receipt</TH>
                <TH></TH>
              </TR>
            </THead>

            <TBody>
              {rows.map((r) => (
                <TR key={r._id}>
                  <TD>{formatDate(r.expenseDate)}</TD>
                  <TD>{labelize(r.category)}</TD>
                  <TD className="font-semibold">{r.description}</TD>
                  <TD>{r.vendor || "—"}</TD>
                  <TD className="font-black">{formatCurrency(r.amount)}</TD>
                  <TD>
                    {r.receiptImage ? (
                      <a
                        href={r.receiptImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">—</span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(r)}
                        title="Edit expense"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(r._id)}
                        disabled={deletingId === r._id}
                        title="Delete expense"
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
            No expenses found.
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
        onOpenChange={(next) => (next ? setOpen(next) : closeDialog())}
        title={editing ? "Edit expense" : "Record expense"}
      >
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <Label required>Category</Label>
            <Select {...form.register("category")}>
              {EXPENSE_CATEGORIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label required>Amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("amount")}
            />
          </div>

          <div className="sm:col-span-2">
            <Label required>Description</Label>
            <Input {...form.register("description")} />
          </div>

          <div>
            <Label required>Date</Label>
            <Input type="date" {...form.register("expenseDate")} />
          </div>

          <div>
            <Label>Vendor</Label>
            <Input {...form.register("vendor")} />
          </div>

          <div className="sm:col-span-2">
            <Label>Receipt image</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              {...form.register("receiptImage")}
            />
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Optional. Attach a photo of the receipt if you have one.
            </p>

            {newReceiptFile?.length > 0 && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--border)] p-3">
                <Receipt className="h-4 w-4" />
                <span className="max-w-xs truncate text-sm font-medium">
                  {newReceiptFile[0].name}
                </span>
              </div>
            )}

            {!newReceiptFile?.length &&
              editing?.receiptImage &&
              !removeReceipt && (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
                  <a
                    href={editing.receiptImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    <Receipt className="h-4 w-4" />
                    Current receipt
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setRemoveReceipt(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              )}

            {removeReceipt && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-dashed border-red-300 bg-red-50 p-3 dark:bg-red-950/20">
                <span className="text-xs font-medium text-red-600">
                  The current receipt will be removed when you save.
                </span>

                <button
                  type="button"
                  onClick={() => setRemoveReceipt(false)}
                  className="text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Undo
                </button>
              </div>
            )}
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
                "Save changes"
              ) : (
                "Record expense"
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
