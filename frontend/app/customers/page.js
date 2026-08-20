"use client";
import { useEffect, useState } from "react";
import { Plus, UsersRound, Trash2, Edit3 } from "lucide-react";
import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { formatNumber } from "@/lib/utils";
export default function Customers() {
  const [rows, setRows] = useState([]),
    [summary, setSummary] = useState(null),
    [pagination, setPagination] = useState({}),
    [page, setPage] = useState(1),
    [filters, setFilters] = useState({ search: "", status: "" }),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null);
  const load = () =>
    Promise.all([
      api.customers.list({ page, limit: 30, ...filters }),
      api.customers.summary(filters.status ? { status: filters.status } : {}),
    ])
      .then(([r, s]) => {
        setRows(r?.customers || []);
        setPagination(r?.pagination || {});
        setSummary(s?.summary || s);
      })
      .catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
  }, [page, filters.search, filters.status]);
  const form = useForm({
    defaultValues: {
      name: "",
      phoneNumber: "",
      email: "",
      address: "",
      notes: "",
      status: "active",
    },
  });
  const submit = async (d) => {
    try {
      if (editing) await api.customers.update(editing._id, d);
      else await api.customers.create(d);
      toast.success(editing ? "Customer updated." : "Customer created.");
      setOpen(false);
      setEditing(null);
      form.reset();
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const edit = (r) => {
    setEditing(r);
    form.reset(r);
    setOpen(true);
  };
  const remove = async (id) => {
    if (!confirm("Deactivate this customer?")) return;
    try {
      await api.customers.remove(id);
      toast.success("Customer deactivated.");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <AdminLayout
      title="Customers"
      description="Maintain customer records for the sales workflow"
    >
      <PageHeader
        eyebrow="Business"
        title="Customers"
        description="Keep repeat buyers and contacts organized."
        action={{
          label: "Add customer",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            setEditing(null);
            form.reset();
            setOpen(true);
          },
        }}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Customers"
          value={formatNumber(summary?.totalCustomers)}
          icon={UsersRound}
        />
        <MetricCard
          label="Active"
          value={formatNumber(summary?.activeCustomers)}
          icon={UsersRound}
        />
        <MetricCard
          label="Inactive"
          value={formatNumber(summary?.inactiveCustomers)}
          icon={UsersRound}
        />
      </div>
      <Card className="mt-5 p-5">
        <div className="mb-5 flex gap-2">
          <Input
            value={filters.search}
            onChange={(e) =>
              setFilters((v) => ({ ...v, search: e.target.value }))
            }
            placeholder="Search customers..."
          />
          <Select
            value={filters.status}
            onChange={(e) =>
              setFilters((v) => ({ ...v, status: e.target.value }))
            }
            className="w-40"
          >
            <option value="">All</option>
            <option>active</option>
            <option>inactive</option>
          </Select>
        </div>
        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Email</TH>
                <TH>Address</TH>
                <TH>Status</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r._id}>
                  <TD className="font-bold">{r.name}</TD>
                  <TD>{r.phoneNumber || "—"}</TD>
                  <TD>{r.email || "—"}</TD>
                  <TD className="max-w-xs truncate">{r.address || "—"}</TD>
                  <TD>
                    <StatusBadge status={r.status} />
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => edit(r)}
                      >
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
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <div className="py-14 text-center text-sm text-[var(--muted)]">
            No customers found.
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
        title={editing ? "Edit customer" : "Add customer"}
      >
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <Label required>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...form.register("phoneNumber")} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div>
            <Label>Status</Label>
            <Select {...form.register("status")}>
              <option>active</option>
              <option>inactive</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input {...form.register("address")} />
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editing ? "Save changes" : "Create customer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
