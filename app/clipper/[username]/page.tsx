
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ReportUserButton from "@/components/ReportUserButton";

type ClipperProfile = {
  user_id: string;
  username: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  skills: string[];
  editing_software: string[];
  languages: string[];
  social_links: Record<string, string>;
};

type PortfolioProject = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  platform: string | null;
  is_featured: boolean;
};

function safeUrl(value: string | undefined | null) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

const socialNames: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitch: "Twitch",
  website: "Website",
  twitter: "X / Twitter",
  x: "X",
  discord: "Discord",
};

function PublicClipperPortfolioContent() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [profile, setProfile] = useState<ClipperProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPublicPortfolio() {
      setLoading(true);
      setNotFound(false);
      setError("");

      const supabase = createClient();

      const { data: profileData, error: profileError } = await supabase
        .from("clipper_profiles")
        .select(
          "user_id, username, display_name, headline, bio, avatar_url, cover_image_url, skills, editing_software, languages, social_links"
        )
        .eq("username", username.toLowerCase())
        .eq("is_public", true)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setError("We couldn't load this portfolio. Please try again.");
        setLoading(false);
        return;
      }

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as ClipperProfile);

      const { data: projectData, error: projectError } = await supabase
        .from("portfolio_projects")
        .select(
          "id, title, description, video_url, thumbnail_url, category, platform, is_featured"
        )
        .eq("clipper_id", profileData.user_id)
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true });

      if (!active) return;

      if (projectError) {
        setError("Your profile loaded, but we couldn't load the projects.");
      } else {
        setProjects((projectData ?? []) as PortfolioProject[]);
      }

      setLoading(false);
    }

    if (username) {
      loadPublicPortfolio();
    }

    return () => {
      active = false;
    };
  }, [username]);

  const pageStyles = (
    <style jsx global>{`
      @keyframes cliptn-float {
        0%, 100% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(0, -14px, 0);
        }
      }

      @keyframes cliptn-drift {
        0% {
          transform: translate3d(-2%, 0, 0) scale(1);
        }
        50% {
          transform: translate3d(2%, 2%, 0) scale(1.05);
        }
        100% {
          transform: translate3d(-2%, 0, 0) scale(1);
        }
      }

      .cliptn-grid {
        background-image:
          linear-gradient(rgba(168, 85, 247, .045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(168, 85, 247, .045) 1px, transparent 1px);
        background-size: 58px 58px;
        mask-image: linear-gradient(to bottom, black, transparent 85%);
      }

      .cliptn-float {
        animation: cliptn-float 8s ease-in-out infinite;
      }

      .cliptn-drift {
        animation: cliptn-drift 18s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .cliptn-float,
        .cliptn-drift {
          animation: none !important;
        }
      }
    `}</style>
  );

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070711] text-white">
        {pageStyles}

        <div className="pointer-events-none absolute inset-0 cliptn-grid" />

        <div className="cliptn-drift pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[140px]" />

        <div className="relative text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Loading creator portfolio...
          </p>
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070711] px-6 text-white">
        {pageStyles}

        <div className="pointer-events-none absolute inset-0 cliptn-grid" />

        <div className="cliptn-drift pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[140px]" />

        <div className="relative max-w-md text-center">
          <div className="mb-5 text-6xl">👤</div>

          <h1 className="text-3xl font-black">
            Portfolio not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This portfolio may not exist or may not be publicly available.
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold transition hover:bg-violet-500"
          >
            Back to ClipTN
          </Link>
        </div>
      </main>
    );
  }

  const displayName =
    profile.display_name?.trim() || profile.username;

  const socials = Object.entries(profile.social_links ?? {})
    .map(([key, value]) => ({
      key,
      name: socialNames[key.toLowerCase()] ?? key,
      url: safeUrl(value),
    }))
    .filter((item) => item.url);

  const avatarUrl = safeUrl(profile.avatar_url);
  const coverUrl = safeUrl(profile.cover_image_url);

  const featuredProjects = projects.filter(
    (project) => project.is_featured
  );

  const initials = displayName.charAt(0).toUpperCase();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070711] text-white">
      {pageStyles}

      <div className="pointer-events-none absolute inset-0 cliptn-grid" />

      <div className="cliptn-drift pointer-events-none absolute -top-48 left-1/3 h-[620px] w-[780px] rounded-full bg-violet-700/[0.14] blur-[150px]" />

      <div className="cliptn-drift pointer-events-none absolute right-[-180px] top-[700px] h-[520px] w-[520px] rounded-full bg-blue-600/[0.10] blur-[150px]" />

      <div className="cliptn-float pointer-events-none absolute left-[5%] top-[45%] h-2 w-2 rounded-full bg-violet-300/50 shadow-[0_0_24px_rgba(167,139,250,.7)]" />

      <div className="cliptn-float pointer-events-none absolute right-[12%] top-[30%] h-1.5 w-1.5 rounded-full bg-blue-300/50 shadow-[0_0_20px_rgba(96,165,250,.7)]" />

      <div className="relative mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">
        <header className="flex items-center justify-between border-b border-white/[0.08] pb-6">
          <Link
            href="/"
            className="text-2xl font-black tracking-tight"
          >
            Clip<span className="text-violet-400">TN</span>
          </Link>

          <Link
            href="/join"
            className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-500/20 sm:text-sm"
          >
            Join ClipTN <span aria-hidden="true">↗</span>
          </Link>
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
            {error}
          </div>
        )}

        <section className="relative mt-9 overflow-hidden rounded-[30px] border border-white/[0.10] bg-[#11111b] shadow-[0_30px_100px_rgba(0,0,0,.25)]">
          <div className="relative h-44 overflow-hidden sm:h-64">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={`${displayName} portfolio cover`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-[#17152b] to-blue-950">
                <div className="cliptn-drift absolute -left-16 -top-24 h-72 w-72 rounded-full bg-violet-500/25 blur-[90px]" />

                <div className="absolute right-[-40px] top-[-80px] h-80 w-80 rounded-full bg-blue-500/20 blur-[100px]" />

                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_30%,rgba(255,255,255,.04)_50%,transparent_70%)]" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#11111b] via-[#11111b]/10 to-black/10" />

            <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md sm:left-8 sm:top-8">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
              Creator portfolio
            </div>
          </div>

          <div className="relative px-6 pb-8 sm:px-10 sm:pb-10">
            <div className="-mt-16 flex flex-col gap-5 sm:-mt-[76px] sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end">
                <div className="cliptn-float relative h-28 w-28 shrink-0 overflow-hidden rounded-[28px] border-[5px] border-[#11111b] bg-gradient-to-br from-violet-500 to-blue-600 shadow-[0_15px_45px_rgba(0,0,0,.45)] sm:h-36 sm:w-36 sm:rounded-[32px]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white sm:text-5xl">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="min-w-0 pb-1">
                  <h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl">
                    {displayName}
                  </h1>

                  <p className="mt-2 text-sm font-medium text-violet-300">
                    @{profile.username}
                  </p>

                  {profile.headline && (
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                      {profile.headline}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-xs font-semibold text-zinc-300">
                  <span className="text-violet-300">✦</span>
                  ClipTN Creator
                </div>

                <ReportUserButton
                  reportedUserId={profile.user_id}
                  reportedUsername={profile.username}
                />
              </div>
            </div>

            {socials.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <a
                    key={social.key}
                    href={social.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/[0.09] bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-violet-400/35 hover:bg-violet-500/[0.08] hover:text-white"
                  >
                    {social.name} <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {profile.bio && (
          <section className="mt-10">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-400 to-blue-400" />

              <h2 className="text-xl font-bold">
                About me
              </h2>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#11111b]/85 p-6 backdrop-blur-sm sm:p-7">
              <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                {profile.bio}
              </p>
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-400 to-blue-400" />

            <div>
              <h2 className="text-xl font-bold">
                Creative toolkit
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Skills, tools and languages this creator works with.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Skills",
                items: profile.skills ?? [],
                icon: "✦",
              },
              {
                title: "Editing software",
                items: profile.editing_software ?? [],
                icon: "◈",
              },
              {
                title: "Languages",
                items: profile.languages ?? [],
                icon: "◎",
              },
            ].map((group) => (
              <div
                key={group.title}
                className="rounded-2xl border border-white/[0.08] bg-[#11111b]/85 p-5 backdrop-blur-sm transition hover:border-violet-400/20"
              >
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="text-violet-300">
                    {group.icon}
                  </span>

                  <h3 className="text-sm font-bold">
                    {group.title}
                  </h3>
                </div>

                {group.items.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">
                    Not added yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {featuredProjects.length > 0 && (
          <section className="mt-12">
            <div className="mb-6">
              <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                <span className="h-px w-5 bg-violet-400/60" />
                Creator highlights
              </div>

              <h2 className="text-2xl font-black sm:text-3xl">
                Featured work
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                A few projects this creator wants you to see first.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {featuredProjects.map((project) => {
                const videoUrl = safeUrl(project.video_url);
                const thumbnailUrl = safeUrl(project.thumbnail_url);

                return (
                  <article
                    key={project.id}
                    className="group overflow-hidden rounded-2xl border border-violet-400/15 bg-[#11111b]/90 transition duration-300 hover:-translate-y-1 hover:border-violet-400/35 hover:shadow-[0_20px_60px_rgba(91,33,182,.12)]"
                  >
                    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-violet-950/70 to-[#080810]">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={project.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-5xl text-violet-300/40">
                          ▶
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />

                      <span className="absolute left-4 top-4 rounded-full border border-violet-300/20 bg-black/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200 backdrop-blur">
                        ✦ Featured
                      </span>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {project.platform && (
                          <span className="rounded-md bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                            {project.platform}
                          </span>
                        )}

                        {project.category && (
                          <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-zinc-400">
                            {project.category}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold">
                        {project.title}
                      </h3>

                      {project.description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500">
                          {project.description}
                        </p>
                      )}

                      {videoUrl && (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-violet-300 transition hover:text-violet-200"
                        >
                          Watch project <span aria-hidden="true">↗</span>
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                <span className="h-px w-5 bg-violet-400/60" />
                Portfolio
              </div>

              <h2 className="text-2xl font-black sm:text-3xl">
                {featuredProjects.length > 0
                  ? "More projects"
                  : "Portfolio projects"}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                A showcase of this creator's published work.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-zinc-400">
              {projects.length}{" "}
              {projects.length === 1 ? "project" : "projects"}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#11111b]/60 px-6 py-16 text-center">
              <div className="mb-4 text-4xl">🎬</div>

              <h3 className="text-lg font-bold">
                Work is on the way
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                This creator hasn't published any projects yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects
                .filter((project) => !project.is_featured)
                .map((project) => {
                  const videoUrl = safeUrl(project.video_url);
                  const thumbnailUrl = safeUrl(project.thumbnail_url);

                  return (
                    <article
                      key={project.id}
                      className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11111b]/90 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_20px_60px_rgba(91,33,182,.12)]"
                    >
                      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-violet-950/70 to-[#080810]">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={project.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-5xl text-violet-300/40">
                            ▶
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent opacity-70" />
                      </div>

                      <div className="p-5">
                        <div className="mb-3 flex flex-wrap gap-2">
                          {project.platform && (
                            <span className="rounded-md bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                              {project.platform}
                            </span>
                          )}

                          {project.category && (
                            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-zinc-400">
                              {project.category}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold">
                          {project.title}
                        </h3>

                        {project.description && (
                          <p className="mt-2 line-clamp-3 text-xs leading-6 text-zinc-500">
                            {project.description}
                          </p>
                        )}

                        {videoUrl && (
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-violet-300 transition hover:text-violet-200"
                          >
                            Watch project <span aria-hidden="true">↗</span>
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </section>

        <footer className="mt-20 border-t border-white/[0.08] py-8 text-center">
          <Link
            href="/"
            className="text-xl font-black tracking-tight"
          >
            Clip<span className="text-violet-400">TN</span>
          </Link>

          <p className="mt-3 text-xs text-zinc-600">
            Discover creators. Build opportunities. Made for Tunisia.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default function PublicClipperPortfolio() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070711] text-white">
          <div className="text-center">
            <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
            <p className="text-sm text-zinc-400">
              Loading creator portfolio...
            </p>
          </div>
        </main>
      }
    >
      <PublicClipperPortfolioContent />
    </Suspense>
  );
}
