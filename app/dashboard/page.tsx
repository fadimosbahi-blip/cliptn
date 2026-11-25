
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string;
  role: "streamer" | "clipper";
  country: string;
};

type NavItem = {
  label: string;
  symbol: string;
  href: string;
  active?: boolean;
};

type Activity = {
  id: string;
  title: string;
  description: string;
  date: string;
  href: string;
  symbol: string;
};

type CampaignActivity = {
  id: string;
  title: string;
  created_at: string;
};

type SubmissionActivity = {
  id: string;
  campaign_id: string;
  status: string;
  submitted_at: string;
};

type RewardActivity = {
  submission_id: string;
  reward_status: string;
  reward_amount: number | string;
  updated_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portfolioUsername, setPortfolioUsername] = useState<string | null>(null);
  const [streamerUsername, setStreamerUsername] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const userId = authData.user.id;
      setEmail(authData.user.email ?? "");

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, role, country")
          .eq("id", userId)
          .single();

      if (!active) return;

      if (profileError || !profileData) {
        setError("We couldn't load your profile. Please refresh the page.");
        setLoading(false);
        setActivityLoading(false);
        return;
      }

      const userProfile = profileData as Profile;
      setProfile(userProfile);

      if (userProfile.role === "clipper") {
        const { data: portfolioData } = await supabase
          .from("clipper_profiles")
          .select("username")
          .eq("user_id", userId)
          .maybeSingle();

        if (active) {
          setPortfolioUsername(portfolioData?.username ?? null);
        }
      }

      if (userProfile.role === "streamer") {
        const { data: streamerData } = await supabase
          .from("streamer_profiles")
          .select("username")
          .eq("user_id", userId)
          .maybeSingle();

        if (active) {
          setStreamerUsername(streamerData?.username ?? null);
        }
      }

      try {
        const newActivities: Activity[] = [];
        let campaigns: CampaignActivity[] = [];
        let submissions: SubmissionActivity[] = [];

        if (userProfile.role === "streamer") {
          const { data: campaignData, error: campaignError } =
            await supabase
              .from("campaigns")
              .select("id, title, created_at")
              .eq("streamer_id", userId)
              .order("created_at", { ascending: false })
              .limit(20);

          if (campaignError) throw campaignError;

          campaigns = (campaignData ?? []) as CampaignActivity[];

          for (const campaign of campaigns) {
            newActivities.push({
              id: `campaign-${campaign.id}`,
              title: "Campaign created",
              description: campaign.title,
              date: campaign.created_at,
              href: `/my-campaigns/${campaign.id}`,
              symbol: "◇",
            });
          }

          const campaignIds = campaigns.map((campaign) => campaign.id);

          if (campaignIds.length > 0) {
            const { data: submissionData, error: submissionError } =
              await supabase
                .from("submissions")
                .select("id, campaign_id, status, submitted_at")
                .in("campaign_id", campaignIds)
                .order("submitted_at", { ascending: false })
                .limit(30);

            if (submissionError) throw submissionError;
            submissions = (submissionData ?? []) as SubmissionActivity[];
          }
        } else {
          const { data: submissionData, error: submissionError } =
            await supabase
              .from("submissions")
              .select("id, campaign_id, status, submitted_at")
              .eq("clipper_id", userId)
              .order("submitted_at", { ascending: false })
              .limit(30);

          if (submissionError) throw submissionError;
          submissions = (submissionData ?? []) as SubmissionActivity[];

          const campaignIds = [
            ...new Set(submissions.map((submission) => submission.campaign_id)),
          ];

          if (campaignIds.length > 0) {
            const { data: campaignData, error: campaignError } =
              await supabase
                .from("campaigns")
                .select("id, title")
                .in("id", campaignIds);

            if (campaignError) throw campaignError;

            campaigns = (campaignData ?? []).map((campaign) => ({
              ...campaign,
              created_at: "",
            })) as CampaignActivity[];
          }
        }

        const campaignTitles = new Map(
          campaigns.map((campaign) => [campaign.id, campaign.title])
        );

        for (const submission of submissions) {
          const campaignTitle =
            campaignTitles.get(submission.campaign_id) ?? "Campaign";
          const readableStatus = submission.status.replaceAll("_", " ");

          newActivities.push({
            id: `submission-${submission.id}`,
            title:
              userProfile.role === "streamer"
                ? "New clip submitted"
                : "Clip submitted",
            description: `${campaignTitle} · Status: ${readableStatus}`,
            date: submission.submitted_at,
            href:
              userProfile.role === "streamer"
                ? "/submissions"
                : "/my-submissions",
            symbol: "▤",
          });
        }

        const submissionIds = submissions.map((submission) => submission.id);

        if (submissionIds.length > 0) {
          const { data: rewardData, error: rewardError } =
            await supabase
              .from("submission_rewards")
              .select("submission_id, reward_status, reward_amount, updated_at")
              .in("submission_id", submissionIds);

          if (rewardError) throw rewardError;

          const rewards = (rewardData ?? []) as RewardActivity[];

          for (const reward of rewards) {
            if (
              !["approved", "rejected", "paid"].includes(reward.reward_status)
            ) {
              continue;
            }

            const submission = submissions.find(
              (item) => item.id === reward.submission_id
            );

            if (!submission) continue;

            const campaignTitle =
              campaignTitles.get(submission.campaign_id) ?? "Campaign";
            const amount = Number(reward.reward_amount).toFixed(3);

            newActivities.push({
              id: `reward-${reward.submission_id}`,
              title: `Reward ${reward.reward_status}`,
              description: `${campaignTitle} · ${amount} TND`,
              date: reward.updated_at,
              href:
                userProfile.role === "streamer"
                  ? "/submissions"
                  : reward.reward_status === "paid"
                    ? "/earnings"
                    : "/my-submissions",
              symbol: "◈",
            });
          }
        }

        newActivities.sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        if (active) setActivities(newActivities.slice(0, 6));
      } catch (activityError) {
        console.error("Recent activity error:", activityError);

        if (active) {
          setError(
            "Your profile loaded, but we couldn't retrieve recent activity."
          );
        }
      } finally {
        if (active) {
          setActivityLoading(false);
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [router]);

  // Keep the unread count synchronized with the messages table.
  useEffect(() => {
    let active = true;
    let channel: ReturnType<
      ReturnType<typeof createClient>["channel"]
    > | null = null;

    const supabase = createClient();

    async function setupUnreadListener() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active || authError || !authData.user) return;

      const userId = authData.user.id;

      async function loadUnreadCount() {
        const { data: conversations, error: conversationError } =
          await supabase
            .from("conversations")
            .select("id")
            .or(`streamer_id.eq.${userId},clipper_id.eq.${userId}`);

        if (conversationError) {
          console.error("Unread conversations error:", conversationError);
          return;
        }

        const conversationIds = (conversations ?? []).map(
          (conversation) => conversation.id
        );

        if (conversationIds.length === 0) {
          if (active) setUnreadCount(0);
          return;
        }

        const { count, error: messageError } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", conversationIds)
          .neq("sender_id", userId)
          .is("read_at", null);

        if (messageError) {
          console.error("Unread messages error:", messageError);
          return;
        }

        if (active) setUnreadCount(count ?? 0);
      }

      await loadUnreadCount();

      if (!active) return;

      channel = supabase
        .channel(`dashboard-unread-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => {
            void loadUnreadCount();
          }
        )
        .subscribe();
    }

    void setupUnreadListener();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  async function handleLogout() {
    setSigningOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      setSigningOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Preparing your ClipTN workspace...
          </p>
        </div>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] p-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#15131f] p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-300">
            !
          </div>
          <h1 className="mb-3 text-xl font-bold">Something went wrong</h1>
          <p className="text-sm leading-6 text-red-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const isClipper = profile.role === "clipper";
  const firstName = profile.full_name.split(" ")[0];

  const initials = profile.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const navigation: NavItem[] = isClipper
    ? [
        { label: "Overview", symbol: "▦", href: "/dashboard", active: true },
        { label: "Discover Campaigns", symbol: "◇", href: "/discover-campaigns" },
        { label: "My Portfolio", symbol: "▣", href: "/portfolio" },
        { label: "Manage Projects", symbol: "▶", href: "/portfolio/projects" },
        { label: "My Submissions", symbol: "▤", href: "/my-submissions" },
        { label: "Earnings", symbol: "◈", href: "/earnings" },
        { label: "Settings", symbol: "⚙", href: "/settings" },
      ]
    : [
        { label: "Overview", symbol: "▦", href: "/dashboard", active: true },
        { label: "My Campaigns", symbol: "◇", href: "/my-campaigns" },
        { label: "Create Campaign", symbol: "+", href: "/create-campaign" },
        { label: "Submissions", symbol: "▤", href: "/submissions" },
        { label: "Analytics", symbol: "▥", href: "/analytics" },
        { label: "My Showcase", symbol: "▣", href: "/streamer-profile" },
        { label: "Settings", symbol: "⚙", href: "/settings" },
      ];

  return (
    <main className="dashboard-page relative isolate min-h-screen overflow-hidden text-white">
      {/* Same animated background used by the messaging page */}
      <div className="dashboard-background pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-orb orb-purple" />
        <div className="ambient-orb orb-blue" />
        <div className="ambient-orb orb-bottom" />
        <div className="ambient-ribbon ribbon-left" />
        <div className="ambient-ribbon ribbon-right" />
        <div className="ambient-particles" />
        <div className="ambient-grid" />
      </div>

      <style>{`
        .dashboard-page {
          background:
            radial-gradient(ellipse at 12% 0%, rgba(88, 28, 180, 0.12), transparent 36%),
            radial-gradient(ellipse at 95% 10%, rgba(25, 65, 200, 0.10), transparent 32%),
            #080810;
        }

        .dashboard-background { opacity: 0.95; }

        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.28;
          animation: orbFloat 14s ease-in-out infinite alternate;
        }

        .orb-purple {
          width: 460px;
          height: 460px;
          top: -220px;
          left: -150px;
          background: #7019ff;
        }

        .orb-blue {
          width: 500px;
          height: 500px;
          top: -180px;
          right: -220px;
          background: #143bff;
          animation-delay: -5s;
        }

        .orb-bottom {
          width: 550px;
          height: 400px;
          bottom: -280px;
          left: 35%;
          background: #5b0bff;
          animation-delay: -8s;
        }

        .ambient-ribbon {
          position: absolute;
          width: 65%;
          height: 280px;
          border-radius: 50%;
          border: 1px solid rgba(139, 55, 255, 0.12);
          filter: blur(1px);
          transform: rotate(-14deg);
        }

        .ribbon-left {
          top: 5%;
          left: -35%;
          box-shadow: 0 0 35px rgba(126, 34, 206, 0.08),
            inset 0 0 35px rgba(126, 34, 206, 0.05);
        }

        .ribbon-right {
          bottom: 0;
          right: -35%;
          border-color: rgba(59, 90, 255, 0.13);
          transform: rotate(-18deg);
          box-shadow: 0 0 40px rgba(59, 90, 255, 0.08),
            inset 0 0 35px rgba(59, 90, 255, 0.04);
        }

        .ambient-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(105, 68, 255, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(105, 68, 255, 0.055) 1px, transparent 1px);
          background-size: 70px 70px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%);
          opacity: 0.65;
        }

        .ambient-particles {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(2px 2px at 15% 25%, rgba(177, 110, 255, 0.8), transparent),
            radial-gradient(2px 2px at 75% 18%, rgba(93, 130, 255, 0.8), transparent),
            radial-gradient(3px 3px at 42% 65%, rgba(151, 67, 255, 0.7), transparent),
            radial-gradient(2px 2px at 85% 72%, rgba(108, 100, 255, 0.8), transparent),
            radial-gradient(2px 2px at 28% 82%, rgba(177, 110, 255, 0.7), transparent);
          background-size: 420px 380px;
          animation: particleDrift 35s linear infinite;
          opacity: 0.55;
        }

        @keyframes orbFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(60px, 35px, 0) scale(1.15); }
        }

        @keyframes particleDrift {
          0% { background-position: 0 0; }
          100% { background-position: 420px 380px; }
        }

        @keyframes dashboardGlow {
          0%, 100% { opacity: .25; transform: scale(1); }
          50% { opacity: .55; transform: scale(1.12); }
        }

        @keyframes dashboardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes dashboardEnter {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-glow { animation: dashboardGlow 8s ease-in-out infinite; }
        .dashboard-float { animation: dashboardFloat 6s ease-in-out infinite; }
        .dashboard-enter { animation: dashboardEnter .65s ease-out both; }
        .dashboard-delay-1 { animation-delay: .08s; }
        .dashboard-delay-2 { animation-delay: .16s; }
        .dashboard-delay-3 { animation-delay: .24s; }

        .dashboard-card {
          transition: transform .3s ease, border-color .3s ease,
            box-shadow .3s ease, background-color .3s ease;
        }

        .dashboard-card:hover {
          transform: translateY(-4px);
          border-color: rgba(167,139,250,.35);
          box-shadow: 0 15px 45px rgba(91,33,182,.09);
        }

        .dashboard-nav {
          transition: background-color .2s ease, color .2s ease,
            border-color .2s ease, transform .2s ease;
        }

        .dashboard-nav:hover { transform: translateX(3px); }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
          .ambient-orb, .ambient-particles { animation: none; }
        }
      `}</style>

      <div className="relative z-10 flex min-h-screen">
        {mobileMenuOpen && (
          <button
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/[0.07] bg-[#100f18]/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0 md:shadow-none ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-[82px] items-center justify-between border-b border-white/[0.07] px-7">
            <Link href="/dashboard" className="group flex items-center">
              <span className="text-2xl font-black tracking-tight">
                Clip<span className="text-violet-400 transition group-hover:text-fuchsia-300">TN</span>
              </span>
              <span className="ml-2 rounded-md border border-violet-400/20 bg-violet-400/[0.08] px-2 py-1 text-[9px] font-bold tracking-[0.17em] text-violet-300">
                BETA
              </span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-xl text-zinc-500 transition hover:text-white md:hidden"
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          <div className="px-5 pt-8">
            <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">
              Workspace
            </p>

            <nav className="space-y-1.5">
              {navigation.map((item) => {
                const className = `dashboard-nav flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm ${
                  item.active
                    ? "border-violet-400/20 bg-gradient-to-r from-violet-500/[0.15] to-violet-500/[0.04] text-violet-200 shadow-lg shadow-violet-950/10"
                    : "border-transparent text-zinc-400 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white"
                }`;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={className}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-base ${
                          item.active
                            ? "bg-violet-400/15 text-violet-300"
                            : "text-zinc-500"
                        }`}
                      >
                        {item.symbol}
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-5">
            <div className="mb-4 overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.12] to-transparent p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Workspace active
                </span>
              </div>
              <p className="text-xs leading-5 text-zinc-400">
                Your ClipTN journey starts here.
              </p>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold shadow-lg shadow-violet-950/30">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {profile.full_name}
                </p>
                <p className="mt-0.5 text-xs capitalize text-zinc-500">
                  {profile.role} account
                </p>
              </div>
              <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            </div>

            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-red-500/[0.08] hover:text-red-300 disabled:opacity-50"
            >
              <span className="text-lg">↪</span>
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </aside>

        <section className="relative min-w-0 flex-1">
          <div className="dashboard-glow pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/[0.10] blur-[120px]" />

          <header className="sticky top-0 z-30 flex h-[82px] items-center justify-between border-b border-white/[0.07] bg-[#080810]/75 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-lg text-zinc-300 transition hover:bg-white/[0.08] md:hidden"
                aria-label="Open menu"
              >
                ☰
              </button>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Your workspace
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Overview
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-300">
                  Account connected
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold shadow-lg shadow-violet-950/20">
                {initials}
              </div>
            </div>
          </header>

          <div className="relative mx-auto max-w-7xl p-5 sm:p-8 lg:p-10">
            {error && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="dashboard-enter mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  Welcome to ClipTN
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                    {firstName}
                  </span>
                  .
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">
                  {isClipper
                    ? "Discover opportunities, create great clips, and grow your creator journey."
                    : "Launch campaigns, discover talented clippers, and grow your audience."}
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-lg text-violet-300">
                  {isClipper ? "✂" : "◈"}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Your workspace
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize">
                    {profile.role} account
                  </p>
                </div>
              </div>
            </div>

            <div className="dashboard-enter dashboard-delay-1 mb-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="dashboard-card rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#191625]/95 to-[#111019]/95 p-6 backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Account type</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-lg text-violet-300">
                    ◈
                  </span>
                </div>
                <h2 className="text-2xl font-bold capitalize">{profile.role}</h2>
                <p className="mt-2 text-xs text-zinc-500">
                  Your ClipTN account role
                </p>
              </div>

              <div className="dashboard-card rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#191625]/95 to-[#111019]/95 p-6 backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Country</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-lg text-violet-300">
                    ⌖
                  </span>
                </div>
                <h2 className="text-2xl font-bold">
                  {profile.country === "TN" ? "Tunisia" : profile.country}
                </h2>
                <p className="mt-2 text-xs text-zinc-500">
                  Your registered country
                </p>
              </div>

              <div className="dashboard-card rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#191625]/95 to-[#111019]/95 p-6 backdrop-blur-xl sm:col-span-2 lg:col-span-1">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Account status</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.08] text-lg text-emerald-300">
                    ✓
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-emerald-300">
                  Connected
                </h2>
                <p className="mt-2 text-xs text-zinc-500">
                  Your account is signed in
                </p>
              </div>
            </div>

            <div className="dashboard-enter dashboard-delay-2 relative mb-9 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-[#25183d]/95 via-[#181426]/95 to-[#11101a]/95 p-7 shadow-2xl shadow-violet-950/10 backdrop-blur-xl sm:p-9">
              <div className="dashboard-glow pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-violet-500/20 blur-[90px]" />
              <div className="dashboard-float pointer-events-none absolute right-[12%] top-[15%] hidden h-24 w-24 rotate-12 rounded-3xl border border-violet-300/10 bg-violet-300/[0.03] lg:block" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-1/2 w-1/2 bg-gradient-to-tl from-violet-500/[0.06] to-transparent" />

              <div className="relative max-w-2xl">
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                  {isClipper ? "For clippers" : "For streamers"}
                </span>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {isClipper
                    ? "Your next opportunity starts here."
                    : "Your next campaign starts here."}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">
                  {isClipper
                    ? "Explore active creator campaigns, discover content and find new clipping opportunities."
                    : "Create a campaign, set your budget and reward rate, and give clippers an opportunity to promote your content."}
                </p>
                <Link
                  href={isClipper ? "/discover-campaigns" : "/create-campaign"}
                  className="mt-7 inline-flex items-center gap-3 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-violet-900/30"
                >
                  {isClipper ? "Explore campaigns" : "Create a campaign"}
                  <span className="text-lg">→</span>
                </Link>
              </div>
            </div>

            {isClipper && (
              <section className="dashboard-enter dashboard-delay-2 mb-9 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-[#201638]/95 via-[#151321]/95 to-[#111019]/95 p-6 shadow-xl shadow-violet-950/10 backdrop-blur-xl sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                      Your creator identity
                    </div>
                    <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                      Your portfolio, your showcase.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">
                      Build your public creator page, add your best editing work,
                      and share your portfolio with streamers—even if they don't have a ClipTN account.
                    </p>
                    <p className="mt-3 text-xs text-zinc-500">
                      {portfolioUsername
                        ? `Your public address: getcliptn.com/clipper/${portfolioUsername}`
                        : "Set up your portfolio to create your own public creator page."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 lg:max-w-[360px] lg:justify-end">
                    <Link
                      href="/portfolio"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/25 transition hover:-translate-y-0.5 hover:bg-violet-500"
                    >
                      Edit portfolio <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      href="/portfolio/projects"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-violet-400/30 hover:bg-white/[0.07]"
                    >
                      Manage projects <span aria-hidden="true">↗</span>
                    </Link>
                    {portfolioUsername && (
                      <Link
                        href={`/clipper/${encodeURIComponent(portfolioUsername)}`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-5 py-3.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/[0.12]"
                      >
                        View public page <span aria-hidden="true">↗</span>
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            )}

            {!isClipper && (
              <section className="dashboard-enter dashboard-delay-2 mb-9 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-[#201638]/95 via-[#151321]/95 to-[#111019]/95 p-6 shadow-xl shadow-violet-950/10 backdrop-blur-xl sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                      Your streamer identity
                    </div>
                    <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                      Your channel, your showcase.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">
                      Create your public streamer page, introduce your channel,
                      add your socials, and give clippers a place to discover you.
                    </p>
                    <p className="mt-3 break-all text-xs text-zinc-500">
                      {streamerUsername
                        ? `Your public address: getcliptn.com/streamer/${streamerUsername}`
                        : "Set up your showcase to create your public streamer page."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 lg:max-w-[360px] lg:justify-end">
                    <Link
                      href="/streamer-profile"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/25 transition hover:-translate-y-0.5 hover:bg-violet-500"
                    >
                      Edit showcase <span aria-hidden="true">→</span>
                    </Link>
                    {streamerUsername && (
                      <Link
                        href={`/streamer/${encodeURIComponent(streamerUsername)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-5 py-3.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/[0.12]"
                      >
                        View public page <span aria-hidden="true">↗</span>
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            )}

            <div className="dashboard-enter dashboard-delay-3 grid gap-5 lg:grid-cols-2">
              <div className="dashboard-card rounded-2xl border border-white/[0.07] bg-[#12111b]/90 p-6 backdrop-blur-xl sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Recent activity</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      What's happening in your workspace
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-lg text-violet-300">
                    ◷
                  </span>
                </div>

                <div className="mt-7 space-y-3">
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.015] px-5 py-10 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/[0.09] text-2xl text-violet-300">
                        ◷
                      </div>
                      <p className="text-sm font-semibold text-zinc-300">
                        Your story starts here
                      </p>
                      <p className="mt-2 max-w-xs text-xs leading-6 text-zinc-500">
                        Your recent campaigns, submissions and rewards will appear here.
                      </p>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <Link
                        key={activity.id}
                        href={activity.href}
                        className="group flex items-start gap-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4 transition hover:border-violet-400/20 hover:bg-violet-400/[0.04]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-lg text-violet-300">
                          {activity.symbol}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-200 transition group-hover:text-violet-300">
                            {activity.title}
                          </p>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {activity.description}
                          </p>
                          <p className="mt-2 text-[10px] text-zinc-600">
                            {new Date(activity.date).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <span className="mt-2 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-violet-300">
                          →
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="dashboard-card rounded-2xl border border-white/[0.07] bg-[#12111b]/90 p-6 backdrop-blur-xl sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Your account</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Your registered account details
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-lg text-violet-300">
                    ◈
                  </span>
                </div>

                <div className="mt-7 space-y-5">
                  <div className="border-b border-white/[0.06] pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      Full name
                    </p>
                    <p className="mt-2 break-words text-sm font-medium text-zinc-200">
                      {profile.full_name}
                    </p>
                  </div>
                  <div className="border-b border-white/[0.06] pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      Email address
                    </p>
                    <p className="mt-2 break-all text-sm font-medium text-zinc-200">
                      {email}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      Account type
                    </p>
                    <p className="mt-2 text-sm font-medium capitalize text-zinc-200">
                      {profile.role}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-4 py-3 text-sm font-semibold text-violet-300 transition hover:bg-violet-400/[0.12]"
                  >
                    Manage account settings <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600 sm:flex-row sm:text-left">
              <p>© {new Date().getFullYear()} ClipTN. All rights reserved.</p>
              <p>Built for creators. Made with ambition in Tunisia 🇹🇳</p>
            </footer>
          </div>
        </section>
      </div>

      {/* Floating messaging launcher */}
      <Link
        href="/messages"
        aria-label={
          unreadCount > 0
            ? `Open messages. ${unreadCount} unread messages`
            : "Open messages"
        }
        className="group fixed bottom-6 right-6 z-[70] flex items-center gap-3"
      >
        <div className="max-w-0 overflow-hidden rounded-2xl border border-violet-400/20 bg-[#171326]/95 px-0 py-3 opacity-0 shadow-2xl shadow-violet-950/40 backdrop-blur-xl transition-all duration-300 group-hover:max-w-[240px] group-hover:px-5 group-hover:opacity-100">
          <div className="whitespace-nowrap">
            <p className="text-sm font-bold text-white">Messages</p>
            <p className="mt-0.5 text-[11px] text-violet-300">
              {unreadCount > 0
                ? `${unreadCount} unread ${unreadCount === 1 ? "message" : "messages"}`
                : "Open your inbox"}
            </p>
          </div>
        </div>

        <div className="relative flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700 text-white shadow-[0_8px_35px_rgba(124,58,237,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_8px_45px_rgba(139,92,246,0.6)] group-active:scale-95">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="27"
            height="27"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
          </svg>

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#080810] bg-fuchsia-500 px-1.5 text-[10px] font-black text-white shadow-lg shadow-fuchsia-950/40">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}

          <span className="absolute inset-0 rounded-full border border-white/20 opacity-0 transition duration-300 group-hover:scale-125 group-hover:opacity-100" />
        </div>
      </Link>
    </main>
  );
}
