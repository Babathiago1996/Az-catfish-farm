"use client";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Images,
  Trash2,
  Edit3,
  UploadCloud,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import { labelize } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
export default function Media() {
  const [rows, setRows] = useState([]),
    [pagination, setPagination] = useState({}),
    [page, setPage] = useState(1),
    [category, setCategory] = useState(""),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null);
  const load = () =>
    api.gallery
      .list({ page, limit: 30, category })
      .then((r) => {
        setRows(r?.galleries || []);
        setPagination(r?.pagination || {});
      })
      .catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
  }, [page, category]);
  const form = useForm({
    defaultValues: { title: "", description: "", category: "farm" },
  });
  const fileRef = useRef();

  /*
   * Synchronous guard against double-submission (fast
   * double-click, or a slow upload plus an impatient
   * second click before the button visually disables).
   * Without this, two clicks in that window fired
   * api.gallery.create() twice, which is why uploads
   * were duplicating.
   */
  const isSubmittingRef = useRef(false);

  const submit = async (d) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      if (editing) {
        await api.gallery.update(editing._id, d);
        toast.success("Gallery item updated.");
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error("Choose an image.");
        const fd = new FormData();
        fd.append("image", file);
        fd.append("title", d.title);
        fd.append("description", d.description || "");
        fd.append("category", d.category);
        await api.gallery.create(fd);
        toast.success("Gallery image uploaded.");
      }
      setOpen(false);
      setEditing(null);
      form.reset();
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      isSubmittingRef.current = false;
    }
  };
  const edit = (r) => {
    setEditing(r);
    form.reset({
      title: r.title,
      description: r.description,
      category: r.category,
    });
    setOpen(true);
  };
  const remove = async (id) => {
    if (!confirm("Delete this gallery image?")) return;
    try {
      await api.gallery.remove(id);
      toast.success("Gallery image deleted.");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <AdminLayout
      title="Media Gallery"
      description="Manage the images displayed on the public website"
    >
      <PageHeader
        eyebrow="Website management"
        title="Media gallery"
        description="Upload and curate the public-facing visual story of the farm."
        action={{
          label: "Upload image",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            setEditing(null);
            form.reset();
            setOpen(true);
          },
        }}
      />
      <Card className="p-5">
        <div className="mb-5 flex justify-end">
          <Select
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            className="w-48"
          >
            <option value="">All categories</option>
            {GALLERY_CATEGORIES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </div>
        {rows.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((r) => (
              <article
                key={r._id}
                className="overflow-hidden rounded-2xl border bg-[var(--card)]"
              >
                <div className="aspect-[4/3] bg-slate-200">
                  <img
                    src={r.imageUrl}
                    alt={r.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {labelize(r.category)}
                  </div>
                  <div className="mt-1 font-bold">{r.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                    {r.description}
                  </p>
                  <div className="mt-3 flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => edit(r)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(r._id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            No gallery images yet.
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
          if (form.formState.isSubmitting) {
            return;
          }
          setOpen(next);
        }}
        title={editing ? "Edit gallery item" : "Upload gallery image"}
        description={
          editing
            ? "Update the public gallery metadata."
            : "JPEG, PNG, WebP or GIF; backend limit is 5 MB."
        }
      >
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <div>
            <Label required>Title</Label>
            <Input {...form.register("title")} />
          </div>
          <div>
            <Label>Category</Label>
            <Select {...form.register("category")}>
              {GALLERY_CATEGORIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <textarea
              {...form.register("description")}
              className="min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm"
            />
          </div>
          {!editing && (
            <div>
              <Label required>Image</Label>
              <div className="rounded-2xl border border-dashed p-6 text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-blue-600" />
                <p className="mt-2 text-sm font-semibold">Choose an image</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="mx-auto mt-3 block text-xs"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editing ? "Saving..." : "Uploading..."}
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Upload image"
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
