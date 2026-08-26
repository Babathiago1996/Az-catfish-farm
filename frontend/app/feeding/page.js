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
  RefreshCw,
  X,
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

/* =========================================================
   DEFAULT FORM VALUES
   ========================================================= */

const DEFAULT_FORM_VALUES = {
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
};

/* =========================================================
   HELPERS
   ========================================================= */

const getErrorMessage = (error, fallback) => {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};

const normalizeDateForInput = (value) => {
  if (!value) {
    return toInputDate();
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return toInputDate();
    }

    return date.toISOString().slice(0, 10);
  } catch {
    return toInputDate();
  }
};

const normalizeFormValues = (record) => ({
  date: normalizeDateForInput(record?.date),

  pond:
    typeof record?.pond === "object"
      ? record?.pond?._id || ""
      : record?.pond || "",

  feedBrand: record?.feedBrand || "",

  feedType: record?.feedType || "grower",

  feedSize:
    record?.feedSize !== undefined && record?.feedSize !== null
      ? record.feedSize
      : 3,

  feedSizeUnit: record?.feedSizeUnit || "mm",

  quantityUsed:
    record?.quantityUsed !== undefined && record?.quantityUsed !== null
      ? record.quantityUsed
      : 1,

  quantityUnit: record?.quantityUnit || "kg",

  feedingTime: record?.feedingTime || "08:00",

  cost: record?.cost !== undefined && record?.cost !== null ? record.cost : 0,

  estimatedBiomassBeforeFeeding:
    record?.estimatedBiomassBeforeFeeding !== null &&
    record?.estimatedBiomassBeforeFeeding !== undefined
      ? record.estimatedBiomassBeforeFeeding
      : "",

  notes: record?.notes || "",
});

/* =========================================================
   COMPONENT
   ========================================================= */

export default function Feeding() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     FILTERS
  ------------------------------------------------------- */

  const [page, setPage] = useState(1);
  const [pond, setPond] = useState("");

  /* -------------------------------------------------------
     UI STATE
  ------------------------------------------------------- */

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(false);
  const [pondsLoading, setPondsLoading] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  /* -------------------------------------------------------
     DOUBLE SUBMISSION GUARD
  ------------------------------------------------------- */

  const isSubmittingRef = useRef(false);

  /* =======================================================
     FORM
     ======================================================= */

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: DEFAULT_FORM_VALUES,
  });

  /* =======================================================
     LOAD FEEDING DATA
     ======================================================= */

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [listResponse, todayResponse] = await Promise.all([
          api.feeding.list({
            page,
            limit: 30,
            ...(pond ? { pond } : {}),
          }),

          api.feeding.today(),
        ]);

        /* -------------------------------------------------
           LIST RESPONSE
           -------------------------------------------------

           Backend returns:

           {
             records: [],
             summary: {
               totalQuantity,
               totalCost
             },
             pagination: {}
           }
        */

        setRows(
          Array.isArray(listResponse?.records) ? listResponse.records : [],
        );

        setPagination(
          listResponse?.pagination || {
            page,
            limit: 30,
            total: 0,
            pages: 0,
          },
        );

        /* -------------------------------------------------
           TODAY RESPONSE

           Backend returns:

           {
             summary: {
               quantity,
               cost
             }
           }
        */

        setToday({
          quantity: Number(todayResponse?.summary?.quantity || 0),

          cost: Number(todayResponse?.summary?.cost || 0),
        });
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to load feeding records."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, pond],
  );

  /* =======================================================
     LOAD PONDS
     ======================================================= */

  const loadPonds = useCallback(async () => {
    try {
      setPondsLoading(true);

      const response = await api.ponds.list({
        limit: 100,
      });

      setPonds(Array.isArray(response?.ponds) ? response.ponds : []);
    } catch (error) {
      console.error("Unable to load ponds:", error);

      toast.error(getErrorMessage(error, "Unable to load ponds."));
    } finally {
      setPondsLoading(false);
    }
  }, []);

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    loadPonds();
  }, [loadPonds]);

  /* =======================================================
     LOAD RECORDS WHEN FILTER/PAGE CHANGES
     ======================================================= */

  useEffect(() => {
    load();
  }, [load]);

  /* =======================================================
     RESET FORM
     ======================================================= */

  const resetForm = () => {
    reset({
      ...DEFAULT_FORM_VALUES,
      date: toInputDate(),
    });
  };

  /* =======================================================
     OPEN CREATE DIALOG
     ======================================================= */

  const openCreateDialog = () => {
    setEditing(null);

    resetForm();

    setOpen(true);
  };

  /* =======================================================
     OPEN EDIT DIALOG
     ======================================================= */

  const openEditDialog = (record) => {
    if (!record) {
      return;
    }

    setEditing(record);

    reset(normalizeFormValues(record));

    setOpen(true);
  };

  /* =======================================================
     CLOSE DIALOG
     ======================================================= */

  const closeDialog = () => {
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    setOpen(false);

    setEditing(null);

    resetForm();
  };

  /* =======================================================
     BUILD PAYLOAD
     ======================================================= */

  const buildPayload = (data) => {
    return {
      date: data.date,

      pond: data.pond,

      feedBrand: String(data.feedBrand || "").trim(),

      feedType: data.feedType,

      feedSize: Number(data.feedSize),

      feedSizeUnit: data.feedSizeUnit || "mm",

      quantityUsed: Number(data.quantityUsed),

      quantityUnit: data.quantityUnit || "kg",

      feedingTime: data.feedingTime,

      cost: Number(data.cost || 0),

      estimatedBiomassBeforeFeeding:
        data.estimatedBiomassBeforeFeeding === "" ||
        data.estimatedBiomassBeforeFeeding === null ||
        data.estimatedBiomassBeforeFeeding === undefined
          ? null
          : Number(data.estimatedBiomassBeforeFeeding),

      notes: String(data.notes || "").trim(),
    };
  };

  /* =======================================================
     CREATE / UPDATE
     ======================================================= */

  const submit = async (data) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      const payload = buildPayload(data);

      /* -----------------------------------------------
         Extra client-side safety
      ------------------------------------------------ */

      if (!payload.pond) {
        toast.error("Please select a pond.");
        return;
      }

      if (!payload.feedBrand) {
        toast.error("Please enter the feed brand.");
        return;
      }

      if (!Number.isFinite(payload.quantityUsed) || payload.quantityUsed <= 0) {
        toast.error("Quantity used must be greater than zero.");
        return;
      }

      if (!Number.isFinite(payload.feedSize) || payload.feedSize < 0) {
        toast.error("Feed size must be zero or greater.");
        return;
      }

      if (!Number.isFinite(payload.cost) || payload.cost < 0) {
        toast.error("Feed cost cannot be negative.");
        return;
      }

      /* -----------------------------------------------
         UPDATE
      ------------------------------------------------ */

      if (editing?._id) {
        await api.feeding.update(editing._id, payload);

        toast.success("Feeding record updated successfully.");
      } else {
        /* -----------------------------------------------
         CREATE
      ------------------------------------------------ */
        await api.feeding.create(payload);

        toast.success("Feeding recorded successfully.");
      }

      /* -----------------------------------------------
         Close and reset
      ------------------------------------------------ */

      setOpen(false);

      setEditing(null);

      resetForm();

      /* -----------------------------------------------
         Reload table + today's metrics
      ------------------------------------------------ */

      await load({ silent: true });
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editing
            ? "Unable to update feeding record."
            : "Unable to record feeding.",
        ),
      );
    } finally {
      isSubmittingRef.current = false;
    }
  };

  /* =======================================================
     DELETE
     ======================================================= */

  const deleteRecord = async (record) => {
    if (!record?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete this feeding record?\n\n${formatNumber(
        record.quantityUsed,
        2,
      )} ${record.quantityUnit || "kg"} of ${
        record.feedBrand || "feed"
      } from ${pondName(record.pond)}.\n\nAny inventory deducted by this feeding will be restored.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(record._id);

      await api.feeding.delete(record._id);

      toast.success("Feeding record deleted and inventory restored.");

      await load({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete feeding record."));
    } finally {
      setDeletingId(null);
    }
  };

  /* =======================================================
     FILTER CHANGE
     ======================================================= */

  const handlePondChange = (event) => {
    setPage(1);

    setPond(event.target.value);
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <AdminLayout
      title="Feeding"
      description="Track feed usage and connect consumption to inventory"
    >
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <PageHeader
        eyebrow="Production"
        title="Feeding"
        description="Every feed event can automatically deduct a matching feed inventory item."
        action={{
          label: "Record feeding",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateDialog,
        }}
      />

      {/* ===================================================
          TODAY'S METRICS
      =================================================== */}

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

      {/* ===================================================
          RECORDS CARD
      =================================================== */}

      <Card className="mt-5 overflow-hidden">
        {/* -------------------------------------------------
            TOOLBAR
        ------------------------------------------------- */}

        <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Feeding records</h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Monitor feed consumption by pond.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={pond}
              onChange={handlePondChange}
              disabled={pondsLoading}
              className="w-full sm:w-56"
            >
              <option value="">All ponds</option>

              {ponds.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {p.pondNumber ? ` · #${p.pondNumber}` : ""}
                </option>
              ))}
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={() => load({ silent: true })}
              disabled={loading || refreshing}
              className="shrink-0"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* -------------------------------------------------
            TABLE
        ------------------------------------------------- */}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading feeding records...
              </div>
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
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>

              <TBody>
                {rows.map((record) => (
                  <TR key={record._id}>
                    {/* DATE */}

                    <TD>
                      <div className="font-medium">
                        {formatDate(record.date)}
                      </div>

                      <div className="text-xs text-slate-400">
                        {record.feedingTime || "—"}
                      </div>
                    </TD>

                    {/* POND */}

                    <TD>
                      <div className="font-semibold">
                        {pondName(record.pond)}
                      </div>

                      {record?.pond?.pondNumber && (
                        <div className="text-xs text-[var(--muted)]">
                          Pond #{record.pond.pondNumber}
                        </div>
                      )}
                    </TD>

                    {/* FEED */}

                    <TD>
                      <div className="font-semibold">
                        {record.feedBrand || "—"}
                      </div>

                      <div className="text-xs capitalize text-[var(--muted)]">
                        {record.feedType || "—"}

                        {" · "}

                        {record.feedSize ?? "—"}

                        {record.feedSizeUnit || ""}
                      </div>
                    </TD>

                    {/* QUANTITY */}

                    <TD>
                      <span className="font-semibold">
                        {formatNumber(record.quantityUsed, 2)}
                      </span>{" "}
                      {record.quantityUnit || "kg"}
                    </TD>

                    {/* COST */}

                    <TD>{formatCurrency(record.cost || 0)}</TD>

                    {/* INVENTORY */}

                    <TD>
                      {record.inventoryUpdated ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Deducted
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          No matching inventory
                        </span>
                      )}
                    </TD>

                    {/* ACTIONS */}

                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Edit feeding"
                          onClick={() => openEditDialog(record)}
                          disabled={deletingId === record._id}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Delete feeding"
                          onClick={() => deleteRecord(record)}
                          disabled={deletingId === record._id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {deletingId === record._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Utensils className="h-5 w-5 text-slate-500" />
              </div>

              <h3 className="font-semibold">No feeding records</h3>

              <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
                No feeding records match the current filter.
              </p>

              <Button type="button" className="mt-4" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Record feeding
              </Button>
            </div>
          )}
        </div>

        {/* -------------------------------------------------
            PAGINATION
        ------------------------------------------------- */}

        {pagination?.pages > 0 && (
          <div className="border-t p-5">
            <Pagination
              page={pagination?.page || 1}
              pages={pagination?.pages || 0}
              onChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* ===================================================
          CREATE / EDIT DIALOG
      =================================================== */}

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) {
            closeDialog();
          } else {
            setOpen(true);
          }
        }}
        title={editing ? "Edit feeding record" : "Record feeding"}
        description={
          editing
            ? "Update the feeding record. Inventory will be restored and recalculated against the new feeding details."
            : "If a matching active feed inventory item exists, the backend will automatically deduct the quantity from inventory."
        }
      >
        <form
          onSubmit={handleSubmit(submit)}
          className="grid max-h-[75vh] gap-5 overflow-y-auto pr-1 sm:grid-cols-2"
        >
          {/* DATE */}

          <div>
            <Label required>Date</Label>

            <Input
              type="date"
              {...register("date", {
                required: "Feeding date is required.",
              })}
            />

            {errors.date && (
              <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>
            )}
          </div>

          {/* POND */}

          <div>
            <Label required>Pond</Label>

            <Select
              {...register("pond", {
                required: "Please select a pond.",
              })}
            >
              <option value="">
                {pondsLoading ? "Loading ponds..." : "Select pond"}
              </option>

              {ponds.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {p.pondNumber ? ` · #${p.pondNumber}` : ""}
                </option>
              ))}
            </Select>

            {errors.pond && (
              <p className="mt-1 text-xs text-red-600">{errors.pond.message}</p>
            )}
          </div>

          {/* FEED BRAND */}

          <div>
            <Label required>Feed brand / inventory name</Label>

            <Input
              placeholder="e.g. Coppens"
              {...register("feedBrand", {
                required: "Feed brand is required.",
                maxLength: {
                  value: 150,
                  message: "Feed brand cannot exceed 150 characters.",
                },
              })}
            />

            {errors.feedBrand && (
              <p className="mt-1 text-xs text-red-600">
                {errors.feedBrand.message}
              </p>
            )}

            <p className="mt-1 text-xs text-[var(--muted)]">
              Use the exact inventory item name if you want automatic stock
              deduction.
            </p>
          </div>

          {/* FEED TYPE */}

          <div>
            <Label>Feed type</Label>

            <Select
              {...register("feedType", {
                required: "Feed type is required.",
              })}
            >
              {FEED_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          {/* FEED SIZE */}

          <div>
            <Label>Feed size</Label>

            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("feedSize", {
                  required: "Feed size is required.",
                  min: {
                    value: 0,
                    message: "Feed size cannot be negative.",
                  },
                  valueAsNumber: true,
                })}
              />

              <Input
                {...register("feedSizeUnit")}
                className="w-24"
                placeholder="mm"
              />
            </div>

            {errors.feedSize && (
              <p className="mt-1 text-xs text-red-600">
                {errors.feedSize.message}
              </p>
            )}
          </div>

          {/* QUANTITY */}

          <div>
            <Label required>Quantity used</Label>

            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0.001"
                {...register("quantityUsed", {
                  required: "Quantity used is required.",
                  min: {
                    value: 0.001,
                    message: "Quantity must be greater than zero.",
                  },
                  valueAsNumber: true,
                })}
              />

              <Select {...register("quantityUnit")} className="w-28">
                {QUANTITY_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </div>

            {errors.quantityUsed && (
              <p className="mt-1 text-xs text-red-600">
                {errors.quantityUsed.message}
              </p>
            )}

            <p className="mt-1 text-xs text-[var(--muted)]">
              The unit must match the inventory item's unit when automatic
              deduction is used.
            </p>
          </div>

          {/* FEEDING TIME */}

          <div>
            <Label required>Feeding time</Label>

            <Input
              type="time"
              {...register("feedingTime", {
                required: "Feeding time is required.",
                pattern: {
                  value: /^([01]\d|2[0-3]):([0-5]\d)$/,
                  message: "Use HH:MM format.",
                },
              })}
            />

            {errors.feedingTime && (
              <p className="mt-1 text-xs text-red-600">
                {errors.feedingTime.message}
              </p>
            )}
          </div>

          {/* COST */}

          <div>
            <Label>Cost</Label>

            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("cost", {
                min: {
                  value: 0,
                  message: "Cost cannot be negative.",
                },
                valueAsNumber: true,
              })}
            />

            {errors.cost && (
              <p className="mt-1 text-xs text-red-600">{errors.cost.message}</p>
            )}
          </div>

          {/* BIOMASS */}

          <div>
            <Label>Estimated biomass before feeding (kg)</Label>

            <Input
              type="number"
              step="0.001"
              min="0"
              placeholder="Optional"
              {...register("estimatedBiomassBeforeFeeding", {
                min: {
                  value: 0,
                  message: "Biomass cannot be negative.",
                },
                valueAsNumber: false,
              })}
            />

            {errors.estimatedBiomassBeforeFeeding && (
              <p className="mt-1 text-xs text-red-600">
                {errors.estimatedBiomassBeforeFeeding.message}
              </p>
            )}
          </div>

          {/* NOTES */}

          <div className="sm:col-span-2">
            <Label>Notes</Label>

            <textarea
              {...register("notes", {
                maxLength: {
                  value: 2000,
                  message: "Feeding notes cannot exceed 2,000 characters.",
                },
              })}
              placeholder="Add any useful notes about this feeding..."
              className="min-h-24 w-full resize-y rounded-xl border bg-transparent p-3 text-sm outline-none transition focus:ring-2 focus:ring-[var(--ring)]"
            />

            {errors.notes && (
              <p className="mt-1 text-xs text-red-600">
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* FORM FOOTER */}

          <div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isSubmittingRef.current}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                  {editing ? "Updating..." : "Recording..."}
                </>
              ) : (
                <>
                  {editing ? (
                    <Edit3 className="mr-2 h-4 w-4" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}

                  {editing ? "Update feeding" : "Record feeding"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
