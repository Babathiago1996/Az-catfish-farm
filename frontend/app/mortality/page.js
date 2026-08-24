"use client";

import { useEffect, useState } from "react";

import {
  Plus,
  HeartPulse,
  AlertTriangle,
  Image as ImageIcon,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
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

export default function Mortality() {
  const [rows, setRows] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [summary, setSummary] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 30,
  });

  const [page, setPage] = useState(1);
  const [pond, setPond] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Gallery viewer state.
   *
   * gallery: array of image URLs for the row currently
   * being viewed (up to 5).
   *
   * galleryIndex: which image in that array is showing.
   */
  const [gallery, setGallery] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  /**
   * Load mortality records + summary.
   */
  const load = async () => {
    try {
      setLoading(true);

      const [recordsResponse, summaryResponse] = await Promise.all([
        api.mortality.list({
          page,
          limit: 30,
          pond,
        }),

        api.mortality.summary({
          pond,
        }),
      ]);
      console.log("========== MORTALITY API RESPONSE ==========");

      console.log("recordsResponse:", recordsResponse);

      console.log("records:", recordsResponse?.records);

      console.log("first record:", recordsResponse?.records?.[0]);

      console.log("first record image:", recordsResponse?.records?.[0]?.image);

      console.log(
        "first record image URL:",
        recordsResponse?.records?.[0]?.image?.url,
      );

      console.log("============================================");
      /**
       * Records.
       */
      setRows(
        Array.isArray(recordsResponse?.records) ? recordsResponse.records : [],
      );

      /**
       * Pagination.
       */
      setPagination(
        recordsResponse?.pagination || {
          page,
          pages: 1,
          total: 0,
          limit: 30,
        },
      );

      /**
       * Summary.
       *
       * api.mortality.summary()
       * already unwraps the backend
       * { summary: {...} } response.
       */
      setSummary(
        summaryResponse || {
          totalMortality: 0,
          records: 0,
          byPond: [],
          byCause: [],
        },
      );
    } catch (error) {
      console.error("Mortality load error:", error);

      toast.error(error?.message || "Unable to load mortality records.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load ponds.
   */
  useEffect(() => {
    const loadPonds = async () => {
      try {
        const response = await api.ponds.list({
          limit: 100,
        });

        setPonds(Array.isArray(response?.ponds) ? response.ponds : []);
      } catch (error) {
        console.error("Pond loading error:", error);

        toast.error(error?.message || "Unable to load ponds.");
      }
    };

    loadPonds();
  }, []);

  /**
   * Reload whenever page or
   * selected pond changes.
   */
  useEffect(() => {
    load();
  }, [page, pond]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date: toInputDate(),
      pond: "",
      quantity: 1,
      estimatedCause: "unknown",
      notes: "",
      images: null,
    },
  });

  const imageFiles = watch("images");

  /**
   * Open create dialog.
   */
  const openCreateDialog = () => {
    reset({
      date: toInputDate(),
      pond: "",
      quantity: 1,
      estimatedCause: "unknown",
      notes: "",
      images: null,
    });

    setOpen(true);
  };

  /**
   * Create mortality record.
   */
  const submit = async (data) => {
    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("date", data.date);

      formData.append("pond", data.pond);

      formData.append("quantity", String(Number(data.quantity)));

      formData.append("estimatedCause", data.estimatedCause || "unknown");

      formData.append("notes", data.notes?.trim() || "");

      /**
       * Attach images (up to 5).
       */
      if (data.images && data.images.length > 0) {
        Array.from(data.images)
          .slice(0, 5)
          .forEach((file) => {
            formData.append("images", file);
          });
      }

      await api.mortality.create(formData);

      toast.success(
        "Mortality recorded successfully. Pond fish count has been synchronized.",
      );

      setOpen(false);

      reset({
        date: toInputDate(),
        pond: "",
        quantity: 1,
        estimatedCause: "unknown",
        notes: "",
        images: null,
      });

      /**
       * Reload the first page so
       * the new record + metrics
       * appear immediately.
       */
      setPage(1);

      await load();
    } catch (error) {
      console.error("Mortality creation error:", error);

      toast.error(error?.message || "Unable to record mortality.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Get a single image URL out of one image-like value,
   * trying every shape the backend has historically used.
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

    // Possible data wrapper
    if (typeof image.url?.url === "string" && image.url.url.trim()) {
      return image.url.url.trim();
    }

    return "";
  };

  /**
   * Get up to 5 image URLs from a record.
   *
   * Prefers the new `images` array; falls back to the
   * legacy single `image` field (and other flattened
   * shapes) for older records / API responses.
   */
  const getImages = (row) => {
    if (!row) {
      return [];
    }

    if (Array.isArray(row.images) && row.images.length) {
      return row.images
        .map((image) => extractImageUrl(image))
        .filter(Boolean)
        .slice(0, 5);
    }

    const fallbacks = [row.image, row.imageUrl, row.imageURL];

    for (const candidate of fallbacks) {
      const url = extractImageUrl(candidate);

      if (url) {
        return [url];
      }
    }

    return [];
  };

  /**
   * Open the gallery viewer for a row's images,
   * starting at the given index (defaults to the first).
   */
  const openGallery = (images, index = 0) => {
    if (!images.length) {
      return;
    }

    setGallery(images);
    setGalleryIndex(index);
  };

  const closeGallery = () => {
    setGallery(null);
    setGalleryIndex(0);
  };

  const showPrevImage = () => {
    setGalleryIndex((current) =>
      gallery ? (current - 1 + gallery.length) % gallery.length : 0,
    );
  };

  const showNextImage = () => {
    setGalleryIndex((current) =>
      gallery ? (current + 1) % gallery.length : 0,
    );
  };

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

      {/* METRICS */}
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

      {/* RECORDS */}
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

            {ponds.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name} · #{item.pondNumber}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            Loading mortality records...
          </div>
        ) : rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Pond</TH>
                <TH>Quantity</TH>
                <TH>Cause</TH>
                <TH>Notes</TH>
                <TH>Image</TH>
              </TR>
            </THead>

            <TBody>
              {rows.map((row) => {
                const images = getImages(row);
                const imageUrl = images[0] || "";

                return (
                  <TR key={row._id}>
                    <TD>{formatDate(row.date)}</TD>

                    <TD className="font-bold">{pondName(row.pond)}</TD>

                    <TD className="font-black text-red-600">
                      {formatNumber(row.quantity)}
                    </TD>

                    <TD>{labelize(row.estimatedCause)}</TD>

                    <TD className="max-w-xs truncate text-[var(--muted)]">
                      {row.notes || "—"}
                    </TD>

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
                            alt={`Mortality recorded on ${formatDate(row.date)}`}
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-110"
                            loading="lazy"
                            onError={(event) => {
                              console.error(
                                "FAILED TO LOAD MORTALITY IMAGE:",
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
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            No mortality records found.
          </div>
        )}

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          onChange={setPage}
        />
      </Card>

      {/* CREATE DIALOG */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Record mortality"
        description="Record the fish loss. Date, pond and quantity are required."
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
              {...register("quantity", {
                required: "Mortality quantity is required.",

                valueAsNumber: true,

                min: {
                  value: 1,
                  message: "Quantity must be at least 1.",
                },

                validate: (value) =>
                  Number.isInteger(value) || "Quantity must be a whole number.",
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

            <Select id="mortality-cause" {...register("estimatedCause")}>
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
              {...register("notes")}
              maxLength={3000}
              placeholder="Optional notes about the mortality..."
              className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* IMAGES */}
          <div className="sm:col-span-2">
            <Label htmlFor="mortality-image">Fish images</Label>

            <Input
              id="mortality-image"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              {...register("images", {
                validate: {
                  maxCount: (files) => {
                    if (!files || !files.length) {
                      return true;
                    }

                    return (
                      files.length <= 5 ||
                      "You can upload a maximum of 5 images."
                    );
                  },

                  fileSize: (files) => {
                    if (!files || !files.length) {
                      return true;
                    }

                    return (
                      Array.from(files).every(
                        (file) => file.size <= 5 * 1024 * 1024,
                      ) || "Each image must be 5MB or smaller."
                    );
                  },

                  fileType: (files) => {
                    if (!files || !files.length) {
                      return true;
                    }

                    const allowed = [
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                      "image/gif",
                    ];

                    return (
                      Array.from(files).every((file) =>
                        allowed.includes(file.type),
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
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />

                      <span className="max-w-xs truncate text-sm font-medium">
                        {file.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording..." : "Record mortality"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* IMAGE GALLERY VIEWER */}
      {gallery && gallery.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={closeGallery}
        >
          <div
            className="relative flex max-h-[92vh] max-w-5xl items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeGallery}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
              aria-label="Close image"
            >
              <X className="h-5 w-5" />
            </button>

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
              alt={`Mortality record image ${galleryIndex + 1} of ${gallery.length}`}
              className="max-h-[92vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
