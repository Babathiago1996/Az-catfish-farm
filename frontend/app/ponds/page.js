"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Waves,
  MoreHorizontal,
} from "lucide-react";
import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { POND_TYPES, POND_STATUSES, WATER_SOURCES } from "@/lib/constants";
import { formatNumber, labelize, getId } from "@/lib/utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
const schema = z.object({
  name: z.string().min(1).max(150),
  pondNumber: z.string().min(1).max(50),
  pondType: z.string().min(1),
  pondSizeValue: z.coerce.number().positive(),
  pondSizeUnit: z.string().min(1),
  waterSource: z.string().min(1),
  status: z.string().min(1),
  notes: z.string().max(500).optional(),
});
export default function Ponds() {
  const [rows, setRows] = useState([]),
    [pagination, setPagination] = useState({}),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null);
  const load = () =>
    api.ponds
      .list({ page, limit: 20, search, status })
      .then((r) => {
        setRows(r?.ponds || []);
        setPagination(r?.pagination || {});
      })
      .catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
  }, [page, status, search]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      pondNumber: "",
      pondType: POND_TYPES[0],
      pondSizeValue: 1,
      pondSizeUnit: "sqm",
      waterSource: WATER_SOURCES[0],
      status: "empty",
      notes: "",
    },
  });
  const submit = async (d) => {
    const payload = {
      name: d.name,
      pondNumber: d.pondNumber,
      pondType: d.pondType,
      pondSize: { value: d.pondSizeValue, unit: d.pondSizeUnit },
      waterSource: d.waterSource,
      status: d.status,
      notes: d.notes || "",
    };
    try {
      if (editing) await api.ponds.update(editing._id, payload);
      else await api.ponds.create(payload);
      toast.success(editing ? "Pond updated." : "Pond created.");
      setOpen(false);
      setEditing(null);
      form.reset();
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const edit = (p) => {
    setEditing(p);
    form.reset({
      name: p.name || "",
      pondNumber: p.pondNumber || "",
      pondType: p.pondType || POND_TYPES[0],
      pondSizeValue: p.pondSize?.value || 1,
      pondSizeUnit: p.pondSize?.unit || "sqm",
      waterSource: p.waterSource || WATER_SOURCES[0],
      status: p.status || "empty",
      notes: p.notes || "",
    });
    setOpen(true);
  };
  const remove = async (id) => {
    if (!confirm("Delete this pond? Ponds with history cannot be deleted."))
      return;
    try {
      await api.ponds.remove(id);
      toast.success("Pond deleted.");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <AdminLayout
      title="Ponds"
      description="Manage pond infrastructure and current production status"
    >
      <PageHeader
        eyebrow="Farm operations"
        title="Ponds"
        description="Your production map starts here."
        action={{
          label: "Add pond",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            setEditing(null);
            form.reset();
            setOpen(true);
          },
        }}
      />
      <Card className="p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search pond name, number, type..."
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="md:w-44"
          >
            <option value="">All statuses</option>
            {POND_STATUSES.map((x) => (
              <option key={x} value={x}>
                {labelize(x)}
              </option>
            ))}
          </Select>
        </div>
        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Pond</TH>
                <TH>Type</TH>
                <TH>Size</TH>
                <TH>Fish</TH>
                <TH>Avg. weight</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p._id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                        <Waves className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-xs text-[var(--muted)]">
                          #{p.pondNumber}
                        </div>
                      </div>
                    </div>
                  </TD>
                  <TD>{labelize(p.pondType)}</TD>
                  <TD>
                    {p.pondSize?.value} {p.pondSize?.unit}
                  </TD>
                  <TD>{formatNumber(p.currentFishCount)}</TD>
                  <TD>{formatNumber(p.currentAverageWeight, 2)} g</TD>
                  <TD>
                    <StatusBadge status={p.status} />
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => edit(p)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(getId(p))}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            No ponds found.
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
        onOpenChange={setOpen}
        title={editing ? "Edit pond" : "Add a new pond"}
        description="Keep the pond master record accurate; fish counts are synchronized by operational modules."
      >
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <Label htmlFor="name" required>
              Name
            </Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="pondNumber" required>
              Pond number
            </Label>
            <Input id="pondNumber" {...form.register("pondNumber")} />
          </div>
          <div>
            <Label>Pond type</Label>
            <Select {...form.register("pondType")}>
              {POND_TYPES.map((x) => (
                <option key={x} value={x}>
                  {labelize(x)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Water source</Label>
            <Select {...form.register("waterSource")}>
              {WATER_SOURCES.map((x) => (
                <option key={x} value={x}>
                  {labelize(x)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Size</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                {...form.register("pondSizeValue")}
              />
              <Select {...form.register("pondSizeUnit")} className="w-32">
                {["sqm", "m2", "liters", "cubic_meters"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select {...form.register("status")}>
              {POND_STATUSES.map((x) => (
                <option key={x} value={x}>
                  {labelize(x)}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <textarea
              {...form.register("notes")}
              className="min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-blue-500"
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
            <Button type="submit">
              {editing ? "Save changes" : "Create pond"}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
