"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, TrendingUp, Scale, Edit3, Trash2, Loader2 } from "lucide-react";

import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { formatDate, formatNumber, pondName, toInputDate } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const DEFAULT_VALUES = {
  date: toInputDate(),
  pond: "",
  averageWeight: 100,
  sampleSize: 10,
  notes: "",
};

export default function Growth() {
  const [rows, setRows] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [pond, setPond] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = () =>
    Promise.all([
      api.growth.list({ page, limit: 30, pond }),
      api.growth.analytics({ pond, limit: 200 }),
    ])
      .then(([r, a]) => {
        setRows(r?.records || []);
        setPagination(r?.pagination || {});
        setAnalytics(a);
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
   * used across Sales/Expenses/Media/Stocking/Feeding.
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
      date: toInputDate(row.date),
      pond: row.pond?._id || row.pond || "",
      averageWeight: row.averageWeight,
      sampleSize: row.sampleSize,
      notes: row.notes || "",
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
        averageWeight: Number(d.averageWeight),
        sampleSize: Number(d.sampleSize),
      };

      if (editing) {
        await api.growth.update(editing._id, payload);
        toast.success("Growth record updated.");
      } else {
        await api.growth.create(payload);
        toast.success("Growth record created.");
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
        `Permanently delete this growth record (${formatDate(row.date)}, ${formatNumber(row.averageWeight, 2)} g)?\n\nThis cannot be undone. Growth rate history for later records in this pond will be recalculated automatically.`,
      )
    ) {
      return;
    }

    setDeletingId(row._id);

    try {
      await api.growth.remove(row._id);
      toast.success("Growth record permanently deleted.");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title="Growth"
      description="Track average weight, biomass and growth rate over time"
    >
      <PageHeader
        eyebrow="Fish growth"
        title="Growth records"
        description="One growth record per pond per calendar day, with automatic biomass and growth calculations."
        action={{
          label: "Record growth",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateDialog,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label="Records"
          value={formatNumber(analytics?.totalRecords)}
          sub="selected analytics view"
          icon={TrendingUp}
        />
        <MetricCard
          label="Ponds tracked"
          value={formatNumber(analytics?.summary?.length)}
          sub="latest growth snapshots"
          icon={Scale}
        />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Weight trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {analytics?.chartData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.chartData}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => String(v).slice(0, 10)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v, n) => [`${formatNumber(v, 2)} g`, n]}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageWeight"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-400">
                No growth data yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5 p-5">
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
                <TH>Average weight</TH>
                <TH>Biomass</TH>
                <TH>Growth rate</TH>
                <TH>Sample</TH>
                <TH></TH>
              </TR>
            </THead>

            <TBody>
              {rows.map((r) => (
                <TR key={r._id}>
                  <TD>{formatDate(r.date)}</TD>
                  <TD className="font-bold">{pondName(r.pond)}</TD>
                  <TD>{formatNumber(r.averageWeight, 2)} g</TD>
                  <TD>{formatNumber(r.biomass, 3)} kg</TD>
                  <TD
                    className={
                      r.growthRate < 0 ? "text-red-600" : "text-emerald-600"
                    }
                  >
                    {formatNumber(r.growthRate, 2)}%
                  </TD>
                  <TD>{formatNumber(r.sampleSize)}</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(r)}
                        title="Edit growth record"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(r)}
                        disabled={deletingId === r._id}
                        title="Permanently delete growth record"
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
            No growth records found.
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
        title={editing ? "Edit growth record" : "Record fish growth"}
        description={
          editing
            ? "Changing the date, pond, or weight recalculates biomass and growth rate history for this pond."
            : "The backend calculates biomass and growth rate from the selected pond and previous record."
        }
      >
        <form
          onSubmit={handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <Label required>Date</Label>
            <Input type="date" {...register("date")} />
          </div>

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
            <Label required>Average weight (g)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              {...register("averageWeight")}
            />
          </div>

          <div>
            <Label required>Sample size</Label>
            <Input type="number" min="1" {...register("sampleSize")} />
          </div>

          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <textarea
              {...register("notes")}
              className="min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm"
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
                "Record growth"
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
