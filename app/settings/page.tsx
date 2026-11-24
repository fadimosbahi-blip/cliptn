
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  role: "streamer" | "clipper";
  country: string;
  is_verified: boolean;
  verified_at: string | null;
};

type Eligibility = {
  role: "streamer" | "clipper";
  account_age_days: number;
  account_old_enough: boolean;
  completed_campaigns: number;
  approved_submissions: number;
  approved_campaigns: number;
  has_pending_request: boolean;
  eligible: boolean;
};

type VerificationRequest = {
  id: string;
  proof_url: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const countries = [
  { code: "TN", name: "Tunisia" },
  { code: "IT", name: "Italy" },
  { code: "DZ", name: "Algeria" },
  { code: "MA", name: "Morocco" },
  { code: "LY", name: "Libya" },
  { code: "EG", name: "Egypt" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "OTHER", name: "Other" },
];

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("TN");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Password management
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Verification system
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [verificationRequest, setVerificationRequest] =
    useState<VerificationRequest | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [submittingVerification, setSubmittingVerification] =
    useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState("");

  async function loadVerificationData() {
    const supabase = createClient();

    setVerificationLoading(true);
    setVerificationError("");

    const [eligibilityResult, requestResult] = await Promise.all([
      supabase.rpc("get_my_verification_eligibility"),

      supabase
        .from("verification_requests")
        .select(
          "id, proof_url, message, status, review_notes, created_at, reviewed_at"
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (eligibilityResult.error) {
      console.error(eligibilityResult.error);
      setVerificationError(
        "We couldn't load your eligibility. Please refresh the page."
      );
      setEligibility(null);
    } else {
      setEligibility(eligibilityResult.data as Eligibility);
    }

    if (requestResult.error) {
      console.error(requestResult.error);
      setVerificationError(
        "We couldn't load your verification application."
      );
    } else {
      setVerificationRequest(
        requestResult.data as VerificationRequest | null
      );
    }

    setVerificationLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const user = authData.user;

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, country, is_verified, verified_at"
        )
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (profileError || !data) {
        console.error(profileError);
        setError("We couldn't load your profile.");
        setLoading(false);
        return;
      }

      const loadedProfile = data as Profile;

      setProfile(loadedProfile);
      setFullName(loadedProfile.full_name);
      setCountry(loadedProfile.country);
      setEmail(user.email ?? "");
      setLoading(false);

      const [eligibilityResult, requestResult] = await Promise.all([
        supabase.rpc("get_my_verification_eligibility"),

        supabase
          .from("verification_requests")
          .select(
            "id, proof_url, message, status, review_notes, created_at, reviewed_at"
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (eligibilityResult.error) {
        console.error(eligibilityResult.error);
        setVerificationError(
          "We couldn't load your eligibility. Please refresh the page."
        );
      } else {
        setEligibility(eligibilityResult.data as Eligibility);
      }

      if (requestResult.error) {
        console.error(requestResult.error);
        setVerificationError(
          "We couldn't load your verification application."
        );
      } else {
        setVerificationRequest(
          requestResult.data as VerificationRequest | null
        );
      }

      setVerificationLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) return;

    setSaving(true);
    setMessage("");
    setError("");

    const cleanedName = fullName.trim();

    if (cleanedName.length < 2 || cleanedName.length > 80) {
      setError("Your name must contain between 2 and 80 characters.");
      setSaving(false);
      return;
    }

    const supabase = createClient();

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: cleanedName,
        country,
      })
      .eq("id", profile.id)
      .select(
        "id, full_name, role, country, is_verified, verified_at"
      )
      .single();

    if (updateError || !data) {
      console.error(updateError);
      setError("We couldn't save your changes. Please try again.");
      setSaving(false);
      return;
    }

    setProfile(data as Profile);
    setFullName(data.full_name);
    setCountry(data.country);
    setMessage("Your profile has been updated successfully.");
    setSaving(false);
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (!email) {
      setPasswordError("We couldn't identify your account email.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Your new passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("Your new password must be different.");
      return;
    }

    setChangingPassword(true);

    const supabase = createClient();

    const { error: verifyError } =
      await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

    if (verifyError) {
      setPasswordError("Your current password is incorrect.");
      setChangingPassword(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error(updateError);
      setPasswordError(updateError.message);
      setChangingPassword(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Your password has been changed successfully.");
    setChangingPassword(false);
  }

  async function submitVerification(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setVerificationSuccess("");
    setVerificationError("");

    if (!profile || !eligibility?.eligible) {
      setVerificationError(
        "Your account does not currently meet the eligibility requirements."
      );
      return;
    }

    if (verificationRequest?.status === "pending") {
      setVerificationError(
        "You already have an application awaiting review."
      );
      return;
    }

    const cleanedUrl = proofUrl.trim();
    const cleanedMessage = verificationMessage.trim();

    try {
      const parsedUrl = new URL(cleanedUrl);

      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        cleanedUrl.length > 2048
      ) {
        throw new Error("Invalid URL");
      }
    } catch {
      setVerificationError(
        "Please enter a valid public link to your creator or publishing account."
      );
      return;
    }

    if (cleanedMessage.length > 2000) {
      setVerificationError(
        "Your message must be 2,000 characters or fewer."
      );
      return;
    }

    setSubmittingVerification(true);

    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      setVerificationError("Your session has expired. Please log in again.");
      setSubmittingVerification(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("verification_requests")
      .insert({
        user_id: authData.user.id,
        proof_url: cleanedUrl,
        message: cleanedMessage || null,
      });

    if (insertError) {
      console.error(insertError);

      if (insertError.code === "23505") {
        setVerificationError(
          "You already have a pending verification application."
        );
      } else {
        setVerificationError(
          "We couldn't submit your application. Please try again."
        );
      }

      setSubmittingVerification(false);
      return;
    }

    setProofUrl("");
    setVerificationMessage("");
    setVerificationSuccess(
      "Your verification application has been submitted successfully."
    );
    setSubmittingVerification(false);

    await loadVerificationData();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Loading your settings...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] px-5 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Unable to load settings</h1>
          <p className="mt-3 text-sm text-red-300">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isStreamer = profile.role === "streamer";
  const requirements = isStreamer
    ? [
        {
          label: "Account at least 30 days old",
          current: eligibility?.account_age_days ?? 0,
          required: 30,
          met: eligibility?.account_old_enough ?? false,
          suffix: "days",
        },
        {
          label: "At least one completed campaign",
          current: eligibility?.completed_campaigns ?? 0,
          required: 1,
          met: (eligibility?.completed_campaigns ?? 0) >= 1,
          suffix: "campaigns",
        },
      ]
    : [
        {
          label: "Account at least 30 days old",
          current: eligibility?.account_age_days ?? 0,
          required: 30,
          met: eligibility?.account_old_enough ?? false,
          suffix: "days",
        },
        {
          label: "At least 5 approved clips",
          current: eligibility?.approved_submissions ?? 0,
          required: 5,
          met: (eligibility?.approved_submissions ?? 0) >= 5,
          suffix: "clips",
        },
        {
          label: "Approved clips across at least 2 campaigns",
          current: eligibility?.approved_campaigns ?? 0,
          required: 2,
          met: (eligibility?.approved_campaigns ?? 0) >= 2,
          suffix: "campaigns",
        },
      ];

  const completedRequirements = requirements.filter(
    (requirement) => requirement.met
  ).length;

  const requirementPercentage = Math.round(
    (completedRequirements / requirements.length) * 100
  );

  const requestStatusStyles = {
    pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    rejected: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080810] px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed -right-40 -top-40 h-[450px] w-[450px] rounded-full bg-violet-700/[0.12] blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-48 -left-40 h-[450px] w-[450px] rounded-full bg-fuchsia-700/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        <header className="mb-10 border-b border-white/[0.07] pb-6">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 transition hover:text-violet-300"
          >
            ← Back to dashboard
          </Link>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
            Account management
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Settings<span className="text-violet-400">.</span>
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            Manage your ClipTN identity, account and verification.
          </p>
        </header>

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <div className="grid gap-7 lg:grid-cols-[250px_1fr]">
          {/* Account navigation */}
          <aside className="h-fit rounded-2xl border border-white/[0.07] bg-[#14121c] p-5">
            <div className="flex items-center gap-3 border-b border-white/[0.07] pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-xl font-black text-violet-300">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {profile.full_name}
                </p>
                <p className="mt-1 text-xs capitalize text-zinc-500">
                  {profile.role} account
                </p>
              </div>
            </div>

            <nav className="mt-5 space-y-2">
              <a
                href="#profile"
                className="flex items-center gap-3 rounded-xl bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300"
              >
                <span>◈</span> Personal profile
              </a>

              <a
                href="#verification"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <span>✦</span> Verification
              </a>

              <a
                href="#account"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <span>◎</span> Account information
              </a>

              <a
                href="#security"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <span>◇</span> Security
              </a>
            </nav>
          </aside>

          <div className="space-y-7">
            {/* Personal profile */}
            <section
              id="profile"
              className="scroll-mt-8 rounded-2xl border border-white/[0.07] bg-[#14121c] p-6 sm:p-8"
            >
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
                  Your identity
                </p>
                <h2 className="mt-2 text-xl font-bold">Personal profile</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Update the information displayed on your ClipTN account.
                </p>
              </div>

              <form onSubmit={saveProfile} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-400">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    maxLength={80}
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-400">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/50"
                  >
                    {countries.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
                  <p className="text-xs text-zinc-600">
                    Your role cannot be changed here.
                  </p>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-violet-600 px-6 py-3 text-xs font-bold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </section>

            {/* Live verification centre */}
            <section
              id="verification"
              className="scroll-mt-8 rounded-2xl border border-white/[0.07] bg-[#14121c] p-6 sm:p-8"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
                Trust and reputation
              </p>

              <h2 className="mt-2 text-xl font-bold">
                Verification centre
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Complete the eligibility requirements and prove ownership of
                your creator or publishing account to apply for verification.
              </p>

              <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-7 w-7 text-violet-300"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2.5l2.6 1.4 3-.1 1.4 2.6 2.2 2-.7 2.9.7 2.9-2.2 2-1.4 2.6-3-.1L12 22l-2.6-1.4-3 .1L5 18.1l-2.2-2 .7-2.9-.7-2.9 2.2-2 1.4-2.6 3 .1L12 2.5z" />
                      <path d="m8.5 12 2.2 2.2 4.8-4.8" />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold">
                      {isStreamer ? "Verified Creator" : "Verified Clipper"}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Your ClipTN trust status
                    </p>
                  </div>

                  {profile.is_verified ? (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold text-amber-300">
                      Not verified
                    </span>
                  )}
                </div>

                <p className="mt-5 text-xs leading-6 text-zinc-400">
                  {profile.is_verified
                    ? "Your account has been verified by ClipTN."
                    : "A verification badge is granted only after a manual review by an authorized ClipTN administrator."}
                </p>
              </div>

              {verificationLoading ? (
                <div className="mt-7 flex items-center gap-3 py-5 text-sm text-zinc-400">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-950 border-t-violet-400" />
                  Checking your eligibility...
                </div>
              ) : verificationError && !eligibility ? (
                <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                  {verificationError}
                  <button
                    type="button"
                    onClick={loadVerificationData}
                    className="ml-2 font-bold underline"
                  >
                    Try again
                  </button>
                </div>
              ) : eligibility ? (
                <>
                  <div className="mt-7">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold">
                          Your eligibility progress
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          Based on your real ClipTN account activity.
                        </p>
                      </div>

                      <span className="text-sm font-bold text-violet-300">
                        {completedRequirements}/{requirements.length} complete
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all duration-700"
                        style={{ width: `${requirementPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {requirements.map((requirement) => {
                      const progress = Math.min(
                        (requirement.current / requirement.required) * 100,
                        100
                      );

                      return (
                        <div
                          key={requirement.label}
                          className="rounded-xl border border-white/[0.06] bg-[#0d0c14] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  requirement.met
                                    ? "bg-emerald-400/15 text-emerald-300"
                                    : "bg-white/[0.06] text-zinc-500"
                                }`}
                              >
                                {requirement.met ? "✓" : "•"}
                              </span>

                              <div>
                                <p className="text-sm font-semibold">
                                  {requirement.label}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {requirement.current} / {requirement.required}{" "}
                                  {requirement.suffix}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold ${
                                requirement.met
                                  ? "text-emerald-300"
                                  : "text-zinc-500"
                              }`}
                            >
                              {requirement.met ? "COMPLETED" : "IN PROGRESS"}
                            </span>
                          </div>

                          <div className="ml-9 mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                requirement.met
                                  ? "bg-emerald-400"
                                  : "bg-violet-500"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {eligibility.eligible ? (
                    <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                      <p className="text-sm font-bold text-emerald-300">
                        You meet the activity requirements!
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-400">
                        You can now submit an application. Your proof of
                        account ownership will still need manual review.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <p className="text-sm font-bold">
                        Keep building your ClipTN reputation
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Complete the remaining requirements to unlock your
                        verification application.
                      </p>
                    </div>
                  )}

                  {/* Latest application */}
                  {verificationRequest && (
                    <div className="mt-6 rounded-xl border border-white/[0.07] bg-[#0d0c14] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-bold">
                          Latest application
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase ${
                            requestStatusStyles[verificationRequest.status]
                          }`}
                        >
                          {verificationRequest.status}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-zinc-500">
                        Submitted{" "}
                        {new Date(
                          verificationRequest.created_at
                        ).toLocaleDateString()}
                      </p>

                      <a
                        href={verificationRequest.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block break-all text-xs text-violet-300 underline underline-offset-4"
                      >
                        View submitted proof
                      </a>

                      {verificationRequest.review_notes && (
                        <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Administrator feedback
                          </p>
                          <p className="mt-2 text-sm leading-6 text-zinc-300">
                            {verificationRequest.review_notes}
                          </p>
                        </div>
                      )}

                      {verificationRequest.status === "pending" && (
                        <p className="mt-4 text-xs text-amber-300">
                          Your application is waiting for administrator review.
                        </p>
                      )}

                      {verificationRequest.status === "rejected" && (
                        <p className="mt-4 text-xs text-red-300">
                          Your previous application was rejected. You may
                          submit another application when eligible.
                        </p>
                      )}

                      {verificationRequest.status === "approved" &&
                        !profile.is_verified && (
                          <p className="mt-4 text-xs text-amber-300">
                            Your application is approved. Your badge has not
                            yet been activated.
                          </p>
                        )}
                    </div>
                  )}

                  {/* Application form */}
                  {eligibility.eligible &&
                    !profile.is_verified &&
                    verificationRequest?.status !== "pending" && (
                      <form
                        onSubmit={submitVerification}
                        className="mt-7 rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-5 sm:p-6"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
                          Application
                        </p>

                        <h3 className="mt-2 text-lg font-bold">
                          Apply for verification
                        </h3>

                        <p className="mt-2 text-xs leading-6 text-zinc-500">
                          Submit a public link to the creator or publishing
                          account you own. Our team will review the evidence.
                        </p>

                        <div className="mt-5">
                          <label className="mb-2 block text-xs font-semibold text-zinc-400">
                            Your account proof URL
                          </label>

                          <input
                            type="url"
                            value={proofUrl}
                            onChange={(event) =>
                              setProofUrl(event.target.value)
                            }
                            required
                            maxLength={2048}
                            placeholder={
                              isStreamer
                                ? "https://www.youtube.com/@yourchannel"
                                : "https://www.tiktok.com/@youraccount"
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50"
                          />

                          <p className="mt-2 text-[10px] text-zinc-600">
                            Use a public profile link that helps us confirm
                            ownership. Do not submit passwords or private
                            account credentials.
                          </p>
                        </div>

                        <div className="mt-5">
                          <label className="mb-2 block text-xs font-semibold text-zinc-400">
                            Additional information (optional)
                          </label>

                          <textarea
                            value={verificationMessage}
                            onChange={(event) =>
                              setVerificationMessage(event.target.value)
                            }
                            maxLength={2000}
                            rows={4}
                            placeholder="Tell us anything that may help us verify your account..."
                            className="w-full resize-y rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50"
                          />
                          <p className="mt-2 text-right text-[10px] text-zinc-600">
                            {verificationMessage.length}/2000
                          </p>
                        </div>

                        {verificationError && (
                          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">
                            {verificationError}
                          </div>
                        )}

                        {verificationSuccess && (
                          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-300">
                            {verificationSuccess}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={submittingVerification}
                          className="mt-5 w-full rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          {submittingVerification
                            ? "Submitting application..."
                            : "Submit verification application"}
                        </button>

                        <p className="mt-4 text-[10px] leading-5 text-zinc-600">
                          Submitting an application does not guarantee
                          verification. Every application is subject to
                          manual review.
                        </p>
                      </form>
                    )}

                  {verificationSuccess && (
                    <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
                      {verificationSuccess}
                    </div>
                  )}

                  {verificationError && eligibility && (
                    <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                      {verificationError}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-zinc-400">
                  Eligibility information is currently unavailable.
                  <button
                    type="button"
                    onClick={loadVerificationData}
                    className="ml-2 font-bold text-violet-300 underline"
                  >
                    Try again
                  </button>
                </div>
              )}
            </section>

            {/* Account information */}
            <section
              id="account"
              className="scroll-mt-8 rounded-2xl border border-white/[0.07] bg-[#14121c] p-6 sm:p-8"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
                Account details
              </p>
              <h2 className="mt-2 text-xl font-bold">
                Account information
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-[#0d0c14] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Email address
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold">
                    {email || "No email available"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#0d0c14] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Account role
                  </p>
                  <p className="mt-2 text-sm font-semibold capitalize">
                    {profile.role}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#0d0c14] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Member since
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {profile.is_verified && profile.verified_at
                      ? `Verified on ${new Date(
                          profile.verified_at
                        ).toLocaleDateString()}`
                      : "Your account creation date is used for eligibility."}
                  </p>
                </div>
              </div>
            </section>

            {/* Security and password management */}
            <section
              id="security"
              className="scroll-mt-8 rounded-2xl border border-white/[0.07] bg-[#14121c] p-6 sm:p-8"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
                Protection
              </p>

              <h2 className="mt-2 text-xl font-bold">Security</h2>

              <p className="mt-2 text-sm text-zinc-500">
                Change your password to help keep your ClipTN account secure.
              </p>

              {passwordMessage && (
                <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
                  {passwordMessage}
                </div>
              )}

              {passwordError && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
                >
                  {passwordError}
                </div>
              )}

              <form onSubmit={changePassword} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-400">
                    Current password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/50"
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-400">
                    New password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/50"
                    placeholder="Enter your new password"
                  />
                  <p className="mt-2 text-[10px] text-zinc-600">
                    Use at least 8 characters.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-400">
                    Confirm new password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/50"
                    placeholder="Confirm your new password"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(event) =>
                      setShowPasswords(event.target.checked)
                    }
                    className="accent-violet-500"
                  />
                  Show passwords
                </label>

                <div className="border-t border-white/[0.07] pt-5">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="rounded-xl bg-violet-600 px-6 py-3 text-xs font-bold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {changingPassword
                      ? "Updating password..."
                      : "Update password"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>

        <footer className="mt-10 border-t border-white/[0.07] py-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ClipTN. Built for creators.
        </footer>
      </div>
    </main>
  );
}
