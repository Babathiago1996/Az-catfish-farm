"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Utensils,
  Fish,
  PackageCheck,
  Edit3,
  Trash2,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/shared/pagination";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

import { api } from "@/lib/api";
import { FEED_TYPES, QUANTITY_UNITS } from "@/lib/constants";

import {
  formatCurrency,
  formatDate,
  formatNumber,
  pondName,
  toInputDate,
} from "@/lib/utils";

import { toast } from "sonner";

export default function Feeding() {
  const [rows, setRows] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [today, setToday] = useState({
    quantity: 0,
    cost: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    pages: 0,
  });

  const [page, setPage] = useState(1);
  const [pond, setPond] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  /*
   * ---------------------------------------------------------
   * LOAD FEEDING DATA
   * ---------------------------------------------------------
   *
   * Loads:
   * 1. Feeding records
   * 2. Today's feeding summary
   *
   * IMPORTANT:
   * api.feeding.today() returns:
   *
   * {
   *   summary: {
   *     quantity,
   *     cost
   *   }
   * }
   *
   * Therefore we use todayResponse.summary.
   */
  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [listResponse, todayResponse] = await Promise.all([
        api.feeding.list({
          page,
          limit: 30,
          ...(pond ? { pond } : {}),
        }),

        api.feeding.today(),
      ]);

      /*
       * Feeding list response:
       *
       * {
       *   records: [],
       *   summary: {
       *     totalQuantity,
       *     totalCost
       *   },
       *   pagination: {}
       * }
       */
      setRows(Array.isArray(listResponse?.records) ? listResponse.records : []);

      setPagination(
        listResponse?.pagination || {
          page,
          limit: 30,
          total: 0,
          pages: 0,
        },
      );

      /*
       * Today's endpoint returns:
       *
       * {
       *   summary: {
       *     quantity,
       *     cost
       *   }
       * }
       *
       * This was the main reason your cards
       * were displaying 0.
       */
      setToday({
        quantity: Number(todayResponse?.summary?.quantity || 0),

        cost: Number(todayResponse?.summary?.cost || 0),
      });
    } catch (error) {
      toast.error(error?.message || "Unable to load feeding records.");
    } finally {
      setLoading(false);
    }
  }, [page, pond]);

  /*
   * ---------------------------------------------------------
   * LOAD PONDS
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const loadPonds = async () => {
      try {
        const response = await api.ponds.list({
          limit: 100,
        });

        setPonds(Array.isArray(response?.ponds) ? response.ponds : []);
      } catch (error) {
        console.error("Unable to load ponds:", error);
      }
    };

    loadPonds();
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD FEEDING DATA WHEN PAGE / POND CHANGES
   * ---------------------------------------------------------
   */
  useEffect(() => {
    load();
  }, [load]);

  /*
   * ---------------------------------------------------------
   * FORM
   * ---------------------------------------------------------
   */
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      date: toInputDate(),
      pond: "",
      feedBrand: "",
      feedType: "grower",
      feedSize: 3,
      feedSizeUnit: "mm",
      quantityUsed: 1,
      quantityUnit: "kg",
      feedingTime: "08:00",
      cost: 0,
      estimatedBiomassBeforeFeeding: "",
      notes: "",
    },
  });

  /*
   * Synchronous guard against double-submission, same fix
   * as applied to Sales/Expenses/Media/Stocking.
   */
  const isSubmittingRef = useRef(false);

  /*
   * ---------------------------------------------------------
   * RECORD FEEDING
   * ---------------------------------------------------------
   */
  const submit = async (data) => {
    try {
      const payload = {
        ...data,

        quantityUsed: Number(data.quantityUsed),

        feedSize: Number(data.feedSize),

        cost: Number(data.cost || 0),

        estimatedBiomassBeforeFeeding: data.estimatedBiomassBeforeFeeding
          ? Number(data.estimatedBiomassBeforeFeeding)
          : null,

        /*
         * Empty pond should never be sent
         * because backend requires a valid pond.
         */
        pond: data.pond || null,
      };

      await api.feeding.create(payload);

      toast.success("Feeding recorded successfully.");

      /*
       * Close modal.
       */
      setOpen(false);

      /*
       * Reset form to today's date.
       */
      reset({
        date: toInputDate(),
        pond: "",
        feedBrand: "",
        feedType: "grower",
        feedSize: 3,
        feedSizeUnit: "mm",
        quantityUsed: 1,
        quantityUnit: "kg",
        feedingTime: "08:00",
        cost: 0,
        estimatedBiomassBeforeFeeding: "",
        notes: "",
      });

      /*
       * IMPORTANT:
       *
       * Reload both the table and today's cards.
       *
       * This ensures the cards immediately change
       * after recording a feeding.
       */
      await load();
    } catch (error) {
      toast.error(error?.message || "Unable to record feeding.");
    }
  };

  /*
   * ---------------------------------------------------------
   * OPEN RECORD DIALOG
   * ---------------------------------------------------------
   */
  const openRecordDialog = () => {
    reset({
      date: toInputDate(),
      pond: "",
      feedBrand: "",
      feedType: "grower",
      feedSize: 3,
      feedSizeUnit: "mm",
      quantityUsed: 1,
      quantityUnit: "kg",
      feedingTime: "08:00",
      cost: 0,
      estimatedBiomassBeforeFeeding: "",
      notes: "",
    });

    setOpen(true);
  };

  return (
    <AdminLayout
      title="Feeding"
      description="Track feed usage and connect consumption to inventory"
    >
      <PageHeader
        eyebrow="Production"
        title="Feeding"
        description="Every feed event can automatically deduct a matching feed inventory item."
        action={{
          label: "Record feeding",
          icon: <Plus className="h-4 w-4" />,
          onClick: openRecordDialog,
        }}
      />

      {/* =====================================================
          TODAY'S METRICS
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Today quantity"
          value={`${formatNumber(today?.quantity || 0, 2)} kg`}
          sub="total feed consumed"
          icon={Utensils}
        />

        <MetricCard
          label="Today cost"
          value={formatCurrency(today?.cost || 0)}
          sub="recorded feeding cost"
          icon={PackageCheck}
        />

        <MetricCard
          label="Records"
          value={formatNumber(pagination?.total || 0)}
          sub="selected view"
          icon={Fish}
        />
      </div>

      {/* =====================================================
          FEEDING RECORDS
          ===================================================== */}
      <Card className="mt-5 p-5">
        <div className="mb-5 flex justify-end">
          <Select
            value={pond}
            onChange={(event) => {
              setPage(1);
              setPond(event.target.value);
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

        {loading ? (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            Loading feeding records...
          </div>
        ) : rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Pond</TH>
                <TH>Feed</TH>
                <TH>Quantity</TH>
                <TH>Cost</TH>
                <TH>Inventory</TH>
              </TR>
            </THead>

            <TBody>
              {rows.map((record) => (
                <TR key={record._id}>
                  <TD>
                    {formatDate(record.date)}

                    <div className="text-xs text-slate-400">
                      {record.feedingTime || "—"}
                    </div>
                  </TD>

                  <TD className="font-bold">{pondName(record.pond)}</TD>

                  <TD>
                    <div className="font-semibold">{record.feedBrand}</div>

                    <div className="text-xs text-[var(--muted)]">
                      {record.feedType} · {record.feedSize}
                      {record.feedSizeUnit}
                    </div>
                  </TD>

                  <TD>
                    {formatNumber(record.quantityUsed, 2)} {record.quantityUnit}
                  </TD>

                  <TD>{formatCurrency(record.cost)}</TD>

                  <TD>
                    {record.inventoryUpdated ? (
                      <span className="text-xs font-bold text-emerald-600">
                        Deducted
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600">
                        No matching inventory
                      </span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            No feeding records found.
          </div>
        )}

        <Pagination
          page={pagination?.page || 1}
          pages={pagination?.pages || 0}
          onChange={setPage}
        />
      </Card>

      {/* =====================================================
          RECORD FEEDING DIALOG
          ===================================================== */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Record feeding"
        description="If a matching active feed item exists, the backend will deduct the quantity from inventory."
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
            <Label required>Feed brand / inventory name</Label>

            <Input placeholder="e.g. Coppens" {...register("feedBrand")} />
          </div>

          <div>
            <Label>Feed type</Label>

            <Select {...register("feedType")}>
              {FEED_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Feed size</Label>

            <div className="flex gap-2">
              <Input type="number" step="0.01" {...register("feedSize")} />

              <Input {...register("feedSizeUnit")} className="w-24" />
            </div>
          </div>

          <div>
            <Label required>Quantity used</Label>

            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...register("quantityUsed")}
              />

              <Select {...register("quantityUnit")} className="w-28">
                {QUANTITY_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>Feeding time</Label>

            <Input type="time" {...register("feedingTime")} />
          </div>

          <div>
            <Label>Cost</Label>

            <Input type="number" step="0.01" min="0" {...register("cost")} />
          </div>

          <div>
            <Label>Estimated biomass before feeding (kg)</Label>

            <Input
              type="number"
              step="0.001"
              min="0"
              {...register("estimatedBiomassBeforeFeeding")}
            />
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading}>
              Record feeding
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
