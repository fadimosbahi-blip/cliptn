
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReportStatus = "pending" | "under_review" | "resolved" | "rejected";

type Report = {
  report_id: string;
  reporter_id: string;
  reporter_name: string | null;
  reported_user_id: string;
  reported_user_name: string | null;
  category: string;
  description: string;
  evidence_url: string | null;
  campaign_id: string | null;
  campaign_title: string | null;
  submission_id: string | null;
  submission_clip_url: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

type Activity = {
  activity_id: string;
  admin_id: string;
  admin_name: string | null;
  action_type:
    | "status_changed"
    | "internal_note"
    | "resolution_note"
    | "report_reviewed";
  previous_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
};

type InvestigationConversation = {
  conversation_id: string;
  streamer_id: string;
  clipper_id: string;
  campaign_id: string | null;
  submission_id: string | null;
  conversation_created_at: string;
  message_count: number;
};

type InvestigationMessage = {
  message_id: string;
  sender_id: string;
  body: string;
  message_created_at: string;
  read_at: string | null;
};

type InvestigationAccess = {
  conversation_id: string;
  admin_id: string;
  accessed_at: string;
};

type EvidenceImage = {
  path: string;
  signedUrl: string;
};

type Filter = "all" | ReportStatus;

const supabase = createClient();

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  resolved: "Resolved",
  rejected: "Rejected",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    under_review: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    resolved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    rejected: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: number;
  description: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#11111c] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        <span className={`h-2 w-2 rounded-full ${color}`} />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [conversations, setConversations] = useState<
    InvestigationConversation[]
  >([]);
  const [messages, setMessages] = useState<InvestigationMessage[]>([]);
  const [investigationAccess, setInvestigationAccess] = useState<
    InvestigationAccess[]
  >([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const [evidenceImages, setEvidenceImages] = useState<EvidenceImage[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [expandedEvidence, setExpandedEvidence] =
    useState<EvidenceImage | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newStatus, setNewStatus] = useState<ReportStatus>("pending");
  const [internalNote, setInternalNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_reports",
      {
        p_status: "all",
        p_search: null,
        p_limit: 200,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setReports([]);
      setSelectedReport(null);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Report[];
    setReports(rows);

    setSelectedReport((current) => {
      if (!current) return null;

      return (
        rows.find((report) => report.report_id === current.report_id) ?? null
      );
    });

    setLoading(false);
  }, []);

  const loadActivity = useCallback(async (reportId: string) => {
    setActivityLoading(true);

    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_report_activity",
      { p_report_id: reportId }
    );

    if (rpcError) {
      setActivities([]);
      setError(rpcError.message);
    } else {
      setActivities((data ?? []) as Activity[]);
    }

    setActivityLoading(false);
  }, []);

  const loadInvestigationAccess = useCallback(async (reportId: string) => {
    setAccessLoading(true);

    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_report_investigation_access",
      { p_report_id: reportId }
    );

    if (rpcError) {
      setInvestigationAccess([]);
      setError(rpcError.message);
    } else {
      setInvestigationAccess((data ?? []) as InvestigationAccess[]);
    }

    setAccessLoading(false);
  }, []);

  const loadConversations = useCallback(async (reportId: string) => {
    setConversationsLoading(true);
    setConversations([]);
    setMessages([]);
    setSelectedConversationId(null);

    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_report_conversations",
      { p_report_id: reportId }
    );

    if (rpcError) {
      setError(rpcError.message);
      setConversations([]);
    } else {
      setConversations((data ?? []) as InvestigationConversation[]);
    }

    setConversationsLoading(false);
  }, []);

  const loadEvidence = useCallback(async (reportId: string) => {
    setEvidenceLoading(true);
    setEvidenceError("");
    setEvidenceImages([]);

    try {
      const { data: pathsData, error: pathsError } = await supabase.rpc(
        "admin_get_report_evidence_paths",
        { p_report_id: reportId }
      );

      if (pathsError) {
        setEvidenceError(pathsError.message);
        setEvidenceLoading(false);
        return;
      }

      const paths = Array.isArray(pathsData)
        ? (pathsData as string[])
        : [];

      if (paths.length === 0) {
        setEvidenceImages([]);
        setEvidenceLoading(false);
        return;
      }

      const { data: signedData, error: signedError } =
        await supabase.storage
          .from("report-evidence")
          .createSignedUrls(paths, 3600);

      if (signedError) {
        setEvidenceError(signedError.message);
        setEvidenceLoading(false);
        return;
      }

      const images: EvidenceImage[] = (signedData ?? [])
        .filter(
          (item): item is typeof item & { signedUrl: string } =>
            typeof item.signedUrl === "string" && item.signedUrl.length > 0
        )
        .map((item) => ({
          path: item.path ?? "",
          signedUrl: item.signedUrl,
        }));

      setEvidenceImages(images);

      if (images.length !== paths.length) {
        setEvidenceError(
          "Some evidence images could not be loaded. Try refreshing the report."
        );
      }
    } catch (err) {
      setEvidenceError(
        err instanceof Error
          ? err.message
          : "Could not load report evidence."
      );
    }

    setEvidenceLoading(false);
  }, []);

  const openConversation = useCallback(
    async (reportId: string, conversationId: string) => {
      setMessagesLoading(true);
      setError("");
      setSuccess("");
      setMessages([]);
      setSelectedConversationId(conversationId);

      const { data, error: rpcError } = await supabase.rpc(
        "admin_get_report_messages",
        {
          p_report_id: reportId,
          p_conversation_id: conversationId,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
        setSelectedConversationId(null);
        setMessages([]);
        setMessagesLoading(false);
        return;
      }

      setMessages((data ?? []) as InvestigationMessage[]);
      await loadInvestigationAccess(reportId);
      setMessagesLoading(false);
    },
    [loadInvestigationAccess]
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!selectedReport) {
      setActivities([]);
      setConversations([]);
      setMessages([]);
      setInvestigationAccess([]);
      setSelectedConversationId(null);
      setEvidenceImages([]);
      setEvidenceError("");
      return;
    }

    setNewStatus(selectedReport.status);
    setResolutionNote(selectedReport.resolution_note ?? "");
    setInternalNote("");
    setExpandedEvidence(null);

    void loadActivity(selectedReport.report_id);
    void loadConversations(selectedReport.report_id);
    void loadInvestigationAccess(selectedReport.report_id);
    void loadEvidence(selectedReport.report_id);
  }, [
    selectedReport?.report_id,
    loadActivity,
    loadConversations,
    loadInvestigationAccess,
    loadEvidence,
  ]);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus = filter === "all" || report.status === filter;

      const searchable = [
        report.report_id,
        report.category,
        report.description,
        report.reporter_name,
        report.reported_user_name,
        report.campaign_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!term || searchable.includes(term));
    });
  }, [reports, filter, search]);

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "pending").length,
      reviewing: reports.filter((r) => r.status === "under_review").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
      rejected: reports.filter((r) => r.status === "rejected").length,
    }),
    [reports]
  );

  async function saveChanges() {
    if (!selectedReport) return;

    const hasStatusChange = newStatus !== selectedReport.status;
    const hasInternalNote = internalNote.trim().length > 0;
    const hasResolutionNote =
      resolutionNote.trim() !==
      (selectedReport.resolution_note ?? "").trim();

    if (!hasStatusChange && !hasInternalNote && !hasResolutionNote) {
      setError("There are no changes to save.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const { error: rpcError } = await supabase.rpc("admin_update_report", {
      p_report_id: selectedReport.report_id,
      p_status: hasStatusChange ? newStatus : null,
      p_internal_note: hasInternalNote ? internalNote.trim() : null,
      p_resolution_note: hasResolutionNote ? resolutionNote.trim() : null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setSuccess("Report updated successfully.");
    setInternalNote("");

    await loadReports();
    await loadActivity(selectedReport.report_id);

    setSaving(false);
  }

  function selectReport(report: Report) {
    setSelectedReport(report);
    setError("");
    setSuccess("");
    setExpandedEvidence(null);
  }

  function getSenderLabel(senderId: string) {
    if (!selectedReport) return "Unknown sender";

    if (senderId === selectedReport.reporter_id) {
      return selectedReport.reporter_name || "Reporter";
    }

    if (senderId === selectedReport.reported_user_id) {
      return selectedReport.reported_user_name || "Reported user";
    }

    return "Other participant";
  }

  function getSenderRole(senderId: string) {
    if (!selectedReport) return "";

    if (senderId === selectedReport.reporter_id) return "Reporter";
    if (senderId === selectedReport.reported_user_id) return "Reported user";

    return "Participant";
  }

  return (
    <div className="min-h-screen bg-[#09090f] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Administration
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Reports & Moderation
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Review reports, investigate disputes, inspect conversations and
              evidence, and manage moderation decisions.
            </p>
          </div>

          <button
            onClick={() => void loadReports()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-gray-200 transition hover:border-violet-400/30 hover:bg-violet-500/10 disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            Refresh reports
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span className="break-words">{error}</span>
            <button
              onClick={() => setError("")}
              className="shrink-0 text-red-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              className="hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label="Total reports"
            value={stats.total}
            description="Latest 200 reports"
            color="bg-violet-400"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            description="Awaiting attention"
            color="bg-amber-400"
          />
          <StatCard
            label="Under review"
            value={stats.reviewing}
            description="Currently investigated"
            color="bg-blue-400"
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            description="Successfully resolved"
            color="bg-emerald-400"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            description="Reports dismissed"
            color="bg-red-400"
          />
        </div>

        {/* Main workspace */}
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
          {/* Reports list */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#11111c]">
            <div className="border-b border-white/[0.07] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">All reports</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {filteredReports.length} matching reports
                  </p>
                </div>

                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-gray-400">
                  Live data
                </span>
              </div>

              <div className="relative mt-4">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ⌕
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reports, users, categories..."
                  className="w-full rounded-xl border border-white/10 bg-[#09090f] py-3 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All"],
                    ["pending", "Pending"],
                    ["under_review", "Reviewing"],
                    ["resolved", "Resolved"],
                    ["rejected", "Rejected"],
                  ] as [Filter, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      filter === value
                        ? "border border-violet-400/30 bg-violet-500/15 text-violet-200"
                        : "border border-white/[0.07] bg-white/[0.025] text-gray-400 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[850px] overflow-y-auto">
              {loading ? (
                <div className="space-y-3 p-5">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-xl bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl text-gray-500">
                    ✓
                  </div>
                  <p className="font-medium text-gray-300">No reports found</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Try changing your search or status filter.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.055]">
                  {filteredReports.map((report) => {
                    const isSelected =
                      selectedReport?.report_id === report.report_id;

                    return (
                      <button
                        key={report.report_id}
                        onClick={() => selectReport(report)}
                        className={`w-full border-l-2 p-4 text-left transition ${
                          isSelected
                            ? "border-violet-400 bg-violet-500/[0.09]"
                            : "border-transparent hover:bg-white/[0.035]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {report.category}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              #{shortId(report.report_id)}
                            </p>
                          </div>

                          <StatusBadge status={report.status} />
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-400">
                          {report.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-gray-500">
                            {report.reporter_name || "Unknown reporter"}
                            <span className="mx-1.5 text-gray-700">→</span>
                            {report.reported_user_name || "Unknown user"}
                          </span>

                          <span className="text-[11px] text-gray-600">
                            {formatDate(report.created_at)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Investigation panel */}
          <section className="min-w-0 space-y-5">
            {!selectedReport ? (
              <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#11111c] px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-2xl text-violet-300">
                  ◈
                </div>
                <h2 className="font-semibold text-white">Select a report</h2>
                <p className="mt-2 max-w-xs text-sm text-gray-500">
                  Choose a report from the list to investigate its details,
                  evidence, conversations, and activity history.
                </p>
              </div>
            ) : (
              <>
                {/* Report details */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#11111c]">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] p-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-violet-400">
                        Investigation
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-white">
                        {selectedReport.category}
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Report #{shortId(selectedReport.report_id)}
                      </p>
                    </div>

                    <StatusBadge status={selectedReport.status} />
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.06] bg-[#09090f] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Reported by
                        </p>
                        <p className="mt-2 break-words text-sm font-semibold text-white">
                          {selectedReport.reporter_name || "Unknown user"}
                        </p>
                        <p className="mt-1 break-all text-[11px] text-gray-600">
                          {selectedReport.reporter_id}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-[#09090f] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Reported user
                        </p>
                        <p className="mt-2 break-words text-sm font-semibold text-white">
                          {selectedReport.reported_user_name || "Unknown user"}
                        </p>
                        <p className="mt-1 break-all text-[11px] text-gray-600">
                          {selectedReport.reported_user_id}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Report description
                      </p>
                      <div className="whitespace-pre-wrap break-words rounded-xl border border-white/[0.06] bg-[#09090f] p-4 text-sm leading-7 text-gray-300">
                        {selectedReport.description}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.06] bg-[#09090f] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Submitted
                        </p>
                        <p className="mt-2 text-sm text-gray-200">
                          {formatDate(selectedReport.created_at)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-[#09090f] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Last updated
                        </p>
                        <p className="mt-2 text-sm text-gray-200">
                          {formatDate(selectedReport.updated_at)}
                        </p>
                      </div>
                    </div>

                    {(selectedReport.campaign_id ||
                      selectedReport.submission_id) && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Related content
                        </p>

                        <div className="space-y-2">
                          {selectedReport.campaign_id && (
                            <div className="rounded-xl border border-white/[0.06] bg-[#09090f] p-4">
                              <p className="text-[11px] text-gray-500">
                                Campaign
                              </p>
                              <p className="mt-1 text-sm font-medium text-white">
                                {selectedReport.campaign_title || "Campaign"}
                              </p>
                              <p className="mt-1 break-all text-[11px] text-gray-600">
                                {selectedReport.campaign_id}
                              </p>
                            </div>
                          )}

                          {selectedReport.submission_id && (
                            <div className="rounded-xl border border-white/[0.06] bg-[#09090f] p-4">
                              <p className="text-[11px] text-gray-500">
                                Submission
                              </p>
                              <p className="mt-1 break-all text-xs text-gray-300">
                                {selectedReport.submission_id}
                              </p>
                              {selectedReport.submission_clip_url && (
                                <a
                                  href={selectedReport.submission_clip_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex text-xs font-semibold text-violet-300 hover:text-violet-200"
                                >
                                  Open submitted clip ↗
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Existing evidence link */}
                    {selectedReport.evidence_url && (
                      <div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.055] p-4">
                        <p className="text-xs font-semibold text-violet-200">
                          External evidence link
                        </p>
                        <a
                          href={selectedReport.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex break-all text-sm text-violet-300 underline decoration-violet-400/30 underline-offset-4 hover:text-white"
                        >
                          Open evidence in new tab ↗
                        </a>
                      </div>
                    )}

                    {/* Uploaded screenshot evidence */}
                    <div className="overflow-hidden rounded-xl border border-violet-400/15 bg-violet-500/[0.035]">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                            Uploaded evidence
                          </p>
                          <h3 className="mt-1 text-sm font-bold text-white">
                            Screenshot attachments
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Private report evidence · Admin access only
                          </p>
                        </div>

                        <span className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
                          {evidenceImages.length} images
                        </span>
                      </div>

                      <div className="p-4">
                        {evidenceLoading ? (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {[1, 2, 3].map((item) => (
                              <div
                                key={item}
                                className="h-32 animate-pulse rounded-xl bg-white/[0.05]"
                              />
                            ))}
                          </div>
                        ) : evidenceError ? (
                          <div className="rounded-xl border border-red-400/15 bg-red-500/[0.06] p-4">
                            <p className="text-sm text-red-300">
                              Could not load screenshot evidence.
                            </p>
                            <p className="mt-2 break-words text-xs text-red-300/70">
                              {evidenceError}
                            </p>
                            <button
                              onClick={() =>
                                void loadEvidence(selectedReport.report_id)
                              }
                              className="mt-3 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
                            >
                              Try again
                            </button>
                          </div>
                        ) : evidenceImages.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 bg-[#09090f] px-4 py-8 text-center">
                            <div className="mb-2 text-2xl text-gray-600">
                              ▧
                            </div>
                            <p className="text-sm font-medium text-gray-300">
                              No screenshots attached
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              This report does not contain uploaded image
                              evidence.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {evidenceImages.map((image, index) => (
                                <button
                                  key={image.path}
                                  type="button"
                                  onClick={() => setExpandedEvidence(image)}
                                  className="group overflow-hidden rounded-xl border border-white/10 bg-[#09090f] text-left transition hover:border-violet-400/40 hover:bg-violet-500/[0.04]"
                                >
                                  <div className="relative h-32 overflow-hidden bg-black">
                                    <img
                                      src={image.signedUrl}
                                      alt={`Report evidence ${index + 1}`}
                                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                                      <span className="rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                                        Enlarge image ↗
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-xs font-semibold text-gray-200">
                                      Screenshot {index + 1}
                                    </p>
                                    <p className="mt-1 truncate text-[10px] text-gray-600">
                                      {image.path.split("/").pop()}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>

                            <p className="mt-3 text-center text-[11px] text-gray-600">
                              Select an image to view it at full size.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversation investigation */}
                <div className="overflow-hidden rounded-2xl border border-violet-400/15 bg-[#11111c]">
                  <div className="border-b border-white/[0.07] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                          Private investigation
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-white">
                          Conversation viewer
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                          Original platform messages between the two users
                          involved in this report.
                        </p>
                      </div>

                      <span className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
                        Read only
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    {conversationsLoading ? (
                      <div className="space-y-3">
                        <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                        <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-[#09090f] px-5 py-10 text-center">
                        <div className="mb-3 text-2xl text-gray-600">◉</div>
                        <p className="text-sm font-medium text-gray-300">
                          No matching conversations found
                        </p>
                        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500">
                          No conversation was found between these users that
                          matches the campaign and submission details of this
                          report. The report can still be investigated using
                          its other evidence.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-gray-400">
                            Select a conversation
                          </label>

                          <div className="space-y-2">
                            {conversations.map((conversation, index) => {
                              const active =
                                selectedConversationId ===
                                conversation.conversation_id;

                              return (
                                <button
                                  key={conversation.conversation_id}
                                  onClick={() =>
                                    void openConversation(
                                      selectedReport.report_id,
                                      conversation.conversation_id
                                    )
                                  }
                                  disabled={messagesLoading}
                                  className={`w-full rounded-xl border p-4 text-left transition ${
                                    active
                                      ? "border-violet-400/40 bg-violet-500/10"
                                      : "border-white/[0.07] bg-[#09090f] hover:border-violet-400/20 hover:bg-white/[0.025]"
                                  } disabled:cursor-wait disabled:opacity-60`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-white">
                                      Conversation {index + 1}
                                    </span>
                                    <span className="rounded-lg bg-white/[0.05] px-2 py-1 text-[11px] text-gray-400">
                                      {conversation.message_count} messages
                                    </span>
                                  </div>

                                  <p className="mt-2 break-all text-[11px] text-gray-500">
                                    ID: {conversation.conversation_id}
                                  </p>

                                  <p className="mt-2 text-xs text-gray-400">
                                    Created{" "}
                                    {formatDate(
                                      conversation.conversation_created_at
                                    )}
                                  </p>

                                  {conversation.campaign_id && (
                                    <p className="mt-1 break-all text-[11px] text-gray-500">
                                      Campaign: {shortId(conversation.campaign_id)}
                                    </p>
                                  )}

                                  {conversation.submission_id && (
                                    <p className="mt-1 break-all text-[11px] text-gray-500">
                                      Submission: {shortId(conversation.submission_id)}
                                    </p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {messagesLoading && (
                          <div className="space-y-3 rounded-xl border border-white/[0.06] bg-[#09090f] p-4">
                            <div className="h-5 w-40 animate-pulse rounded bg-white/[0.06]" />
                            <div className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
                            <div className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
                          </div>
                        )}

                        {!messagesLoading && selectedConversationId && (
                          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#09090f]">
                            <div className="border-b border-white/[0.07] p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h3 className="text-sm font-semibold text-white">
                                    Original conversation
                                  </h3>
                                  <p className="mt-1 break-all text-[10px] text-gray-600">
                                    {selectedConversationId}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {messages.length} messages
                                </span>
                              </div>
                            </div>

                            <div className="max-h-[600px] space-y-4 overflow-y-auto p-4">
                              {messages.length === 0 ? (
                                <div className="py-10 text-center">
                                  <p className="text-sm text-gray-400">
                                    This conversation has no messages.
                                  </p>
                                </div>
                              ) : (
                                messages.map((message) => {
                                  const isReporter =
                                    message.sender_id ===
                                    selectedReport.reporter_id;

                                  const isReportedUser =
                                    message.sender_id ===
                                    selectedReport.reported_user_id;

                                  return (
                                    <div
                                      key={message.message_id}
                                      className={`flex ${
                                        isReporter
                                          ? "justify-start"
                                          : isReportedUser
                                            ? "justify-end"
                                            : "justify-start"
                                      }`}
                                    >
                                      <div
                                        className={`w-full max-w-[88%] rounded-xl border p-3 ${
                                          isReporter
                                            ? "border-blue-400/15 bg-blue-500/[0.07]"
                                            : isReportedUser
                                              ? "border-violet-400/15 bg-violet-500/[0.08]"
                                              : "border-white/[0.08] bg-white/[0.035]"
                                        }`}
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`h-2 w-2 rounded-full ${
                                                isReporter
                                                  ? "bg-blue-400"
                                                  : isReportedUser
                                                    ? "bg-violet-400"
                                                    : "bg-gray-400"
                                              }`}
                                            />
                                            <span className="text-xs font-semibold text-gray-200">
                                              {getSenderLabel(message.sender_id)}
                                            </span>
                                          </div>

                                          <span className="text-[10px] text-gray-500">
                                            {getSenderRole(message.sender_id)}
                                          </span>
                                        </div>

                                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                                          {message.body}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
                                          <span className="text-[10px] text-gray-500">
                                            {formatDate(message.message_created_at)}
                                          </span>

                                          <span className="text-[10px] text-gray-600">
                                            {message.read_at
                                              ? "Read"
                                              : "Not marked as read"}
                                          </span>
                                        </div>

                                        <p className="mt-1 break-all text-[9px] text-gray-700">
                                          Sender ID: {message.sender_id}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            <div className="border-t border-white/[0.07] px-4 py-3">
                              <p className="text-center text-[11px] text-gray-500">
                                <span className="mr-1 text-violet-400">◈</span>
                                Original messages · Read-only investigation
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Investigation access history */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#11111c] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                        Security audit
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-white">
                        Investigation access history
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Records of administrators who opened conversations
                        related to this report.
                      </p>
                    </div>

                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-gray-400">
                      {investigationAccess.length} inspections
                    </span>
                  </div>

                  <div className="mt-5">
                    {accessLoading ? (
                      <div className="space-y-3">
                        <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                        <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                      </div>
                    ) : investigationAccess.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-[#09090f] px-4 py-8 text-center">
                        <p className="text-sm text-gray-400">
                          No conversation inspections recorded yet
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          Every successful conversation inspection will appear
                          here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {investigationAccess.map((entry, index) => (
                          <div
                            key={`${entry.conversation_id}-${entry.accessed_at}-${index}`}
                            className="rounded-xl border border-white/[0.06] bg-[#09090f] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-200">
                                Administrator inspection
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {formatDate(entry.accessed_at)}
                              </span>
                            </div>

                            <p className="mt-3 text-[11px] text-gray-500">
                              Administrator ID
                            </p>
                            <p className="mt-1 break-all text-xs text-gray-300">
                              {entry.admin_id}
                            </p>

                            <p className="mt-3 text-[11px] text-gray-500">
                              Conversation ID
                            </p>
                            <p className="mt-1 break-all text-xs text-gray-300">
                              {entry.conversation_id}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin actions */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#11111c] p-5">
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                      Moderator workspace
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      Manage report
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      All changes are recorded in the report activity history.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-400">
                        Report status
                      </label>

                      <select
                        value={newStatus}
                        onChange={(e) =>
                          setNewStatus(e.target.value as ReportStatus)
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60"
                      >
                        <option value="pending">Pending</option>
                        <option value="under_review">Under review</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-400">
                        Resolution note
                      </label>
                      <textarea
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        rows={3}
                        placeholder="Explain the decision or how the report was resolved..."
                        className="w-full resize-y rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus:border-violet-500/60"
                      />
                      <p className="mt-1 text-[11px] text-gray-600">
                        Saved as the report's resolution note and recorded in
                        its history.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-gray-400">
                        Internal admin note
                      </label>
                      <textarea
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        rows={3}
                        placeholder="Add a private investigation note for the admin team..."
                        className="w-full resize-y rounded-xl border border-white/10 bg-[#09090f] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus:border-violet-500/60"
                      />
                      <p className="mt-1 text-[11px] text-gray-600">
                        Internal notes are visible in admin activity history.
                      </p>
                    </div>

                    <button
                      onClick={() => void saveChanges()}
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving changes..." : "Save moderation changes"}
                      {!saving && <span>→</span>}
                    </button>
                  </div>
                </div>

                {/* Report activity history */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#11111c] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                        Audit trail
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-white">
                        Report activity history
                      </h2>
                    </div>
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-gray-400">
                      {activities.length} events
                    </span>
                  </div>

                  <div className="mt-5">
                    {activityLoading ? (
                      <div className="space-y-3">
                        <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                        <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-[#09090f] px-4 py-8 text-center">
                        <p className="text-sm text-gray-400">
                          No activity recorded yet
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          Administrative actions will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div
                            key={activity.activity_id}
                            className="relative rounded-xl border border-white/[0.06] bg-[#09090f] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-200">
                                  {activity.action_type === "status_changed"
                                    ? "Status changed"
                                    : activity.action_type === "internal_note"
                                      ? "Internal admin note"
                                      : activity.action_type === "resolution_note"
                                        ? "Resolution note updated"
                                        : "Report reviewed"}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  By {activity.admin_name || "Administrator"}
                                </p>
                              </div>

                              <span className="text-[11px] text-gray-600">
                                {formatDate(activity.created_at)}
                              </span>
                            </div>

                            {activity.action_type === "status_changed" && (
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-md bg-white/[0.05] px-2 py-1 text-gray-400">
                                  {activity.previous_status
                                    ? STATUS_LABELS[
                                        activity.previous_status as ReportStatus
                                      ] ?? activity.previous_status
                                    : "Unknown"}
                                </span>
                                <span className="text-gray-600">→</span>
                                <span className="rounded-md bg-violet-500/10 px-2 py-1 text-violet-300">
                                  {activity.new_status
                                    ? STATUS_LABELS[
                                        activity.new_status as ReportStatus
                                      ] ?? activity.new_status
                                    : "Unknown"}
                                </span>
                              </div>
                            )}

                            {activity.note && (
                              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-400">
                                {activity.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <p className="pb-4 text-center text-[11px] text-gray-600">
          ClipTN Administration · Reports & Moderation
        </p>
      </div>

      {/* Full-size screenshot preview */}
      {expandedEvidence && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setExpandedEvidence(null);
            }
          }}
        >
          <div className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#10101c] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  Evidence screenshot
                </p>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {expandedEvidence.path.split("/").pop()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExpandedEvidence(null)}
                aria-label="Close screenshot preview"
                className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/50 p-3 sm:p-6">
              <img
                src={expandedEvidence.signedUrl}
                alt="Full-size report evidence"
                className="max-h-[78vh] max-w-full rounded-lg object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
              <span className="text-[11px] text-gray-500">
                Private evidence · Temporary secure access
              </span>
              <a
                href={expandedEvidence.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-violet-300 transition hover:text-white"
              >
                Open original ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
