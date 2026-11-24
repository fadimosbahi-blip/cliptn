
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Campaign = {
  id: string;
  title: string;
  platform: string;
  budget_total: number;
  currency: string;
  status: string;
  created_at: string;
  ends_at: string;
};

type Submission = {
  id: string;
  campaign_id: string;
  campaign_title: string;
  clip_url: string;
  platform: string;
  status: string;
  submitted_at: string;
  review_notes: string | null;
  verified_views: number | null;
  reward_amount: number | null;
  reward_status: string | null;
};

type UserDetails = {
  profile: {
    id: string;
    email: string | null;
    full_name: string;
    role: "streamer" | "clipper";
    country: string;
    is_verified: boolean;
    verified_at: string | null;
    created_at: string;
    is_suspended: boolean;
    suspended_until: string | null;
    suspension_reason: string | null;
  };
  campaigns: Campaign[];
  submissions: Submission[];
};

type ModerationAction = {
  id: string;
  action: "suspended" | "reactivated";
  reason: string;
  duration_days: number | null;
  expires_at: string | null;
  created_at: string;
  admin_name: string;
};

function AdminUserDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [details, setDetails] = useState<UserDetails | null>(null);
  const [history, setHistory] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("7");
  const [saving, setSaving] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [moderationError, setModerationError] = useState("");

  const loadDetails = useCallback(async () => {
    const supabase = createClient();

    setLoading(true);
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const [
      { data: detailsData, error: detailsError },
      { data: historyData, error: historyError },
    ] = await Promise.all([
      supabase.rpc("admin_get_user_details", {
        p_user_id: userId,
      }),
      supabase.rpc("admin_get_moderation_history", {
        p_user_id: userId,
      }),
    ]);

    if (detailsError) {
      setError(detailsError.message);
      setLoading(false);
      return;
    }

    if (historyError) {
      setError(historyError.message);
      setLoading(false);
      return;
    }

    setDetails(detailsData as UserDetails);
    setHistory((historyData || []) as ModerationAction[]);
    setLoading(false);
  }, [userId, router]);

  useEffect(() => {
    if (userId) {
      loadDetails();
    }
  }, [userId, loadDetails]);

  const formatDate = (date: string | null) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return "—";

    return new Date(date).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMoney = (amount: number | null) =>
    `${Number(amount ?? 0).toFixed(3)} TND`;

  const statusStyle = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
      case "paid":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
      case "rejected":
      case "closed":
        return "border-red-500/20 bg-red-500/10 text-red-300";
      case "pending":
      case "draft":
      case "under_review":
        return "border-amber-500/20 bg-amber-500/10 text-amber-300";
      default:
        return "border-white/10 bg-white/5 text-gray-400";
    }
  };

  const isCurrentlySuspended = (profile: UserDetails["profile"]) => {
    if (!profile.is_suspended) return false;

    if (!profile.suspended_until) return true;

    return new Date(profile.suspended_until).getTime() > Date.now();
  };

  const handleModeration = async (suspend: boolean) => {
    if (!details) return;

    if (reason.trim().length < 5) {
      setModerationError("Please provide a reason of at least 5 characters.");
      return;
    }

    const confirmation = suspend
      ? "Are you sure you want to suspend this account?"
      : "Are you sure you want to reactivate this account?";

    if (!window.confirm(confirmation)) return;

    setSaving(true);
    setModerationError("");
    setModerationMessage("");

    const supabase = createClient();

    const { error: actionError } = await supabase.rpc(
      "admin_set_user_suspension",
      {
        p_user_id: userId,
        p_suspend: suspend,
        p_reason: reason.trim(),
        p_duration_days: suspend
          ? duration === "indefinite"
            ? null
            : Number(duration)
          : null,
      }
    );

    if (actionError) {
      setModerationError(actionError.message);
      setSaving(false);
      return;
    }

    setModerationMessage(
      suspend
        ? "Account suspension applied successfully."
        : "Account reactivated successfully."
    );

    setReason("");
    await loadDetails();
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08080d] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
          <p className="text-sm text-gray-400">
            Loading user details...
          </p>
        </div>
      </main>
    );
  }

  if (error || !details) {
    return (
      <main className="min-h-screen bg-[#08080d] px-5 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/20 bg-[#111119] p-8">
          <h1 className="text-xl font-bold">Unable to load user</h1>
          <p className="mt-3 text-sm text-red-300">
            {error || "User details could not be found."}
          </p>
          <button
            onClick={() => router.push("/admin/users")}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500"
          >
            Back to users
          </button>
        </div>
      </main>
    );
  }

  const user = details.profile;
  const suspended = isCurrentlySuspended(user);

  return (
    <main className="min-h-screen bg-[#08080d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1250px] px-5 py-8 sm:px-8 lg:px-12">
        <header className="mb-10">
          <Link
            href="/admin/users"
            className="text-sm text-gray-500 transition hover:text-white"
          >
            ← Back to user management
          </Link>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
              Administration / User details
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              User <span className="text-violet-400">Profile</span>
            </h1>
          </div>
        </header>

        {/* Profile */}
        <section className="mb-8 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-[#111119] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-2xl font-bold text-violet-300">
                {user.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  {user.full_name}
                </h2>
                <p className="mt-1 break-all text-sm text-gray-400">
                  {user.email || "No email"}
                </p>
                <p className="mt-2 text-xs capitalize text-violet-300">
                  {user.role} · {user.country}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  user.is_verified
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-gray-400"
                }`}
              >
                {user.is_verified ? "✓ Verified" : "Not verified"}
              </span>

              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold capitalize text-violet-300">
                {user.role}
              </span>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  suspended
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {suspended
                  ? "Suspended"
                  : user.is_suspended
                    ? "Suspension expired"
                    : "Account active"}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-5 border-t border-white/[0.07] pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Account created</p>
              <p className="mt-2 text-sm font-medium">
                {formatDate(user.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Verification date</p>
              <p className="mt-2 text-sm font-medium">
                {formatDate(user.verified_at)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">User ID</p>
              <p className="mt-2 break-all font-mono text-xs text-gray-400">
                {user.id}
              </p>
            </div>
          </div>
        </section>

        {/* Account moderation */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-red-500/15 bg-[#111119]">
          <div className="border-b border-white/[0.07] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                  Safety and enforcement
                </p>
                <h2 className="mt-2 text-xl font-bold">
                  Account moderation
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage restrictions on this ClipTN account.
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  suspended
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {suspended ? "Suspension active" : "No active suspension"}
              </span>
            </div>

            {user.is_suspended && (
              <div className="mt-6 rounded-xl border border-red-500/15 bg-red-500/[0.05] p-4">
                <p className="text-sm font-semibold text-red-300">
                  {suspended
                    ? "This account is currently suspended."
                    : "The suspension period has expired."}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  Original reason:{" "}
                  {user.suspension_reason || "No reason recorded"}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  {user.suspended_until
                    ? `Suspension expiry: ${formatDateTime(user.suspended_until)}`
                    : "Duration: Indefinite"}
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Moderation reason
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Explain why this moderation action is necessary..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/50"
                />
                <p className="mt-2 text-xs text-gray-600">
                  Minimum 5 characters. Maximum 2,000.
                </p>
              </div>

              <div className="flex flex-col justify-between gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Suspension duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#181821] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50"
                  >
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="indefinite">Indefinite</option>
                  </select>

                  <p className="mt-2 text-xs text-gray-500">
                    Indefinite suspensions remain until an administrator
                    reactivates the account.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleModeration(true)}
                    disabled={saving || suspended}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "Processing..." : "Suspend account"}
                  </button>

                  <button
                    onClick={() => handleModeration(false)}
                    disabled={saving || !user.is_suspended}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reactivate account
                  </button>
                </div>
              </div>
            </div>

            {moderationError && (
              <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                {moderationError}
              </p>
            )}

            {moderationMessage && (
              <p className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {moderationMessage}
              </p>
            )}
          </div>

          {/* Moderation history */}
          <div className="p-6 sm:p-8">
            <h3 className="font-semibold">Moderation history</h3>
            <p className="mt-1 text-xs text-gray-500">
              A record of every suspension and reactivation.
            </p>

            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No moderation actions have been recorded for this account.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          item.action === "suspended"
                            ? "border-red-500/20 bg-red-500/10 text-red-300"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {item.action === "suspended"
                          ? "Account suspended"
                          : "Account reactivated"}
                      </span>

                      <span className="text-xs text-gray-500">
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm text-gray-300">
                      {item.reason}
                    </p>

                    {item.action === "suspended" && (
                      <p className="mt-3 text-xs text-gray-500">
                        Duration:{" "}
                        {item.duration_days
                          ? `${item.duration_days} days`
                          : "Indefinite"}
                        {item.expires_at
                          ? ` · Expires ${formatDateTime(item.expires_at)}`
                          : ""}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-gray-600">
                      Action taken by: {item.admin_name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Activity statistics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-sm text-gray-500">Campaigns</p>
            <p className="mt-3 text-3xl font-bold">
              {details.campaigns.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-sm text-gray-500">Submissions</p>
            <p className="mt-3 text-3xl font-bold">
              {details.submissions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-sm text-gray-500">Approved clips</p>
            <p className="mt-3 text-3xl font-bold text-emerald-300">
              {details.submissions.filter(
                (submission) => submission.status === "approved"
              ).length}
            </p>
          </div>
        </section>

        {/* Streamer campaigns */}
        {user.role === "streamer" && (
          <section className="mb-8 rounded-2xl border border-white/[0.07] bg-[#111119] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Campaign history</h2>
              <p className="mt-1 text-sm text-gray-500">
                Campaigns created by this streamer.
              </p>
            </div>

            {details.campaigns.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                This user has not created any campaigns.
              </p>
            ) : (
              <div className="space-y-3">
                {details.campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {campaign.title}
                        </h3>
                        <p className="mt-2 text-xs text-gray-500">
                          {campaign.platform} · Created{" "}
                          {formatDate(campaign.created_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold capitalize ${statusStyle(
                          campaign.status
                        )}`}
                      >
                        {campaign.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-6 text-xs">
                      <div>
                        <p className="text-gray-500">Budget</p>
                        <p className="mt-1 font-semibold">
                          {Number(campaign.budget_total).toFixed(3)}{" "}
                          {campaign.currency}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Campaign ends</p>
                        <p className="mt-1 font-semibold">
                          {formatDate(campaign.ends_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Clipper submissions */}
        {user.role === "clipper" && (
          <section className="mb-8 rounded-2xl border border-white/[0.07] bg-[#111119] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Submission history</h2>
              <p className="mt-1 text-sm text-gray-500">
                Clips submitted by this user and their reward records.
              </p>
            </div>

            {details.submissions.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                This user has not submitted any clips.
              </p>
            ) : (
              <div className="space-y-4">
                {details.submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {submission.campaign_title}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {submission.platform} · Submitted{" "}
                          {formatDate(submission.submitted_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold capitalize ${statusStyle(
                          submission.status
                        )}`}
                      >
                        {submission.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <a
                      href={submission.clip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block break-all text-xs text-violet-300 transition hover:text-violet-200"
                    >
                      Open submitted clip ↗
                    </a>

                    <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-gray-500">
                          Verified views
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {Number(
                            submission.verified_views ?? 0
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Calculated reward
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatMoney(submission.reward_amount)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Reward status
                        </p>
                        <p className="mt-1 text-sm font-semibold capitalize">
                          {submission.reward_status || "Not recorded"}
                        </p>
                      </div>
                    </div>

                    {submission.review_notes && (
                      <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                        <p className="text-xs text-gray-500">
                          Review notes
                        </p>
                        <p className="mt-1 text-sm text-gray-300">
                          {submission.review_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="mt-12 border-t border-white/[0.06] py-6 text-center">
          <p className="text-xs text-gray-600">
            ClipTN Administration · User details
          </p>
        </footer>
      </div>
    </main>
  );
}

export default function AdminUserDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#08080d] text-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
            <p className="text-sm text-gray-400">
              Loading user details...
            </p>
          </div>
        </main>
      }
    >
      <AdminUserDetailsContent />
    </Suspense>
  );
}
