"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Plus,
  HeartPulse,
  AlertTriangle,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Loader2,
} from "lucide-react";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { MORTALITY_CAUSES } from "@/lib/constants";

import {
  formatDate,
  formatNumber,
  pondName,
  toInputDate,
  labelize,
} from "@/lib/utils";

const PAGE_LIMIT = 30;
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const EMPTY_SUMMARY = {
  totalMortality: 0,
  records: 0,
  byPond: [],
  byCause: [],
};

const EMPTY_PAGINATION = {
  page: 1,
  pages: 1,
  total: 0,
  limit: PAGE_LIMIT,
};

const getDefaultFormValues = () => ({
  date: toInputDate(),
  pond: "",
  quantity: 1,
  estimatedCause: "unknown",
  notes: "",
  images: null,
});

export default function Mortality() {
  /*
   * ============================================================
   * DATA
   * ============================================================
   */

  const [rows, setRows] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [pagination, setPagination] = useState(EMPTY_PAGINATION);

  const [page, setPage] = useState(1);
  const [pond, setPond] = useState("");

  /*
   * ============================================================
   * FORM / DIALOG
   * ============================================================
   */

  const [open, setOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  /*
   * ============================================================
   * LOADING STATES
   * ============================================================
   */

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /*
   * ============================================================
   * DUPLICATE SUBMISSION PROTECTION
   * ============================================================
   *
   * IMPORTANT:
   *
   * Do NOT rely only on `submitting` state here.
   *
   * React state updates are asynchronous. A user can click the
   * submit button twice before the component re-renders.
   *
   * This ref changes synchronously and therefore acts as the
   * actual submission lock.
   *
   * This prevents:
   *
   * - double-click
   * - rapid repeated clicks
   * - pressing Enter repeatedly
   * - multiple submit events before React re-renders
   *
   * The lock is shared by CREATE and UPDATE.
   */

  const submitLockRef = useRef(false);

  /*
   * ============================================================
   * LOAD REQUEST PROTECTION
   * ============================================================
   *
   * Prevent an older request from overwriting newer results when
   * the user changes page/filter quickly.
   */

  const loadRequestIdRef = useRef(0);

  /*
   * ============================================================
   * COMPONENT MOUNT PROTECTION
   * ============================================================
   */

  const mountedRef = useRef(true);

  /*
   * ============================================================
   * EXISTING IMAGE REMOVAL
   * ============================================================
   */

  const [removeExistingImages, setRemoveExistingImages] = useState(false);

  /*
   * ============================================================
   * IMAGE GALLERY
   * ============================================================
   */

  const [gallery, setGallery] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  /*
   * ============================================================
   * FORM
   * ============================================================
   */

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: getDefaultFormValues(),
  });

  const imageFiles = watch("images");

  /*
   * ============================================================
   * MOUNT / UNMOUNT
   * ============================================================
   */

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * ============================================================
   * LOAD PONDS
   * ============================================================
   */

  useEffect(() => {
    let active = true;

    const loadPonds = async () => {
      try {
        const response = await api.ponds.list({
          limit: 100,
        });

        if (!active || !mountedRef.current) {
          return;
        }

        /*
         * Support the normal backend shape:
         *
         * {
         *   ponds: [...]
         * }
         *
         * and also a direct array response.
         */

        const pondRecords = Array.isArray(response?.ponds)
          ? response.ponds
          : Array.isArray(response)
            ? response
            : [];

        setPonds(pondRecords);
      } catch (error) {
        if (!active || !mountedRef.current) {
          return;
        }

        console.error("Pond loading error:", error);

        toast.error(error?.message || "Unable to load ponds.");
      }
    };

    loadPonds();

    return () => {
      active = false;
    };
  }, []);

  /*
   * ============================================================
   * LOAD MORTALITY DATA
   * ============================================================
   */

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;

    try {
      setLoading(true);

      const filter = pond
        ? {
            page,
            limit: PAGE_LIMIT,
            pond,
          }
        : {
            page,
            limit: PAGE_LIMIT,
          };

      const summaryFilter = pond
        ? {
            pond,
          }
        : {};

      const [recordsResponse, summaryResponse] = await Promise.all([
        api.mortality.list(filter),
        api.mortality.summary(summaryFilter),
      ]);

      /*
       * If another request started after this request,
       * ignore this older response.
       */

      if (requestId !== loadRequestIdRef.current || !mountedRef.current) {
        return;
      }

      const records = Array.isArray(recordsResponse?.records)
        ? recordsResponse.records
        : Array.isArray(recordsResponse)
          ? recordsResponse
          : [];

      const responsePagination = recordsResponse?.pagination;

      setRows(records);

      setPagination({
        ...EMPTY_PAGINATION,
        ...(responsePagination || {}),
        page:
          Number(responsePagination?.page) > 0
            ? Number(responsePagination.page)
            : page,
        limit:
          Number(responsePagination?.limit) > 0
            ? Number(responsePagination.limit)
            : PAGE_LIMIT,
      });

      setSummary({
        ...EMPTY_SUMMARY,
        ...(summaryResponse || {}),
      });
    } catch (error) {
      if (requestId !== loadRequestIdRef.current || !mountedRef.current) {
        return;
      }

      console.error("Mortality load error:", error);

      toast.error(error?.message || "Unable to load mortality records.");
    } finally {
      if (requestId === loadRequestIdRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [page, pond]);

  /*
   * ============================================================
   * RELOAD WHEN PAGE OR POND FILTER CHANGES
   * ============================================================
   */

  useEffect(() => {
    load();
  }, [load]);

  /*
   * ============================================================
   * RESET CREATE FORM
   * ============================================================
   */

  const resetCreateForm = useCallback(() => {
    reset(getDefaultFormValues());

    setRemoveExistingImages(false);
  }, [reset]);

  /*
   * ============================================================
   * OPEN CREATE DIALOG
   * ============================================================
   */

  const openCreateDialog = () => {
    /*
     * Never open another create dialog while a submission
     * is currently being processed.
     */

    if (submitting || submitLockRef.current) {
      return;
    }

    setEditingRecord(null);

    resetCreateForm();

    setOpen(true);
  };

  /*
   * ============================================================
   * OPEN EDIT DIALOG
   * ============================================================
   */

  const openEditDialog = (record) => {
    if (!record?._id) {
      toast.error("Unable to edit this mortality record.");
      return;
    }

    if (submitting || submitLockRef.current) {
      return;
    }

    setEditingRecord(record);

    setRemoveExistingImages(false);

    reset({
      date: toInputDate(record.date),
      pond:
        typeof record.pond === "string" ? record.pond : record.pond?._id || "",
      quantity: Number.isFinite(Number(record.quantity))
        ? Number(record.quantity)
        : 1,
      estimatedCause: record.estimatedCause || "unknown",
      notes: record.notes || "",
      images: null,
    });

    setOpen(true);
  };

  /*
   * ============================================================
   * CLOSE FORM DIALOG
   * ============================================================
   */

  const closeFormDialog = () => {
    /*
     * Never close/reset while the request is running.
     *
     * Otherwise a user could potentially start another operation
     * while the first API request is still active.
     */

    if (submitting || submitLockRef.current) {
      return;
    }

    setOpen(false);

    setEditingRecord(null);

    setRemoveExistingImages(false);

    resetCreateForm();
  };

  /*
   * ============================================================
   * CREATE / UPDATE MORTALITY
   * ============================================================
   */

  const submit = async (data) => {
    /*
     * ==========================================================
     * HARD CLIENT-SIDE SUBMISSION LOCK
     * ==========================================================
     *
     * This check MUST happen before setSubmitting().
     *
     * The ref is synchronous and therefore prevents two submit
     * events from entering this function at the same time.
     */

    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;

    setSubmitting(true);

    const recordBeingEdited = editingRecord;

    try {
      /*
       * ========================================================
       * FINAL CLIENT-SIDE VALIDATION
       * ========================================================
       */

      const selectedDate = String(data?.date || "").trim();
      const selectedPond = String(data?.pond || "").trim();
      const quantity = Number(data?.quantity);

      if (!selectedDate) {
        toast.error("Mortality date is required.");
        return;
      }

      if (!selectedPond) {
        toast.error("Please select a pond.");
        return;
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        toast.error(
          "Mortality quantity must be a whole number greater than zero.",
        );
        return;
      }

      /*
       * ========================================================
       * IMAGE VALIDATION
       * ========================================================
       */

      const selectedFiles =
        data?.images && data.images.length ? Array.from(data.images) : [];

      if (selectedFiles.length > MAX_IMAGES) {
        toast.error(`You can upload a maximum of ${MAX_IMAGES} images.`);
        return;
      }

      const invalidType = selectedFiles.find(
        (file) => !ALLOWED_IMAGE_TYPES.includes(file.type),
      );

      if (invalidType) {
        toast.error("Only JPEG, PNG, WebP, and GIF images are allowed.");
        return;
      }

      const oversizedFile = selectedFiles.find(
        (file) => file.size > MAX_IMAGE_SIZE,
      );

      if (oversizedFile) {
        toast.error("Each image must be 5MB or smaller.");
        return;
      }

      /*
       * ========================================================
       * FORM DATA
       * ========================================================
       */

      const formData = new FormData();

      formData.append("date", selectedDate);

      formData.append("pond", selectedPond);

      formData.append("quantity", String(quantity));

      formData.append(
        "estimatedCause",
        String(data?.estimatedCause || "unknown"),
      );

      formData.append("notes", String(data?.notes || "").trim());

      /*
       * Existing image behavior applies ONLY to update.
       *
       * CREATE does not need removeImage.
       */

      if (recordBeingEdited?._id) {
        formData.append("removeImage", removeExistingImages ? "true" : "false");
      }

      /*
       * Append each file separately using the backend's
       * expected "images" field.
       */

      selectedFiles.slice(0, MAX_IMAGES).forEach((file) => {
        formData.append("images", file);
      });

      /*
       * ========================================================
       * CREATE
       * ========================================================
       */

      if (!recordBeingEdited?._id) {
        await api.mortality.create(formData);

        if (!mountedRef.current) {
          return;
        }

        toast.success(
          "Mortality recorded successfully. Pond fish count has been synchronized.",
        );
      } else {

      /*
       * ========================================================
       * UPDATE
       * ========================================================
       */
        await api.mortality.update(recordBeingEdited._id, formData);

        if (!mountedRef.current) {
          return;
        }

        toast.success(
          "Mortality record updated successfully. Pond fish count has been synchronized.",
        );
      }

      /*
       * ========================================================
       * SUCCESS CLEANUP
       * ========================================================
       */

      setOpen(false);

      setEditingRecord(null);

      setRemoveExistingImages(false);

      resetCreateForm();

      /*
       * After create/update, return to first page.
       *
       * If already on page 1, manually reload.
       *
       * If on another page, changing page to 1 causes the
       * useEffect above to load the records.
       */

      if (page !== 1) {
        setPage(1);
      } else {
        await load();
      }
    } catch (error) {
      console.error(
        recordBeingEdited
          ? "Mortality update error:"
          : "Mortality creation error:",
        error,
      );

      if (mountedRef.current) {
        toast.error(
          error?.message ||
            (recordBeingEdited
              ? "Unable to update mortality record."
              : "Unable to record mortality."),
        );
      }
    } finally {
      /*
       * ========================================================
       * RELEASE SUBMISSION LOCK
       * ========================================================
       *
       * This MUST happen after the API request has completely
       * finished.
       */

      submitLockRef.current = false;

      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  /*
   * ============================================================
   * DELETE MORTALITY
   * ============================================================
   *
   * This is a HARD DELETE.
   * It calls:
   *
   * DELETE /mortality/:id
   *
   * through:
   *
   * api.mortality.remove(id)
   * ============================================================
   */

  const handleDelete = async (record) => {
    if (!record?._id) {
      toast.error("Unable to delete this mortality record.");
      return;
    }

    /*
     * Do not allow deletion while another create/update
     * operation is in progress.
     */

    if (submitting || submitLockRef.current) {
      return;
    }

    /*
     * Do not allow two delete requests for the same record.
     */

    if (deletingId === record._id) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete this mortality record?\n\n` +
        `Date: ${formatDate(record.date)}\n` +
        `Pond: ${pondName(record.pond)}\n` +
        `Quantity: ${formatNumber(record.quantity)} fish\n\n` +
        `This action cannot be undone. The record will be permanently removed from MongoDB and its associated Cloudinary images will also be deleted.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(record._id);

      await api.mortality.remove(record._id);

      if (!mountedRef.current) {
        return;
      }

      toast.success(
        "Mortality record permanently deleted. Pond fish count has been synchronized.",
      );

      /*
       * If this was the only record on the page and we are
       * not on page 1, move back one page.
       */

      if (rows.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(1, currentPage - 1));
      } else {
        await load();
      }
    } catch (error) {
      console.error("Permanent mortality deletion error:", error);

      if (mountedRef.current) {
        toast.error(
          error?.message ||
            "Unable to permanently delete the mortality record.",
        );
      }
    } finally {
      if (mountedRef.current) {
        setDeletingId(null);
      }
    }
  };

  /*
   * ============================================================
   * IMAGE URL HELPER
   * ============================================================
   */

  const extractImageUrl = (image) => {
    if (!image) {
      return "";
    }

    if (typeof image === "string" && image.trim()) {
      return image.trim();
    }

    if (typeof image.url === "string" && image.url.trim()) {
      return image.url.trim();
    }

    if (typeof image.secure_url === "string" && image.secure_url.trim()) {
      return image.secure_url.trim();
    }

    if (typeof image.secureUrl === "string" && image.secureUrl.trim()) {
      return image.secureUrl.trim();
    }

    if (typeof image.url?.url === "string" && image.url.url.trim()) {
      return image.url.url.trim();
    }

    return "";
  };

  /*
   * ============================================================
   * GET MORTALITY IMAGES
   * ============================================================
   */

  const getImages = (row) => {
    if (!row) {
      return [];
    }

    if (Array.isArray(row.images) && row.images.length > 0) {
      return row.images
        .map((image) => extractImageUrl(image))
        .filter(Boolean)
        .slice(0, MAX_IMAGES);
    }

    /*
     * Backward-compatible single-image fallbacks.
     */

    const fallbacks = [row.image, row.imageUrl, row.imageURL];

    for (const candidate of fallbacks) {
      const url = extractImageUrl(candidate);

      if (url) {
        return [url];
      }
    }

    return [];
  };

  /*
   * ============================================================
   * IMAGE GALLERY
   * ============================================================
   */

  const openGallery = (images, index = 0) => {
    if (!Array.isArray(images) || images.length === 0) {
      return;
    }

    const safeIndex = Math.min(
      Math.max(Number(index) || 0, 0),
      images.length - 1,
    );

    setGallery(images);
    setGalleryIndex(safeIndex);
  };

  const closeGallery = () => {
    setGallery(null);
    setGalleryIndex(0);
  };

  const showPrevImage = () => {
    setGalleryIndex((current) => {
      if (!gallery?.length) {
        return 0;
      }

      return (current - 1 + gallery.length) % gallery.length;
    });
  };

  const showNextImage = () => {
    setGalleryIndex((current) => {
      if (!gallery?.length) {
        return 0;
      }

      return (current + 1) % gallery.length;
    });
  };

  /*
   * ============================================================
   * KEYBOARD GALLERY CONTROLS
   * ============================================================
   */

  useEffect(() => {
    if (!gallery?.length) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeGallery();
      }

      if (event.key === "ArrowLeft" && gallery.length > 1) {
        showPrevImage();
      }

      if (event.key === "ArrowRight" && gallery.length > 1) {
        showNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gallery]);

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <AdminLayout
      title="Mortality"
      description="Monitor fish losses and keep pond counts synchronized."
    >
      <PageHeader
        eyebrow="Fish health"
        title="Mortality"
        description="Record fish losses carefully and understand mortality causes by pond."
        action={{
          label: "Record mortality",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateDialog,
        }}
      />

      {/* ======================================================
          METRICS
          ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Mortality"
          value={formatNumber(summary?.totalMortality ?? 0)}
          sub="selected view"
          icon={HeartPulse}
        />

        <MetricCard
          label="Records"
          value={formatNumber(summary?.records ?? 0)}
          sub="mortality events"
          icon={AlertTriangle}
        />

        <MetricCard
          label="Top cause"
          value={labelize(summary?.byCause?.[0]?.cause || "—")}
          sub={`${formatNumber(summary?.byCause?.[0]?.quantity ?? 0)} fish`}
          icon={HeartPulse}
        />
      </div>

      {/* ======================================================
          RECORDS
          ====================================================== */}

      <Card className="mt-5 p-5">
        <div className="mb-5 flex justify-end">
          <Select
            value={pond}
            disabled={loading || submitting || Boolean(deletingId)}
            onChange={(event) => {
              const value = event.target.value;

              setPage(1);
              setPond(value);
            }}
            className="w-full md:w-56"
          >
            <option value="">All ponds</option>

            {ponds.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name} · #{item.pondNumber}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading mortality records...
          </div>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Pond</TH>
                  <TH>Quantity</TH>
                  <TH>Cause</TH>
                  <TH>Notes</TH>
                  <TH>Image</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>

              <TBody>
                {rows.map((row) => {
                  const images = getImages(row);

                  const imageUrl = images[0] || "";

                  const isDeleting = deletingId === row._id;

                  return (
                    <TR key={row._id}>
                      {/* DATE */}

                      <TD>{formatDate(row.date)}</TD>

                      {/* POND */}

                      <TD className="font-bold">{pondName(row.pond)}</TD>

                      {/* QUANTITY */}

                      <TD className="font-black text-red-600">
                        {formatNumber(row.quantity)}
                      </TD>

                      {/* CAUSE */}

                      <TD>{labelize(row.estimatedCause || "unknown")}</TD>

                      {/* NOTES */}

                      <TD className="max-w-xs truncate text-[var(--muted)]">
                        {row.notes || "—"}
                      </TD>

                      {/* IMAGE */}

                      <TD>
                        {imageUrl ? (
                          <button
                            type="button"
                            onClick={() => openGallery(images, 0)}
                            className="group relative block h-14 w-14 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]/10 shadow-sm transition hover:scale-105 hover:shadow-md"
                            title={
                              images.length > 1
                                ? `View ${images.length} mortality images`
                                : "View mortality image"
                            }
                          >
                            <img
                              src={imageUrl}
                              alt={`Mortality recorded on ${formatDate(
                                row.date,
                              )}`}
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-110"
                              loading="lazy"
                              onError={(event) => {
                                console.error(
                                  "Failed to load mortality image:",
                                  imageUrl,
                                );

                                event.currentTarget.style.opacity = "0.3";
                              }}
                            />

                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                              <ImageIcon className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
                            </span>

                            {images.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                +{images.length - 1}
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-sm text-[var(--muted)]">—</span>
                        )}
                      </TD>

                      {/* ACTIONS */}

                      <TD>
                        <div className="flex items-center justify-end gap-2">
                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() => openEditDialog(row)}
                            disabled={
                              isDeleting || submitting || Boolean(deletingId)
                            }
                            title="Edit mortality record"
                            aria-label="Edit mortality record"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            disabled={
                              isDeleting ||
                              submitting ||
                              Boolean(deletingId && deletingId !== row._id)
                            }
                            title="Permanently delete mortality record"
                            aria-label="Permanently delete mortality record"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        ) : (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            No mortality records found.
          </div>
        )}

        <Pagination
          page={Number(pagination?.page) || page}
          pages={Number(pagination?.pages) || 1}
          onChange={(nextPage) => {
            const safePage = Math.max(1, Number(nextPage) || 1);

            if (safePage !== page && !loading && !submitting) {
              setPage(safePage);
            }
          }}
        />
      </Card>

      {/* ======================================================
          CREATE / EDIT DIALOG
          ====================================================== */}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeFormDialog();
          } else if (!submitting && !submitLockRef.current) {
            setOpen(true);
          }
        }}
        title={editingRecord ? "Edit mortality record" : "Record mortality"}
        description={
          editingRecord
            ? "Update the mortality record. Changes will synchronize the pond fish count."
            : "Record the fish loss. Date, pond and quantity are required."
        }
      >
        <form
          onSubmit={handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          {/* DATE */}

          <div>
            <Label htmlFor="mortality-date" required>
              Date
            </Label>

            <Input
              id="mortality-date"
              type="date"
              disabled={submitting}
              {...register("date", {
                required: "Mortality date is required.",
              })}
            />

            {errors.date && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.date.message}
              </p>
            )}
          </div>

          {/* POND */}

          <div>
            <Label htmlFor="mortality-pond" required>
              Pond
            </Label>

            <Select
              id="mortality-pond"
              disabled={submitting}
              {...register("pond", {
                required: "Please select a pond.",
              })}
            >
              <option value="">Select pond</option>

              {ponds.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} · #{item.pondNumber}
                </option>
              ))}
            </Select>

            {errors.pond && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.pond.message}
              </p>
            )}
          </div>

          {/* QUANTITY */}

          <div>
            <Label htmlFor="mortality-quantity" required>
              Quantity
            </Label>

            <Input
              id="mortality-quantity"
              type="number"
              min="1"
              step="1"
              disabled={submitting}
              {...register("quantity", {
                required: "Mortality quantity is required.",

                valueAsNumber: true,

                min: {
                  value: 1,
                  message: "Quantity must be at least 1.",
                },

                validate: (value) => {
                  if (!Number.isInteger(value)) {
                    return "Quantity must be a whole number.";
                  }

                  if (value < 1) {
                    return "Quantity must be at least 1.";
                  }

                  return true;
                },
              })}
            />

            {errors.quantity && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.quantity.message}
              </p>
            )}
          </div>

          {/* CAUSE */}

          <div>
            <Label htmlFor="mortality-cause">Estimated cause</Label>

            <Select
              id="mortality-cause"
              disabled={submitting}
              {...register("estimatedCause")}
            >
              {MORTALITY_CAUSES.map((cause) => (
                <option key={cause} value={cause}>
                  {labelize(cause)}
                </option>
              ))}
            </Select>
          </div>

          {/* NOTES */}

          <div className="sm:col-span-2">
            <Label htmlFor="mortality-notes">Notes</Label>

            <textarea
              id="mortality-notes"
              disabled={submitting}
              {...register("notes")}
              maxLength={3000}
              placeholder="Optional notes about the mortality..."
              className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* ==================================================
              EXISTING IMAGES — EDIT ONLY
              ================================================== */}

          {editingRecord && (
            <div className="sm:col-span-2">
              <Label>Current fish images</Label>

              {(() => {
                const existingImages = getImages(editingRecord);

                if (!existingImages.length) {
                  return (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      This mortality record has no existing images.
                    </p>
                  );
                }

                return (
                  <>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {existingImages.map((imageUrl, index) => (
                        <button
                          key={`${imageUrl}-${index}`}
                          type="button"
                          disabled={submitting}
                          onClick={() => openGallery(existingImages, index)}
                          className="group relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--border)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <img
                            src={imageUrl}
                            alt={`Existing mortality image ${index + 1}`}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                            loading="lazy"
                          />

                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                            <ImageIcon className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
                          </span>
                        </button>
                      ))}
                    </div>

                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={removeExistingImages}
                        disabled={submitting}
                        onChange={(event) =>
                          setRemoveExistingImages(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-[var(--border)]"
                      />

                      <span className="text-red-600">
                        Remove current images
                      </span>
                    </label>

                    <p className="mt-1.5 text-xs text-[var(--muted)]">
                      Uploading new images will replace the current images.
                      Checking "Remove current images" clears them without
                      uploading replacements.
                    </p>
                  </>
                );
              })()}
            </div>
          )}

          {/* ==================================================
              NEW IMAGES
              ================================================== */}

          <div className="sm:col-span-2">
            <Label htmlFor="mortality-image">
              {editingRecord ? "Replace with new images" : "Fish images"}
            </Label>

            <Input
              id="mortality-image"
              type="file"
              multiple
              disabled={submitting}
              accept="image/jpeg,image/png,image/webp,image/gif"
              {...register("images", {
                validate: {
                  maxCount: (files) => {
                    if (!files || !files.length) {
                      return true;
                    }

                    return (
                      files.length <= MAX_IMAGES ||
                      `You can upload a maximum of ${MAX_IMAGES} images.`
                    );
                  },

                  fileSize: (files) => {
                    if (!files || !files.length) {
                      return true;
                    }

                    return (
                      Array.from(files).every(
                        (file) => file.size <= MAX_IMAGE_SIZE,
                      ) || "Each image must be 5MB or smaller."
                    );
                  },

                  fileType: (files) => {
                    if (!files || !files.length) {
                      return true;
                    }

                    return (
                      Array.from(files).every((file) =>
                        ALLOWED_IMAGE_TYPES.includes(file.type),
                      ) || "Only JPEG, PNG, WebP, and GIF images are allowed."
                    );
                  },
                },
              })}
            />

            {errors.images && (
              <p className="mt-1.5 text-xs font-medium text-red-500">
                {errors.images.message}
              </p>
            )}

            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Optional. Up to 5 images, 5MB max each.
            </p>

            {imageFiles?.length > 0 && (
              <div className="mt-3 space-y-2">
                {Array.from(imageFiles).map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ImageIcon className="h-4 w-4 shrink-0" />

                      <span className="max-w-xs truncate text-sm font-medium">
                        {file.name}
                      </span>
                    </div>

                    <span className="ml-3 shrink-0 text-xs text-[var(--muted)]">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================
              ACTIONS
              ================================================== */}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting || submitLockRef.current}
              onClick={closeFormDialog}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={submitting || submitLockRef.current}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                  {editingRecord ? "Updating..." : "Recording..."}
                </>
              ) : editingRecord ? (
                "Save changes"
              ) : (
                "Record mortality"
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ======================================================
          IMAGE GALLERY VIEWER
          ====================================================== */}

      {gallery && gallery.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={closeGallery}
          role="dialog"
          aria-modal="true"
          aria-label="Mortality image gallery"
        >
          <div
            className="relative flex max-h-[92vh] max-w-5xl items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* CLOSE */}

            <button
              type="button"
              onClick={closeGallery}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
              aria-label="Close image gallery"
            >
              <X className="h-5 w-5" />
            </button>

            {/* PREVIOUS / NEXT */}

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrevImage}
                  className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <span className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                  {galleryIndex + 1} / {gallery.length}
                </span>
              </>
            )}

            <img
              src={gallery[galleryIndex]}
              alt={`Mortality record image ${
                galleryIndex + 1
              } of ${gallery.length}`}
              className="max-h-[92vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
