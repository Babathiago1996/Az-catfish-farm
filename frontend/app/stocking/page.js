"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Fish, CalendarDays, Edit3, Trash2, Loader2 } from "lucide-react";

import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import {
  formatDate,
  formatCurrency,
  formatNumber,
  pondName,
  toInputDate,
} from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const DEFAULT_VALUES = {
  stockingDate: toInputDate(),
  fingerlingQuantity: 1000,
  fingerlingSize: 3,
  fingerlingSizeUnit: "cm",
  cost: 0,
  expectedHarvestDate: "",
  initialWeight: 0,
  supplier: "",
  notes: "",
  pond: "",
};

export default function Stocking() {
  const [ponds, setPonds] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [pond, setPond] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = () =>
    api.stocking
      .list({ page, limit: 20, pond })
      .then((r) => {
        setRows(r?.records || []);
        setPagination(r?.pagination || {});
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
  }, [page, pond]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  /*
   * Synchronous guard against double-submission, same fix
   * as applied to Sales/Expenses/Media — belt-and-suspenders
   * alongside formState.isSubmitting disabling the button.
   */
  const isSubmittingRef = useRef(false);

  const openCreateDialog = () => {
    setEditing(null);
    reset(DEFAULT_VALUES);
    setOpen(true);
  };

  const openEditDialog = (row) => {
    setEditing(row);
    reset({
      stockingDate: toInputDate(row.stockingDate),
      fingerlingQuantity: row.fingerlingQuantity,
      fingerlingSize: row.fingerlingSize,
      fingerlingSizeUnit: row.fingerlingSizeUnit || "cm",
      cost: row.cost || 0,
      expectedHarvestDate: row.expectedHarvestDate
        ? toInputDate(row.expectedHarvestDate)
        : "",
      initialWeight: row.initialWeight || 0,
      supplier: row.supplier || "",
      notes: row.notes || "",
      pond: row.pond?._id || row.pond || "",
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
  };

  const submit = async (d) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      const payload = {
        ...d,
        fingerlingQuantity: Number(d.fingerlingQuantity),
        fingerlingSize: Number(d.fingerlingSize),
        cost: Number(d.cost),
        initialWeight: Number(d.initialWeight),
        pond: d.pond,
      };

      if (editing) {
        await api.stocking.update(editing._id, payload);
        toast.success("Stocking record updated and pond count adjusted.");
      } else {
        await api.stocking.create(payload);
        toast.success("Stocking recorded and pond count updated.");
      }

      closeDialog();
      reset(DEFAULT_VALUES);
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
        `Delete this stocking record of ${formatNumber(
          row.fingerlingQuantity,
        )} fingerlings? This will subtract them back out of the pond's fish count.`,
      )
    ) {
      return;
    }

    setDeletingId(row._id);

    try {
      await api.stocking.remove(row._id);
      toast.success("Stocking record deleted and pond count restored.");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title="Stocking"
      description="Introduce fingerlings into ponds and track production starts"
    >
      <PageHeader
        eyebrow="Production"
        title="Stocking"
        description="Every stocking event becomes part of your production history."
        action={{
          label: "Record stocking",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateDialog,
        }}
      />

      <Card className="p-5">
        <div className="mb-5 flex justify-end">
          <Select
            value={pond}
            onChange={(e) => {
              setPage(1);
              setPond(e.target.value);
            }}
            className="w-full md:w-56"
          >
            <option value="">All ponds</option>
            {ponds.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} · #{p.pondNumber}
              </option>
            ))}
          </Select>
        </div>

        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Pond</TH>
                <TH>Fingerlings</TH>
                <TH>Size</TH>
                <TH>Cost</TH>
                <TH>Expected harvest</TH>
                <TH></TH>
              </TR>
            </THead>

            <TBody>
              {rows.map((r) => (
                <TR key={r._id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      {formatDate(r.stockingDate)}
                    </div>
                  </TD>

                  <TD className="font-bold">{pondName(r.pond)}</TD>

                  <TD>
                    <div className="flex items-center gap-2">
                      <Fish className="h-4 w-4 text-blue-600" />
                      {formatNumber(r.fingerlingQuantity)}
                    </div>
                  </TD>

                  <TD>
                    {r.fingerlingSize} {r.fingerlingSizeUnit}
                  </TD>

                  <TD>{formatCurrency(r.cost)}</TD>

                  <TD>{formatDate(r.expectedHarvestDate)}</TD>

                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(r)}
                        title="Edit stocking record"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(r)}
                        disabled={deletingId === r._id}
                        title="Delete stocking record"
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
            No stocking records yet.
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
        title={editing ? "Edit stocking record" : "Record stocking"}
        description={
          editing
            ? "Changing the quantity or pond will adjust the pond's fish count accordingly."
            : "The backend will increase the selected pond's current fish count."
        }
      >
        <form onSubmit={handleSubmit(submit)} className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label required>Pond</Label>
            <Select {...register("pond")}>
              <option value="">Select pond</option>
              {ponds.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} · #{p.pondNumber}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label required>Stocking date</Label>
            <Input type="date" {...register("stockingDate")} />
          </div>

          <div>
            <Label required>Fingerling quantity</Label>
            <Input type="number" min="1" {...register("fingerlingQuantity")} />
          </div>

          <div>
            <Label>Fingerling size</Label>
            <div className="flex gap-2">
              <Input type="number" step="0.01" {...register("fingerlingSize")} />
              <Select {...register("fingerlingSizeUnit")} className="w-28">
                <option>cm</option>
                <option>inch</option>
                <option>gram</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Cost</Label>
            <Input type="number" step="0.01" min="0" {...register("cost")} />
          </div>

          <div>
            <Label>Initial average weight (g)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("initialWeight")}
            />
          </div>

          <div>
            <Label>Expected harvest date</Label>
            <Input type="date" {...register("expectedHarvestDate")} />
          </div>

          <div>
            <Label>Supplier</Label>
            <Input {...register("supplier")} />
          </div>

          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <textarea
              {...register("notes")}
              className="min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={closeDialog}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editing ? "Saving..." : "Recording..."}
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Record stocking"
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}