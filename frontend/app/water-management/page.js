"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Plus,
  Droplets,
  Settings2,
  Power,
  CalendarClock,
  Gauge,
  Waves,
} from "lucide-react";

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

import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui/table";

import { Pagination } from "@/components/shared/pagination";

import { api } from "@/lib/api";

import {
  formatDate,
  formatNumber,
  pondName,
  toInputDate,
  labelize,
  getErrorMessage,
} from "@/lib/utils";

import { toast } from "sonner";

import { useForm } from "react-hook-form";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const DEFAULT_NEXT_CHANGE =
  toInputDate(
    Date.now() + 7 * 86400000,
  );

const defaultWaterFormValues = {
  pond: "",

  nextWaterChange:
    DEFAULT_NEXT_CHANGE,

  waterCondition: "normal",

  waterLevel: "normal",

  pumpStatus: "working",

  electricityStatus: "available",

  waterChangeNotes: "",
};

const defaultChangeFormValues = {
  nextWaterChange:
    DEFAULT_NEXT_CHANGE,

  waterCondition: "normal",

  waterLevel: "normal",

  pumpStatus: "working",

  electricityStatus: "available",

  waterChangeNotes: "",
};

/*
|--------------------------------------------------------------------------
| Error Helper
|--------------------------------------------------------------------------
*/

const applyServerErrors = (
  error,
  form,
) => {
  const errors = Array.isArray(
    error?.errors,
  )
    ? error.errors
    : [];

  if (!errors.length) {
    return;
  }

  errors.forEach((item) => {
    if (!item?.field) {
      return;
    }

    form.setError(item.field, {
      type: "server",
      message:
        item.message ||
        "Please check this field.",
    });
  });
};

/*
|--------------------------------------------------------------------------
| Main Page
|--------------------------------------------------------------------------
*/

export default function Water() {
  const [rows, setRows] =
    useState([]);

  const [summary, setSummary] =
    useState(null);

  const [ponds, setPonds] =
    useState([]);

  const [page, setPage] =
    useState(1);

  const [pond, setPond] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [changeId, setChangeId] =
    useState(null);

  const [pagination, setPagination] =
    useState({});

  /*
   * ---------------------------------------------------------
   * Forms
   * ---------------------------------------------------------
   */

  const form = useForm({
    defaultValues:
      defaultWaterFormValues,

    mode: "onSubmit",
  });

  const changeForm = useForm({
    defaultValues:
      defaultChangeFormValues,

    mode: "onSubmit",
  });

  /*
   * ---------------------------------------------------------
   * Load Water Records
   * ---------------------------------------------------------
   */

  const load = async () => {
    try {
      const [
        recordsResponse,
        summaryResponse,
      ] = await Promise.all([
        api.water.list({
          page,
          limit: 30,
          pond,
          status,
        }),

        api.water.summary(),
      ]);

      setRows(
        recordsResponse?.records ||
          [],
      );

      setPagination(
        recordsResponse?.pagination ||
          {},
      );

      /*
       * Backend returns:
       *
       * {
       *   summary: {...}
       * }
       */
      setSummary(
        summaryResponse?.summary ||
          null,
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error),
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * Load Ponds
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    api.ponds
      .list({
        limit: 100,
      })
      .then((response) => {
        if (!mounted) {
          return;
        }

        setPonds(
          response?.ponds || [],
        );
      })
      .catch(() => {
        if (mounted) {
          setPonds([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * Reload Records
   * ---------------------------------------------------------
   */

  useEffect(() => {
    load();
  }, [page, pond, status]);

  /*
   * ---------------------------------------------------------
   * Open Create Dialog
   * ---------------------------------------------------------
   */

  const openCreate = () => {
    form.reset({
      ...defaultWaterFormValues,

      nextWaterChange:
        toInputDate(
          Date.now() +
            7 * 86400000,
        ),
    });

    setOpen(true);
  };

  /*
   * ---------------------------------------------------------
   * Create / Update Initial Record
   * ---------------------------------------------------------
   */

  const submit = async (data) => {
    try {
      await api.water.create({
        pond: data.pond,

        nextWaterChange:
          data.nextWaterChange || null,

        waterCondition:
          data.waterCondition,

        waterLevel:
          data.waterLevel,

        pumpStatus:
          data.pumpStatus,

        electricityStatus:
          data.electricityStatus,

        waterChangeNotes:
          data.waterChangeNotes?.trim() ||
          "",
      });

      toast.success(
        "Water-management record saved.",
      );

      setOpen(false);

      form.reset(
        defaultWaterFormValues,
      );

      await load();
    } catch (error) {
      applyServerErrors(
        error,
        form,
      );

      toast.error(
        getErrorMessage(error),
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * Open Record Change Dialog
   * ---------------------------------------------------------
   */

  const openChangeDialog = (
    record,
  ) => {
    setChangeId(record._id);

    changeForm.reset({
      nextWaterChange:
        toInputDate(
          record.nextWaterChange ||
            Date.now() +
              7 * 86400000,
        ),

      waterCondition:
        record.waterCondition ||
        "normal",

      waterLevel:
        record.waterLevel ||
        "normal",

      pumpStatus:
        record.pumpStatus ||
        "working",

      electricityStatus:
        record.electricityStatus ||
        "available",

      waterChangeNotes:
        record.waterChangeNotes ||
        "",
    });
  };

  /*
   * ---------------------------------------------------------
   * Record Actual Water Change
   * ---------------------------------------------------------
   */

  const recordChange = async (
    data,
  ) => {
    try {
      await api.water.recordChange(
        changeId,
        {
          nextWaterChange:
            data.nextWaterChange ||
            null,

          waterCondition:
            data.waterCondition,

          waterLevel:
            data.waterLevel,

          pumpStatus:
            data.pumpStatus,

          electricityStatus:
            data.electricityStatus,

          waterChangeNotes:
            data.waterChangeNotes?.trim() ||
            "",
        },
      );

      toast.success(
        "Water change recorded successfully.",
      );

      setChangeId(null);

      changeForm.reset(
        defaultChangeFormValues,
      );

      await load();
    } catch (error) {
      applyServerErrors(
        error,
        changeForm,
      );

      toast.error(
        getErrorMessage(error),
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <AdminLayout
      title="Water Management"
      description="Keep pond water, water-change schedules and essential equipment under control."
    >
      <PageHeader
        eyebrow="Water care"
        title="Water management"
        description="A simple pond-level view of water changes, water condition, pump readiness and power availability."
        action={{
          label: "Add water record",
          icon: (
            <Plus className="h-4 w-4" />
          ),
          onClick: openCreate,
        }}
      />

      {/*
       * -------------------------------------------------------
       * Metrics
       * -------------------------------------------------------
       */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Ponds monitored"
          value={formatNumber(
            summary?.total,
          )}
          icon={Droplets}
        />

        <MetricCard
          label="Due today"
          value={formatNumber(
            summary?.due,
          )}
          icon={CalendarClock}
        />

        <MetricCard
          label="Overdue"
          value={formatNumber(
            summary?.overdue,
          )}
          icon={CalendarClock}
        />

        <MetricCard
          label="Pump attention"
          value={formatNumber(
            summary?.pumpAttention,
          )}
          icon={Settings2}
        />

        <MetricCard
          label="Power issues"
          value={formatNumber(
            summary?.electricityAttention,
          )}
          icon={Power}
        />
      </div>

      {/*
       * -------------------------------------------------------
       * Records
       * -------------------------------------------------------
       */}

      <Card className="mt-5 p-5">
        <div className="mb-5 flex flex-wrap gap-3">
          <Select
            value={pond}
            onChange={(event) => {
              setPage(1);
              setPond(
                event.target.value,
              );
            }}
            className="w-auto min-w-52"
          >
            <option value="">
              All ponds
            </option>

            {ponds.map((item) => (
              <option
                key={item._id}
                value={item._id}
              >
                {item.name} · #
                {item.pondNumber}
              </option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(
                event.target.value,
              );
            }}
            className="w-auto min-w-40"
          >
            <option value="">
              All schedules
            </option>

            <option value="overdue">
              Overdue
            </option>

            <option value="due">
              Due today
            </option>

            <option value="upcoming">
              Upcoming
            </option>
          </Select>
        </div>

        {rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Pond</TH>

                  <TH>
                    Last change
                  </TH>

                  <TH>
                    Next change
                  </TH>

                  <TH>
                    Schedule
                  </TH>

                  <TH>
                    Water condition
                  </TH>

                  <TH>
                    Water level
                  </TH>

                  <TH>
                    Pump
                  </TH>

                  <TH>
                    Power
                  </TH>

                  <TH className="text-right">
                    Action
                  </TH>
                </TR>
              </THead>

              <TBody>
                {rows.map((record) => (
                  <TR
                    key={record._id}
                  >
                    <TD className="font-bold">
                      {pondName(
                        record.pond,
                      )}
                    </TD>

                    <TD>
                      {formatDate(
                        record.lastWaterChange,
                      )}
                    </TD>

                    <TD>
                      {formatDate(
                        record.nextWaterChange,
                      )}
                    </TD>

                    <TD>
                      <StatusBadge
                        status={
                          record.waterChangeStatus
                        }
                      />
                    </TD>

                    <TD>
                      <StatusBadge
                        status={
                          record.waterCondition ||
                          "normal"
                        }
                      />
                    </TD>

                    <TD>
                      <StatusBadge
                        status={
                          record.waterLevel ||
                          "normal"
                        }
                      />
                    </TD>

                    <TD>
                      <StatusBadge
                        status={
                          record.pumpStatus
                        }
                      />
                    </TD>

                    <TD>
                      <StatusBadge
                        status={
                          record.electricityStatus
                        }
                      />
                    </TD>

                    <TD className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          openChangeDialog(
                            record,
                          )
                        }
                      >
                        Record change
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : (
          <div className="py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted-bg)]">
              <Waves className="h-6 w-6" />
            </div>

            <p className="font-semibold">
              No water-management
              records yet.
            </p>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Add a water record for
              each active pond you want
              to monitor.
            </p>
          </div>
        )}

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          onChange={setPage}
        />
      </Card>

      {/*
       * -------------------------------------------------------
       * CREATE DIALOG
       * -------------------------------------------------------
       */}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add water management record"
        description="Record only the practical water and equipment information you can observe on the farm."
      >
        <WaterForm
          form={form}
          ponds={ponds}
          onSubmit={submit}
          onCancel={() =>
            setOpen(false)
          }
        />
      </Dialog>

      {/*
       * -------------------------------------------------------
       * WATER CHANGE DIALOG
       * -------------------------------------------------------
       */}

      <Dialog
        open={Boolean(changeId)}
        onOpenChange={(value) => {
          if (!value) {
            setChangeId(null);
          }
        }}
        title="Record a water change"
        description="The system automatically records today as the actual water-change date."
      >
        <WaterChangeForm
          form={changeForm}
          onSubmit={recordChange}
          onCancel={() =>
            setChangeId(null)
          }
        />
      </Dialog>
    </AdminLayout>
  );
}

/*
|--------------------------------------------------------------------------
| Field Error
|--------------------------------------------------------------------------
*/

function FieldError({
  message,
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1.5 text-xs font-medium text-red-500">
      {message}
    </p>
  );
}

/*
|--------------------------------------------------------------------------
| Water Form
|--------------------------------------------------------------------------
*/

function WaterForm({
  form,
  ponds,
  onSubmit,
  onCancel,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form
      onSubmit={handleSubmit(
        onSubmit,
      )}
      className="grid gap-5 sm:grid-cols-2"
    >
      <div>
        <Label
          htmlFor="water-pond"
          required
        >
          Pond
        </Label>

        <Select
          id="water-pond"
          {...register("pond", {
            required:
              "Please select a pond.",
          })}
          className={
            errors.pond
              ? "border-red-500"
              : ""
          }
        >
          <option value="">
            Select pond
          </option>

          {ponds.map((pond) => (
            <option
              key={pond._id}
              value={pond._id}
            >
              {pond.name} · #
              {pond.pondNumber}
            </option>
          ))}
        </Select>

        <FieldError
          message={
            errors.pond?.message
          }
        />
      </div>

      <div>
        <Label htmlFor="next-water-change">
          Next water change
        </Label>

        <Input
          id="next-water-change"
          type="date"
          {...register(
            "nextWaterChange",
          )}
          className={
            errors.nextWaterChange
              ? "border-red-500"
              : ""
          }
        />

        <FieldError
          message={
            errors.nextWaterChange
              ?.message
          }
        />
      </div>

      <div>
        <Label htmlFor="water-condition">
          Water condition
        </Label>

        <Select
          id="water-condition"
          {...register(
            "waterCondition",
          )}
        >
          <option value="normal">
            Normal
          </option>

          <option value="cloudy">
            Cloudy
          </option>

          <option value="dirty">
            Dirty
          </option>

          <option value="algae">
            Algae present
          </option>
        </Select>
      </div>

      <div>
        <Label htmlFor="water-level">
          Water level
        </Label>

        <Select
          id="water-level"
          {...register("waterLevel")}
        >
          <option value="normal">
            Normal
          </option>

          <option value="low">
            Low
          </option>

          <option value="high">
            High
          </option>
        </Select>
      </div>

      <div>
        <Label htmlFor="pump-status">
          Pump status
        </Label>

        <Select
          id="pump-status"
          {...register("pumpStatus")}
        >
          <option value="working">
            Working
          </option>

          <option value="maintenance">
            Maintenance
          </option>

          <option value="faulty">
            Faulty
          </option>

          <option value="not_applicable">
            Not applicable
          </option>
        </Select>
      </div>

      <div>
        <Label htmlFor="electricity-status">
          Electricity / power
        </Label>

        <Select
          id="electricity-status"
          {...register(
            "electricityStatus",
          )}
        >
          <option value="available">
            Available
          </option>

          <option value="unavailable">
            Unavailable
          </option>

          <option value="generator">
            Generator
          </option>

          <option value="solar">
            Solar
          </option>
        </Select>
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="water-change-notes">
          Water / change note
        </Label>

        <textarea
          id="water-change-notes"
          {...register(
            "waterChangeNotes",
          )}
          placeholder="Example: Water looks normal. Removed some dirty water and refilled the pond."
          className={`min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--primary)] ${
            errors.waterChangeNotes
              ? "border-red-500"
              : "border-[var(--border)]"
          }`}
        />

        <FieldError
          message={
            errors.waterChangeNotes
              ?.message
          }
        />
      </div>

      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button type="submit">
          Save record
        </Button>
      </div>
    </form>
  );
}

/*
|--------------------------------------------------------------------------
| Water Change Form
|--------------------------------------------------------------------------
*/

function WaterChangeForm({
  form,
  onSubmit,
  onCancel,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form
      onSubmit={handleSubmit(
        onSubmit,
      )}
      className="grid gap-5 sm:grid-cols-2"
    >
      <div>
        <Label htmlFor="change-next-water-change">
          Next water change
        </Label>

        <Input
          id="change-next-water-change"
          type="date"
          {...register(
            "nextWaterChange",
          )}
          className={
            errors.nextWaterChange
              ? "border-red-500"
              : ""
          }
        />

        <FieldError
          message={
            errors.nextWaterChange
              ?.message
          }
        />
      </div>

      <div>
        <Label htmlFor="change-water-condition">
          Water condition
        </Label>

        <Select
          id="change-water-condition"
          {...register(
            "waterCondition",
          )}
        >
          <option value="normal">
            Normal
          </option>

          <option value="cloudy">
            Cloudy
          </option>

          <option value="dirty">
            Dirty
          </option>

          <option value="algae">
            Algae present
          </option>
        </Select>
      </div>

      <div>
        <Label htmlFor="change-water-level">
          Water level
        </Label>

        <Select
          id="change-water-level"
          {...register("waterLevel")}
        >
          <option value="normal">
            Normal
          </option>

          <option value="low">
            Low
          </option>

          <option value="high">
            High
          </option>
        </Select>
      </div>

      <div>
        <Label htmlFor="change-pump-status">
          Pump status
        </Label>

        <Select
          id="change-pump-status"
          {...register("pumpStatus")}
        >
          <option value="working">
            Working
          </option>

          <option value="maintenance">
            Maintenance
          </option>

          <option value="faulty">
            Faulty
          </option>

          <option value="not_applicable">
            Not applicable
          </option>
        </Select>
      </div>

      <div>
        <Label htmlFor="change-electricity-status">
          Electricity / power
        </Label>

        <Select
          id="change-electricity-status"
          {...register(
            "electricityStatus",
          )}
        >
          <option value="available">
            Available
          </option>

          <option value="unavailable">
            Unavailable
          </option>

          <option value="generator">
            Generator
          </option>

          <option value="solar">
            Solar
          </option>
        </Select>
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="change-water-notes">
          Water / change note
        </Label>

        <textarea
          id="change-water-notes"
          {...register(
            "waterChangeNotes",
          )}
          placeholder="Example: Changed part of the pond water and refilled with clean water."
          className={`min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--primary)] ${
            errors.waterChangeNotes
              ? "border-red-500"
              : "border-[var(--border)]"
          }`}
        />

        <FieldError
          message={
            errors.waterChangeNotes
              ?.message
          }
        />
      </div>

      <div className="sm:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-3 text-sm">
        <p className="font-semibold">
          Last water change
        </p>

        <p className="mt-1 text-[var(--muted)]">
          The system will automatically
          record today as the actual
          water-change date when you
          save this record.
        </p>
      </div>

      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button type="submit">
          Record water change
        </Button>
      </div>
    </form>
  );
}