
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type VerificationRequest = {
  request_id: string;
  applicant_id: string;
  full_name: string;
  role: "streamer" | "clipper";
  country: string;
  account_created_at: string;
  proof_url: string;
  applicant_message: string | null;
  submitted_at: string;
  approved_submissions: number;
  approved_campaigns: number;
  completed_campaigns: number;
};

export default function AdminVerificationsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const supabase = createClient();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const { data, error: requestError } = await supabase.rpc(
      "admin_get_verification_requests"
    );

    if (requestError) {
      setError(
        requestError.message.includes("Administrator access required")
          ? "You do not have administrator access to this page."
          : requestError.message
      );
      setRequests([]);
      setLoading(false);
      return;
    }

    setRequests((data ?? []) as VerificationRequest[]);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function reviewRequest(
    requestId: string,
    decision: "approved" | "rejected"
  ) {
    const note = notes[requestId] ?? "";

    if (decision === "rejected" && note.trim().length < 3) {
      setError("Please provide a reason before rejecting an application.");
      return;
    }

    const confirmed = window.confirm(
      decision === "approved"
        ? "Approve this verification application and activate the badge?"
        : "Reject this verification application?"
    );

    if (!confirmed) return;

    setProcessingId(requestId);
    setError("");
    setSuccess("");

    const { error: reviewError } = await supabase.rpc(
      "admin_review_verification_request",
      {
        p_request_id: requestId,
        p_decision: decision,
        p_review_notes: note.trim() || null,
      }
    );

    if (reviewError) {
      setError(reviewError.message);
      setProcessingId(null);
      return;
    }

    setSuccess(
      decision === "approved"
        ? "Application approved. The verification badge is now active."
        : "Application rejected successfully."
    );

    setNotes((previous) => {
      const updated = { ...previous };
      delete updated[requestId];
      return updated;
    });

    await loadRequests();
    setProcessingId(null);
  }

  const filteredRequests = requests.filter((request) => {
    const query = search.toLowerCase();

    return (
      request.full_name.toLowerCase().includes(query) ||
      request.role.toLowerCase().includes(query) ||
      request.country.toLowerCase().includes(query)
    );
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const accountAge = (date: string) =>
    Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(date).getTime()) / 86400000
      )
    );

  return (
    <main className="min-h-screen bg-[#08080d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1450px] px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-white">
              ← Back to dashboard
            </Link>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-xl">
                ◈
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  ClipTN <span className="text-violet-400">Admin</span>
                </h1>
                <p className="text-xs text-gray-500">
                  Verification management
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh applications"}
          </button>
        </header>

        {/* Title */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
              Administration
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Verification <span className="text-violet-400">Applications</span>
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Review creator and clipper applications, inspect their proof,
            and manage access to the ClipTN verified badge.
          </p>
        </section>

        {/* Statistics */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-sm text-gray-500">Pending applications</p>
            <p className="mt-3 text-3xl font-bold">{requests.length}</p>
            <p className="mt-2 text-xs text-gray-600">
              Awaiting administrator review
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-sm text-gray-500">Streamer applications</p>
            <p className="mt-3 text-3xl font-bold text-violet-300">
              {requests.filter((r) => r.role === "streamer").length}
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Creator verification requests
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-sm text-gray-500">Clipper applications</p>
            <p className="mt-3 text-3xl font-bold text-purple-300">
              {requests.filter((r) => r.role === "clipper").length}
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Clipper verification requests
            </p>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Search */}
        <section className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-semibold">Application queue</h3>
            <p className="mt-1 text-xs text-gray-500">
              Review each application before making a decision.
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, role or country..."
            className="w-full rounded-xl border border-white/10 bg-[#111119] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/50 sm:max-w-xs"
          />
        </section>

        {/* Applications */}
        {loading ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] py-20 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
            <p className="text-sm text-gray-400">
              Loading verification applications...
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] px-6 py-20 text-center">
            <div className="mb-4 text-4xl">◇</div>
            <h3 className="text-lg font-semibold">
              {requests.length === 0
                ? "No pending applications"
                : "No matching applications"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {requests.length === 0
                ? "New verification applications will appear here when users become eligible and apply."
                : "Try searching with another name, role or country."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredRequests.map((request) => (
              <article
                key={request.request_id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111119] transition hover:border-violet-500/25"
              >
                <div className="border-b border-white/[0.06] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold">
                          {request.full_name}
                        </h4>

                        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                          {request.role}
                        </span>

                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold text-amber-300">
                          Pending review
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        {request.country} · Submitted{" "}
                        {formatDate(request.submitted_at)}
                      </p>

                      <p className="mt-1 break-all text-[11px] text-gray-600">
                        User ID: {request.applicant_id}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">
                        Account age
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {accountAge(request.account_created_at)}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          days
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
                  {/* Applicant information */}
                  <div>
                    <h5 className="mb-4 text-sm font-semibold">
                      Eligibility information
                    </h5>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                        <span className="text-xs text-gray-400">
                          Account age requirement
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {accountAge(request.account_created_at)} / 30 days
                        </span>
                      </div>

                      {request.role === "clipper" ? (
                        <>
                          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                            <span className="text-xs text-gray-400">
                              Approved clips
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {request.approved_submissions} / 5
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                            <span className="text-xs text-gray-400">
                              Different campaigns
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {request.approved_campaigns} / 2
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                          <span className="text-xs text-gray-400">
                            Completed campaigns
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {request.completed_campaigns} / 1
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold text-gray-400">
                        Applicant message
                      </p>
                      <div className="min-h-20 rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-6 text-gray-300">
                        {request.applicant_message || "No message provided."}
                      </div>
                    </div>
                  </div>

                  {/* Proof and review */}
                  <div>
                    <h5 className="mb-4 text-sm font-semibold">
                      Proof and administrator review
                    </h5>

                    <a
                      href={request.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 transition hover:bg-violet-500/10"
                    >
                      <div>
                        <p className="text-sm font-semibold text-violet-300">
                          Open submitted proof ↗
                        </p>
                        <p className="mt-1 break-all text-[11px] text-gray-500">
                          {request.proof_url}
                        </p>
                      </div>
                      <span className="text-xl text-violet-400">↗</span>
                    </a>

                    <label className="mt-5 mb-2 block text-xs font-semibold text-gray-400">
                      Review notes
                    </label>

                    <textarea
                      value={notes[request.request_id] ?? ""}
                      onChange={(e) =>
                        setNotes((previous) => ({
                          ...previous,
                          [request.request_id]: e.target.value,
                        }))
                      }
                      maxLength={2000}
                      rows={3}
                      placeholder="Write feedback or a reason for rejection..."
                      className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/50"
                    />

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        onClick={() =>
                          reviewRequest(request.request_id, "approved")
                        }
                        disabled={processingId === request.request_id}
                        className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === request.request_id
                          ? "Processing..."
                          : "✓ Approve"}
                      </button>

                      <button
                        onClick={() =>
                          reviewRequest(request.request_id, "rejected")
                        }
                        disabled={processingId === request.request_id}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-gray-600">
                      Approval activates the verified badge. Rejection
                      requires a written reason. Inspect the submitted proof
                      and check for policy violations before deciding.
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="mt-12 border-t border-white/[0.06] py-6 text-center">
          <p className="text-xs text-gray-600">
            ClipTN Administration · Secure verification management
          </p>
        </footer>
      </div>
    </main>
  );
}
