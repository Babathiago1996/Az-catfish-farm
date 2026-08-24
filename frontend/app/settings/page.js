"use client";
import { useEffect, useRef, useState } from "react";
import {
  Save,
  UserRound,
  Building2,
  Bell,
  Utensils,
  LockKeyhole,
  UploadCloud,
  Trash2,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useAuth } from "@/providers/auth-provider";
const tabs = [
  ["profile", "Profile", UserRound],
  ["farm", "Farm", Building2],
  ["notifications", "Notifications", Bell],
  ["feeding", "Feeding schedule", Utensils],
  ["security", "Security", LockKeyhole],
];
export default function Settings() {
  const [tab, setTab] = useState("profile");
  const [settings, setSettings] = useState(null);
  const { setAdmin } = useAuth();
  useEffect(() => {
    api.settings
      .all()
      .then((r) => setSettings(r?.settings))
      .catch((e) => toast.error(e.message));
  }, []);
  return (
    <AdminLayout
      title="Settings"
      description="Configure your farm identity, account and operating preferences"
    >
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="A focused control room for the farm and administrator account."
      />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          <nav className="grid gap-1">
            {tabs.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${tab === id ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </Card>
        <div>
          {tab === "profile" && (
            <ProfileTab
              settings={settings}
              setSettings={setSettings}
              setAdmin={setAdmin}
            />
          )}{" "}
          {tab === "farm" && (
            <FarmTab settings={settings} setSettings={setSettings} />
          )}{" "}
          {tab === "notifications" && (
            <NotificationsTab settings={settings} setSettings={setSettings} />
          )}{" "}
          {tab === "feeding" && (
            <FeedingTab settings={settings} setSettings={setSettings} />
          )}{" "}
          {tab === "security" && <SecurityTab settings={settings} />}
        </div>
      </div>
    </AdminLayout>
  );
}
function ProfileTab({ settings, setSettings, setAdmin }) {
  const p = settings?.adminProfile;
  const form = useForm({
    values: { name: p?.name || "", phone: p?.phone || "", bio: p?.bio || "" },
  });
  const file = useRef();
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /*
   * Fix: previously submit() only called setAdmin(), which
   * updates the global header/auth context but never the
   * local `settings` state this tab hydrates its form from.
   * Since switching tabs unmounts/remounts this component,
   * the form would re-read the *stale* settings.adminProfile
   * on return, making a successfully saved name look like it
   * had reverted. Calling setSettings here keeps both in sync.
   */
  const submit = async (d) => {
    try {
      const r = await api.settings.updateProfile(d);
      setAdmin(r?.profile);
      setSettings((v) => ({ ...v, adminProfile: r?.profile }));
      toast.success("Profile updated.");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onFileChange = () => {
    const f = file.current?.files?.[0];

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(f ? URL.createObjectURL(f) : null);
  };

  const upload = async () => {
    const f = file.current?.files?.[0];
    if (!f) return toast.error("Choose an image first.");

    setUploadingAvatar(true);

    try {
      const fd = new FormData();
      fd.append("image", f);
      const r = await api.settings.uploadAvatar(fd);
      setAdmin(r?.profile);
      setSettings((v) => ({ ...v, adminProfile: r?.profile }));
      toast.success("Avatar updated.");

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);
      if (file.current) file.current.value = "";
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayedAvatar = avatarPreview || p?.avatar?.url || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Administrator profile</CardTitle>
        <CardDescription>
          Keep the identity shown across the management portal current.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...form.register("phone")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Bio</Label>
            <textarea
              {...form.register("bio")}
              className="min-h-28 w-full rounded-xl border bg-transparent p-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save profile
                </>
              )}
            </Button>
          </div>
        </form>
        <div className="mt-8 rounded-2xl border border-dashed p-5">
          <div className="flex items-center gap-4">
            {displayedAvatar ? (
              <img
                src={displayedAvatar}
                alt="Administrator avatar"
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <UploadCloud className="h-6 w-6" />
              </div>
            )}
            <div>
              <div className="font-bold">Administrator avatar</div>
              <div className="text-xs text-[var(--muted)]">
                Choose an image below — it previews here immediately, then click
                Upload to save it.
              </div>
            </div>
          </div>
          <input
            ref={file}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="mt-4 block text-xs"
          />
          <Button
            variant="outline"
            className="mt-3"
            onClick={upload}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" /> Upload avatar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
function FarmTab({ settings, setSettings }) {
  const f = settings?.farm;
  const form = useForm({
    values: {
      farmName: f?.farmName || "",
      email: f?.email || "",
      phone: f?.phone || "",
      address: f?.address || "",
      about: f?.about || "",
      waterChangeIntervalDays: f?.waterChangeIntervalDays || 7,
      currency: f?.currency || "NGN",
      timeZone: f?.timeZone || "Africa/Lagos",
      facebook: f?.socialLinks?.facebook || "",
      instagram: f?.socialLinks?.instagram || "",
      whatsapp: f?.socialLinks?.whatsapp || "",
      tiktok: f?.socialLinks?.tiktok || "",
      youtube: f?.socialLinks?.youtube || "",
      twitter: f?.socialLinks?.twitter || "",
    },
  });
  const file = useRef();
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);

  const submit = async (d) => {
    try {
      const r = await api.settings.updateFarm({
        ...d,
        socialLinks: {
          facebook: d.facebook,
          instagram: d.instagram,
          whatsapp: d.whatsapp,
          tiktok: d.tiktok,
          youtube: d.youtube,
          twitter: d.twitter,
        },
        waterChangeIntervalDays: Number(d.waterChangeIntervalDays),
      });
      setSettings((v) => ({ ...v, farm: r?.farm || r }));
      toast.success("Farm settings updated.");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onFileChange = () => {
    const selected = file.current?.files?.[0];

    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoPreview(selected ? URL.createObjectURL(selected) : null);
  };

  const upload = async () => {
    const selected = file.current?.files?.[0];
    if (!selected) return toast.error("Choose a logo first.");

    setUploadingLogo(true);

    try {
      const fd = new FormData();
      fd.append("image", selected);
      const r = await api.settings.uploadFarmLogo(fd);
      setSettings((v) => ({
        ...v,
        farm: { ...v.farm, farmLogo: r?.farmLogo || r },
      }));
      toast.success("Farm logo updated.");

      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(null);
      if (file.current) file.current.value = "";
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const remove = async () => {
    setRemovingLogo(true);

    try {
      await api.settings.removeFarmLogo();
      setSettings((v) => ({
        ...v,
        farm: { ...v.farm, farmLogo: { url: "", publicId: "" } },
      }));
      toast.success("Farm logo removed.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRemovingLogo(false);
    }
  };

  const displayedLogo = logoPreview || f?.farmLogo?.url || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Farm identity</CardTitle>
        <CardDescription>
          These values feed the public website and internal settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <Label>Farm name</Label>
            <Input {...form.register("farmName")} />
          </div>
          <div>
            <Label>Public email</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...form.register("phone")} />
          </div>
          <div>
            <Label>Currency</Label>
            <Input {...form.register("currency")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input {...form.register("address")} />
          </div>
          <div className="sm:col-span-2">
            <Label>About</Label>
            <textarea
              {...form.register("about")}
              className="min-h-32 w-full rounded-xl border bg-transparent p-3 text-sm"
            />
          </div>
          <div>
            <Label>Water change interval (days)</Label>
            <Input
              type="number"
              min="1"
              {...form.register("waterChangeIntervalDays")}
            />
          </div>
          <div>
            <Label>Time zone</Label>
            <Input {...form.register("timeZone")} />
          </div>
          <div className="sm:col-span-2 grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <div className="text-sm font-bold">Social links</div>
            {[
              "facebook",
              "instagram",
              "whatsapp",
              "tiktok",
              "youtube",
              "twitter",
            ].map((k) => (
              <div key={k}>
                <Label>{k}</Label>
                <Input {...form.register(k)} />
              </div>
            ))}
          </div>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save farm settings
                </>
              )}
            </Button>
          </div>
        </form>
        <div className="mt-8 rounded-2xl border p-5">
          <div className="font-bold">Farm logo</div>
          {displayedLogo && (
            <img
              src={displayedLogo}
              alt="Farm logo"
              className="mt-4 h-24 w-24 rounded-2xl object-cover"
            />
          )}
          <input
            ref={file}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="mt-4 block text-xs"
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={upload}
              disabled={uploadingLogo || removingLogo}
            >
              {uploadingLogo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" /> Upload
                </>
              )}
            </Button>
            {f?.farmLogo?.url && (
              <Button
                variant="ghost"
                onClick={remove}
                disabled={uploadingLogo || removingLogo}
              >
                {removingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 text-red-500" /> Remove
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function NotificationsTab({ settings, setSettings }) {
  const n = settings?.farm?.notificationPreferences || {};
  const [values, setValues] = useState(n);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues(n), [settings]);
  const submit = async () => {
    setSaving(true);

    try {
      const result = await api.settings.updateNotifications(values);
      setSettings((v) => ({
        ...v,
        farm: { ...v.farm, notificationPreferences: result },
      }));
      toast.success("Notification preferences updated.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>
          Choose which reminders and alerts are enabled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-[var(--border)]">
          {Object.entries({
            emailNotifications: "Email notifications",
            inAppNotifications: "In-app notifications",
            waterChangeReminders: "Water change reminders",
            feedingReminders: "Feeding reminders",
            growthReminders: "Growth reminders",
            harvestReminders: "Harvest reminders",
            inventoryAlerts: "Inventory alerts",
            monthlyReportNotifications: "Monthly report notifications",
          }).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-[var(--muted)]">
                  Toggle this preference for the farm notification system.
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(values[key])}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.checked }))
                }
                className="h-5 w-5 accent-blue-600"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
function FeedingTab({ settings, setSettings }) {
  const schedule = settings?.farm?.feedingSchedule || {};
  const [v, setV] = useState(schedule);
  const [saving, setSaving] = useState(false);
  useEffect(() => setV(schedule), [settings]);
  const update = (period, key, val) =>
    setV((x) => ({ ...x, [period]: { ...x[period], [key]: val } }));
  const submit = async () => {
    setSaving(true);

    try {
      const result = await api.settings.updateFeedingSchedule(v);
      setSettings((x) => ({
        ...x,
        farm: { ...x.farm, feedingSchedule: result },
      }));
      toast.success("Feeding schedule updated.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feeding schedule</CardTitle>
        <CardDescription>
          Set the farm's routine feeding windows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {["morning", "afternoon", "evening"].map((period) => (
            <div key={period} className="rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold capitalize">{period}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {v[period]?.enabled ? "Enabled" : "Disabled"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(v[period]?.enabled)}
                  onChange={(e) => update(period, "enabled", e.target.checked)}
                  className="h-5 w-5 accent-blue-600"
                />
              </div>
              <div className="mt-4 max-w-xs">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={v[period]?.time || ""}
                  onChange={(e) => update(period, "time", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save schedule
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
function SecurityTab({ settings }) {
  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const submit = async (d) => {
    try {
      await api.settings.changePassword(d);
      toast.success("Password changed. Please sign in again.");
      form.reset();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Change the administrator password and review account security.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="max-w-xl space-y-5"
        >
          <div>
            <Label required>Current password</Label>
            <Input type="password" {...form.register("currentPassword")} />
          </div>
          <div>
            <Label required>New password</Label>
            <Input type="password" {...form.register("newPassword")} />
          </div>
          <div>
            <Label required>Confirm new password</Label>
            <Input type="password" {...form.register("confirmPassword")} />
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Changing...
              </>
            ) : (
              <>
                <LockKeyhole className="h-4 w-4" /> Change password
              </>
            )}
          </Button>
        </form>
        <div className="mt-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm leading-6">
            <strong>Session security:</strong> changing the password increments
            the backend session version, invalidating previous access tokens.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
