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
  Search,
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

/* ============================================================
   CONSTANTS
   ============================================================ */

const PAGE_SIZE = 30;

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

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Convert an API error into something useful for the user.
 */
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

/**
 * Normalize the feeding list response.
 *
 * Backend returns:
 *
 * {
 *   records: [],
 *   summary: {},
 *   pagination: {}
 * }
 */
const normalizeFeedingList = (response) => {
  return {
    records: Array.isArray(response?.records) ? response.records : [],

    summary: response?.summary || {
      totalQuantity: 0,
      totalCost: 0,
    },

    pagination: response?.pagination || {
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      pages: 0,
    },
  };
};

/**
 * Normalize pond response because the pond endpoint may
 * return { ponds: [] } depending on the controller.
 */
const normalizePonds = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.ponds)) {
    return response.ponds;
  }

  if (Array.isArray(response?.records)) {
    return response.records;
  }

  return [];
};

/**
 * Safely convert a value to number.
 */
const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

/* ============================================================
   COMPONENT
   ============================================================ */

export default function Feeding() {
  /* ----------------------------------------------------------
     DATA
     ---------------------------------------------------------- */

  const [rows, setRows] = useState([]);

  const [ponds, setPonds] = useState([]);

  const [today, setToday] = useState({
    quantity: 0,
    cost: 0,
  });

  /* ----------------------------------------------------------
     PAGINATION
     ---------------------------------------------------------- */

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  });

  const [page, setPage] = useState(1);

  /* ----------------------------------------------------------
     FILTERS
     ---------------------------------------------------------- */

  const [pond, setPond] = useState("");

  /* ----------------------------------------------------------
     UI STATE
     ---------------------------------------------------------- */

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  /* ----------------------------------------------------------
     DOUBLE-SUBMISSION GUARD
     ---------------------------------------------------------- */

  const isSubmittingRef = useRef(false);

  /* ----------------------------------------------------------
     FORM
     ---------------------------------------------------------- */

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: DEFAULT_FORM_VALUES,
  });

  /* ==========================================================
     LOAD FEEDING RECORDS + TODAY SUMMARY
     ========================================================== */

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
            limit: PAGE_SIZE,
            ...(pond ? { pond } : {}),
          }),

          api.feeding.today(),
        ]);

        /* ----------------------------------------------------
           LIST
           ---------------------------------------------------- */

        const list = normalizeFeedingList(listResponse);

        setRows(list.records);

        setPagination({
          page: numberValue(list.pagination?.page, page),
          limit: numberValue(list.pagination?.limit, PAGE_SIZE),
          total: numberValue(list.pagination?.total, 0),
          pages: numberValue(list.pagination?.pages, 0),
        });

        /* ----------------------------------------------------
           TODAY
           ---------------------------------------------------- */

        setToday({
          quantity: numberValue(todayResponse?.summary?.quantity, 0),

          cost: numberValue(todayResponse?.summary?.cost, 0),
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

  /* ==========================================================
     LOAD PONDS
     ========================================================== */

  const loadPonds = useCallback(async () => {
    try {
      const response = await api.ponds.list({
        limit: 100,
      });

      setPonds(normalizePonds(response));
    } catch (error) {
      console.error("Unable to load ponds:", error);

      toast.error(getErrorMessage(error, "Unable to load ponds."));
    }
  }, []);

  /* ==========================================================
     INITIAL DATA
     ========================================================== */

  useEffect(() => {
    loadPonds();
  }, [loadPonds]);

  /* ==========================================================
     LOAD FEEDING DATA WHEN FILTER/PAGE CHANGES
     ========================================================== */

  useEffect(() => {
    load();
  }, [load]);

  /* ==========================================================
     RESET FORM
     ========================================================== */

  const resetFeedingForm = useCallback(() => {
    reset({
      ...DEFAULT_FORM_VALUES,
      date: toInputDate(),
    });
  }, [reset]);

  /* ==========================================================
     OPEN CREATE DIALOG
     ========================================================== */

  const openRecordDialog = () => {
    setEditing(null);

    resetFeedingForm();

    setOpen(true);
  };

  /* ==========================================================
     OPEN EDIT DIALOG
     ========================================================== */

  const openEditDialog = (record) => {
    if (!record?._id) {
      toast.error("Invalid feeding record.");

      return;
    }

    setEditing(record);

    reset({
      date: record.date ? toInputDate(record.date) : toInputDate(),

      pond:
        typeof record.pond === "object"
          ? record.pond?._id || ""
          : record.pond || "",

      feedBrand: record.feedBrand || "",

      feedType: record.feedType || "grower",

      feedSize:
        record.feedSize !== undefined && record.feedSize !== null
          ? record.feedSize
          : 3,

      feedSizeUnit: record.feedSizeUnit || "mm",

      quantityUsed:
        record.quantityUsed !== undefined && record.quantityUsed !== null
          ? record.quantityUsed
          : 1,

      quantityUnit: record.quantityUnit || "kg",

      feedingTime: record.feedingTime || "08:00",

      cost: record.cost !== undefined && record.cost !== null ? record.cost : 0,

      estimatedBiomassBeforeFeeding:
        record.estimatedBiomassBeforeFeeding !== undefined &&
        record.estimatedBiomassBeforeFeeding !== null
          ? record.estimatedBiomassBeforeFeeding
          : "",

      notes: record.notes || "",
    });

    setOpen(true);
  };

  /* ==========================================================
     SUBMIT CREATE / UPDATE
     ========================================================== */

  const submit = async (data) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      /* ------------------------------------------------------
         BUILD PAYLOAD
         ------------------------------------------------------ */

      const payload = {
        date: data.date,

        pond: data.pond || null,

        feedBrand: String(data.feedBrand || "").trim(),

        feedType: data.feedType,

        feedSize: numberValue(data.feedSize, 0),

        feedSizeUnit: data.feedSizeUnit || "mm",

        quantityUsed: numberValue(data.quantityUsed, 0),

        quantityUnit: data.quantityUnit || "kg",

        feedingTime: data.feedingTime || "08:00",

        cost: numberValue(data.cost, 0),

        estimatedBiomassBeforeFeeding:
          data.estimatedBiomassBeforeFeeding === "" ||
          data.estimatedBiomassBeforeFeeding === null ||
          data.estimatedBiomassBeforeFeeding === undefined
            ? null
            : numberValue(data.estimatedBiomassBeforeFeeding, 0),

        notes: String(data.notes || "").trim(),
      };

      /* ------------------------------------------------------
         CREATE
         ------------------------------------------------------ */

      if (!editing) {
        await api.feeding.create(payload);

        toast.success("Feeding recorded successfully.");
      } else {

      /* ------------------------------------------------------
         UPDATE
         ------------------------------------------------------ */
        await api.feeding.update(editing._id, payload);

        toast.success("Feeding record updated successfully.");
      }

      /* ------------------------------------------------------
         CLOSE + RESET
         ------------------------------------------------------ */

      setOpen(false);

      setEditing(null);

      resetFeedingForm();

      /* ------------------------------------------------------
         RELOAD TABLE + TODAY METRICS
         ------------------------------------------------------ */

      await load();
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

  /* ==========================================================
     DELETE FEEDING
     ========================================================== */

  const handleDelete = async (record) => {
    if (!record?._id) {
      toast.error("Invalid feeding record.");

      return;
    }

    const confirmed = window.confirm(
      `Delete this feeding record?\n\n${record.feedBrand || "Feed"} · ${numberValue(
        record.quantityUsed,
        0,
      )} ${record.quantityUnit || "kg"}\n\nAny inventory deduction made by this record will be restored automatically.`,
    );

    if (!confirmed) {
      return;
    }

    if (deletingId) {
      return;
    }

    try {
      setDeletingId(record._id);

      await api.feeding.remove(record._id);

      toast.success("Feeding record deleted and inventory restored.");

      /*
       * If deleting the final record on a page,
       * move back one page where appropriate.
       */
      if (rows.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(currentPage - 1, 1));
      } else {
        await load();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete feeding record."));
    } finally {
      setDeletingId(null);
    }
  };

  /* ==========================================================
     REFRESH
     ========================================================== */

  const handleRefresh = async () => {
    await load({
      silent: true,
    });
  };

  /* ==========================================================
     CLOSE DIALOG
     ========================================================== */

  const handleDialogChange = (value) => {
    /*
     * Do not allow the dialog to close while
     * the form is actively submitting.
     */
    if (isSubmittingRef.current) {
      return;
    }

    setOpen(value);

    if (!value) {
      setEditing(null);

      resetFeedingForm();
    }
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <AdminLayout
      title="Feeding"
      description="Track feed usage and connect every feeding event to inventory."
    >
      {/* ======================================================
          HEADER
          ====================================================== */}

      <PageHeader
        eyebrow="Production"
        title="Feeding"
        description="Record daily feeding activities, monitor consumption and automatically reconcile feed inventory."
        action={{
          label: "Record feeding",
          icon: <Plus className="h-4 w-4" />,
          onClick: openRecordDialog,
        }}
      />

      {/* ======================================================
          TODAY METRICS
          ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Today's quantity"
          value={`${formatNumber(today.quantity, 2)} kg`}
          sub="total feed consumed today"
          icon={Utensils}
        />

        <MetricCard
          label="Today's cost"
          value={formatCurrency(today.cost)}
          sub="recorded feeding cost today"
          icon={PackageCheck}
        />

        <MetricCard
          label="Feeding records"
          value={formatNumber(pagination.total)}
          sub={pond ? "records for selected pond" : "records in selected view"}
          icon={Fish}
        />
      </div>

      {/* ======================================================
          RECORDS CARD
          ====================================================== */}

      <Card className="mt-5 overflow-hidden">
        {/* ----------------------------------------------------
            FILTER BAR
            ---------------------------------------------------- */}

        <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Feeding records</h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Review, edit or delete recorded feeding activities.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

              <Select
                value={pond}
                onChange={(event) => {
                  setPage(1);

                  setPond(event.target.value);
                }}
                className="w-full pl-9 sm:w-56"
              >
                <option value="">All ponds</option>

                {ponds.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                    {p.pondNumber ? ` · #${p.pondNumber}` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="gap-2"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------------
            TABLE
            ---------------------------------------------------- */}

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-5 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--primary)]" />

            <p className="text-sm text-[var(--muted)]">
              Loading feeding records...
            </p>
          </div>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
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
                {rows.map((record) => {
                  const isDeleting = deletingId === record._id;

                  return (
                    <TR key={record._id}>
                      {/* DATE */}
                      <TD>
                        <div className="font-medium">
                          {formatDate(record.date)}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {record.feedingTime || "—"}
                        </div>
                      </TD>

                      {/* POND */}
                      <TD>
                        <div className="font-semibold">
                          {pondName(record.pond)}
                        </div>

                        {record.pond?.pondNumber && (
                          <div className="mt-1 text-xs text-[var(--muted)]">
                            Pond #{record.pond.pondNumber}
                          </div>
                        )}
                      </TD>

                      {/* FEED */}
                      <TD>
                        <div className="font-semibold">
                          {record.feedBrand || "—"}
                        </div>

                        <div className="mt-1 text-xs capitalize text-[var(--muted)]">
                          {record.feedType || "—"}

                          {record.feedSize !== undefined &&
                            record.feedSize !== null && (
                              <>
                                {" · "}
                                {record.feedSize}
                                {record.feedSizeUnit || "mm"}
                              </>
                            )}
                        </div>
                      </TD>

                      {/* QUANTITY */}
                      <TD>
                        <div className="font-semibold">
                          {formatNumber(record.quantityUsed, 2)}{" "}
                          {record.quantityUnit || "kg"}
                        </div>

                        {record.estimatedBiomassBeforeFeeding !== null &&
                          record.estimatedBiomassBeforeFeeding !==
                            undefined && (
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Biomass:{" "}
                              {formatNumber(
                                record.estimatedBiomassBeforeFeeding,
                                2,
                              )}{" "}
                              kg
                            </div>
                          )}
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
                            Not linked
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
                            disabled={isDeleting || Boolean(deletingId)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Delete feeding"
                            onClick={() => handleDelete(record)}
                            disabled={isDeleting || Boolean(deletingId)}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        ) : (
          /* --------------------------------------------------
             EMPTY STATE
             -------------------------------------------------- */

          <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)]">
              <Utensils className="h-5 w-5 text-[var(--muted)]" />
            </div>

            <h3 className="text-sm font-semibold">No feeding records found</h3>

            <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
              {pond
                ? "There are no feeding records for the selected pond."
                : "Start by recording your first feeding activity."}
            </p>

            {!pond && (
              <Button
                type="button"
                className="mt-4 gap-2"
                onClick={openRecordDialog}
              >
                <Plus className="h-4 w-4" />
                Record feeding
              </Button>
            )}
          </div>
        )}

        {/* ----------------------------------------------------
            PAGINATION
            ---------------------------------------------------- */}

        {!loading && pagination.pages > 0 && (
          <div className="border-t p-4">
            <Pagination
              page={pagination.page || page}
              pages={pagination.pages || 0}
              onChange={(nextPage) => {
                setPage(nextPage);
              }}
            />
          </div>
        )}
      </Card>

      {/* ======================================================
          CREATE / EDIT DIALOG
          ====================================================== */}

      <Dialog
        open={open}
        onOpenChange={handleDialogChange}
        title={editing ? "Edit feeding record" : "Record feeding"}
        description={
          editing
            ? "Update the feeding information. Inventory will automatically be recalculated by the backend."
            : "Record a feeding event. If a matching active feed inventory item exists, the backend will automatically deduct the quantity."
        }
      >
        <form
          onSubmit={handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
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
          </div>

          {/* POND */}
          <div>
            <Label required>Pond</Label>

            <Select
              {...register("pond", {
                required: "A pond is required.",
              })}
            >
              <option value="">Select pond</option>

              {ponds.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {p.pondNumber ? ` · #${p.pondNumber}` : ""}
                </option>
              ))}
            </Select>
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
          </div>

          {/* FEED TYPE */}
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

          {/* FEED SIZE */}
          <div>
            <Label>Feed size</Label>

            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("feedSize")}
              />

              <Select {...register("feedSizeUnit")} className="w-28">
                <option value="mm">mm</option>

                <option value="kg">kg</option>

                <option value="other">other</option>
              </Select>
            </div>
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
          </div>

          {/* TIME */}
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
          </div>

          {/* COST */}
          <div>
            <Label>Cost</Label>

            <Input type="number" step="0.01" min="0" {...register("cost")} />
          </div>

          {/* BIOMASS */}
          <div>
            <Label>Estimated biomass before feeding (kg)</Label>

            <Input
              type="number"
              step="0.001"
              min="0"
              {...register("estimatedBiomassBeforeFeeding")}
            />
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
              className="min-h-28 w-full resize-y rounded-xl border bg-transparent p-3 text-sm outline-none transition focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={isSubmitting || isSubmittingRef.current}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isSubmittingRef.current}
              className="min-w-32 gap-2"
            >
              {isSubmitting || isSubmittingRef.current ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />

                  {editing ? "Updating..." : "Recording..."}
                </>
              ) : (
                <>
                  {editing ? (
                    <Edit3 className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
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
