"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Trash2,
  Edit3,
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
import { StatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

import { api } from "@/lib/api";
import { ACTIVITY_TYPES, ACTIVITY_PERIODS } from "@/lib/constants";

import {
  formatDate,
  formatNumber,
  labelize,
  pondName,
  toInputDate,
} from "@/lib/utils";

import { toast } from "sonner";

export default function Activities() {
  const [rows, setRows] = useState([]);
  const [ponds, setPonds] = useState([]);

  const [summary, setSummary] = useState({
    totalActivities: 0,
    completedActivities: 0,
    pendingActivities: 0,
    byType: [],
    byPeriod: [],
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    pages: 0,
  });

  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    type: "",
    period: "",
    completed: "",
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const form = useForm({
    defaultValues: {
      date: toInputDate(),
      time: "08:00",
      period: "morning",
      type: "feeding",
      pond: "",
      title: "",
      notes: "",
      completed: "true",
    },
  });

  /*
   * ---------------------------------------------------------
   * LOAD ACTIVITIES + TODAY'S SUMMARY
   * ---------------------------------------------------------
   */
  const load = useCallback(async () => {
    try {
      const [activitiesResult, summaryResult] = await Promise.all([
        api.activities.list({
          page,
          limit: 30,
          ...filters,
        }),

        api.activities.summary({
          date: toInputDate(),
        }),
      ]);

      /*
       * Activities endpoint:
       *
       * {
       *   activities: [],
       *   pagination: {}
       * }
       */
      setRows(
        Array.isArray(activitiesResult?.activities)
          ? activitiesResult.activities
          : [],
      );

      setPagination(
        activitiesResult?.pagination || {
          page,
          limit: 30,
          total: 0,
          pages: 0,
        },
      );

      /*
       * IMPORTANT:
       *
       * Backend controller returns:
       *
       * data: {
       *   summary: {
       *     totalActivities,
       *     completedActivities,
       *     pendingActivities
       *   }
       * }
       *
       * apiClient.unwrap() removes the outer `data`,
       * therefore summaryResult is:
       *
       * {
       *   summary: {...}
       * }
       *
       * We need the nested summary object.
       */
      setSummary(
        summaryResult?.summary || {
          totalActivities: 0,
          completedActivities: 0,
          pendingActivities: 0,
          byType: [],
          byPeriod: [],
        },
      );
    } catch (error) {
      toast.error(error?.message || "Unable to load daily activities.");
    }
  }, [page, filters]);

  /*
   * ---------------------------------------------------------
   * LOAD PONDS
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let mounted = true;

    const loadPonds = async () => {
      try {
        const result = await api.ponds.list({
          limit: 100,
        });

        if (!mounted) {
          return;
        }

        setPonds(Array.isArray(result?.ponds) ? result.ponds : []);
      } catch (error) {
        if (mounted) {
          toast.error(error?.message || "Unable to load ponds.");
        }
      }
    };

    loadPonds();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD PAGE DATA
   * ---------------------------------------------------------
   */
  useEffect(() => {
    load();
  }, [load]);

  /*
   * ---------------------------------------------------------
   * RESET FORM
   * ---------------------------------------------------------
   */
  const resetForm = () => {
    form.reset({
      date: toInputDate(),
      time: "08:00",
      period: "morning",
      type: "feeding",
      pond: "",
      title: "",
      notes: "",
      completed: "true",
    });
  };

  /*
   * ---------------------------------------------------------
   * OPEN CREATE DIALOG
   * ---------------------------------------------------------
   */
  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  /*
   * ---------------------------------------------------------
   * SUBMIT
   * ---------------------------------------------------------
   */
  const submit = async (data) => {
    try {
      const payload = {
        ...data,

        completed: data.completed === true || data.completed === "true",

        pond: data.pond || null,
      };

      if (editing) {
        await api.activities.update(editing._id, payload);

        toast.success("Activity updated successfully.");
      } else {
        await api.activities.create(payload);

        toast.success("Activity recorded successfully.");
      }

      setOpen(false);
      setEditing(null);
      resetForm();

      /*
       * Reload both:
       *
       * 1. Activity table
       * 2. Today's summary cards
       */
      await load();
    } catch (error) {
      toast.error(error?.message || "Unable to save activity.");
    }
  };

  /*
   * ---------------------------------------------------------
   * EDIT
   * ---------------------------------------------------------
   */
  const edit = (activity) => {
    setEditing(activity);

    form.reset({
      date: toInputDate(activity.date),

      time: activity.time || "08:00",

      period: activity.period || "morning",

      type: activity.type || "other",

      pond: activity.pond?._id || activity.pond || "",

      title: activity.title || "",

      notes: activity.notes || "",

      completed: activity.completed ? "true" : "false",
    });

    setOpen(true);
  };

  /*
   * ---------------------------------------------------------
   * DELETE
   * ---------------------------------------------------------
   */
  const remove = async (id) => {
    const confirmed = window.confirm("Delete this activity?");

    if (!confirmed) {
      return;
    }

    try {
      await api.activities.remove(id);

      toast.success("Activity deleted successfully.");

      /*
       * Reload table and summary.
       */
      await load();
    } catch (error) {
      toast.error(error?.message || "Unable to delete activity.");
    }
  };

  return (
    <AdminLayout
      title="Daily Activities"
      description="Capture the rhythm of work across the farm"
    >
      <PageHeader
        eyebrow="Operations"
        title="Daily activities"
        description="A simple operational timeline for everything that happens between stocking and sale."
        action={{
          label: "Add activity",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreate,
        }}
      />

      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Today"
          value={formatNumber(summary.totalActivities)}
          sub="activities"
          icon={CalendarCheck}
        />

        <MetricCard
          label="Completed"
          value={formatNumber(summary.completedActivities)}
          sub="done today"
          icon={CheckCircle2}
        />

        <MetricCard
          label="Pending"
          value={formatNumber(summary.pendingActivities)}
          sub="needs attention"
          icon={Clock3}
        />
      </div>

      {/* =====================================================
          ACTIVITIES TABLE
          ===================================================== */}
      <Card className="mt-5 p-5">
        <div className="mb-5 flex flex-wrap gap-2">
          <Select
            value={filters.type}
            onChange={(event) => {
              setPage(1);

              setFilters((current) => ({
                ...current,
                type: event.target.value,
              }));
            }}
            className="w-auto min-w-40"
          >
            <option value="">All types</option>

            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {labelize(type)}
              </option>
            ))}
          </Select>

          <Select
            value={filters.period}
            onChange={(event) => {
              setPage(1);

              setFilters((current) => ({
                ...current,
                period: event.target.value,
              }));
            }}
            className="w-auto min-w-36"
          >
            <option value="">All periods</option>

            {ACTIVITY_PERIODS.map((period) => (
              <option key={period} value={period}>
                {labelize(period)}
              </option>
            ))}
          </Select>

          <Select
            value={filters.completed}
            onChange={(event) => {
              setPage(1);

              setFilters((current) => ({
                ...current,
                completed: event.target.value,
              }));
            }}
            className="w-auto min-w-36"
          >
            <option value="">All states</option>

            <option value="true">Completed</option>

            <option value="false">Pending</option>
          </Select>
        </div>

        {rows.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Activity</TH>
                <TH>Pond</TH>
                <TH>Period</TH>
                <TH>State</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>

            <TBody>
              {rows.map((activity) => (
                <TR key={activity._id}>
                  <TD>
                    {formatDate(activity.date)}

                    <div className="text-xs text-slate-400">
                      {activity.time || "—"}
                    </div>
                  </TD>

                  <TD>
                    <div className="font-bold">{activity.title}</div>

                    <div className="text-xs text-[var(--muted)]">
                      {labelize(activity.type)}
                    </div>
                  </TD>

                  <TD>
                    {activity.pond ? pondName(activity.pond) : "General farm"}
                  </TD>

                  <TD>{labelize(activity.period)}</TD>

                  <TD>
                    <StatusBadge
                      status={activity.completed ? "completed" : "pending"}
                    />
                  </TD>

                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => edit(activity)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(activity._id)}
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
            No activities match your filters.
          </div>
        )}

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          onChange={setPage}
        />
      </Card>

      {/* =====================================================
          CREATE / EDIT DIALOG
          ===================================================== */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit activity" : "Record daily activity"}
        description="Use this for operational events that deserve a simple, timestamped record."
      >
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <Label required>Date</Label>

            <Input type="date" {...form.register("date")} />
          </div>

          <div>
            <Label>Time</Label>

            <Input type="time" {...form.register("time")} />
          </div>

          <div>
            <Label required>Type</Label>

            <Select {...form.register("type")}>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {labelize(type)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Period</Label>

            <Select {...form.register("period")}>
              {ACTIVITY_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {labelize(period)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Pond</Label>

            <Select {...form.register("pond")}>
              <option value="">General farm</option>

              {ponds.map((pond) => (
                <option key={pond._id} value={pond._id}>
                  {pond.name} · #{pond.pondNumber}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Completion status</Label>

            <Select {...form.register("completed")}>
              <option value="true">Completed</option>

              <option value="false">Pending</option>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label required>Title</Label>

            <Input
              {...form.register("title")}
              placeholder="e.g. Morning feeding completed"
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Notes</Label>

            <textarea
              {...form.register("notes")}
              className="min-h-28 w-full rounded-xl border bg-transparent p-3 text-sm outline-none"
              placeholder="Add any useful operational notes..."
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
              {editing ? "Save changes" : "Record activity"}
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
