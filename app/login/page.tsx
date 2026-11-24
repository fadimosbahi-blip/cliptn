
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(formData.get("password") || "");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#080810] text-white">
      <style>{`
        @keyframes authGlow {
          0%, 100% { opacity: .35; transform: scale(1); }
          50% { opacity: .7; transform: scale(1.15); }
        }

        @keyframes authFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        @keyframes authEnter {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-glow {
          animation: authGlow 9s ease-in-out infinite;
        }

        .auth-float {
          animation: authFloat 7s ease-in-out infinite;
        }

        .auth-enter {
          animation: authEnter .7s ease-out both;
        }

        .auth-delay-1 { animation-delay: .12s; }
        .auth-delay-2 { animation-delay: .22s; }

        .auth-input {
          transition: border-color .2s ease, background-color .2s ease,
            box-shadow .2s ease;
        }

        .auth-input:focus {
          border-color: rgba(167,139,250,.75);
          background: rgba(18,15,31,.95);
          box-shadow: 0 0 0 4px rgba(139,92,246,.10);
          outline: none;
        }

        .auth-button {
          transition: transform .2s ease, background-color .2s ease,
            box-shadow .2s ease;
        }

        .auth-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(109,40,217,.25);
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* BACKGROUND LIGHTING */}
      <div className="auth-glow pointer-events-none absolute -left-48 -top-48 h-[600px] w-[600px] rounded-full bg-violet-700/[0.12] blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-64 right-0 h-[600px] w-[600px] rounded-full bg-indigo-700/[0.08] blur-[150px]" />

      {/* LEFT BRAND PANEL */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[#0d0b16] p-12 xl:flex 2xl:p-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(167,139,250,.13)_1px,transparent_1px),linear-gradient(90deg,rgba(167,139,250,.13)_1px,transparent_1px)] [background-size:55px_55px]" />

        <div className="auth-glow pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[130px]" />

        <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-black shadow-lg shadow-violet-950/40">
            C
          </span>
          <span className="text-2xl font-black tracking-tight">
            Clip<span className="text-violet-400">TN</span>
          </span>
          <span className="rounded-md border border-violet-400/20 bg-violet-400/[0.08] px-2 py-1 text-[9px] font-bold tracking-[0.16em] text-violet-300">
            BETA
          </span>
        </Link>

        <div className="relative z-10 max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.7)]" />
            The creator economy starts here
          </div>

          <h1 className="text-5xl font-black leading-[1.12] tracking-tight 2xl:text-6xl">
            Turn content
            <br />
            into{" "}
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              opportunity.
            </span>
          </h1>

          <p className="mt-7 max-w-md text-base leading-8 text-zinc-400">
            A place where creators launch campaigns, clippers create
            content, and great moments reach new audiences.
          </p>

          {/* DECORATIVE PLATFORM PREVIEW */}
          <div className="auth-float relative mt-14 max-w-md rounded-3xl border border-white/[0.09] bg-white/[0.035] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  The ClipTN ecosystem
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  One platform. Two opportunities.
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-lg text-violet-300">
                ✦
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] p-4">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/15 text-lg text-violet-300">
                  ◈
                </div>
                <p className="text-sm font-bold">Streamers</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Launch campaigns and grow your reach.
                </p>
              </div>

              <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/[0.06] p-4">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-400/15 text-lg text-fuchsia-300">
                  ✂
                </div>
                <p className="text-sm font-bold">Clippers</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Create clips and discover opportunities.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-[10px] text-zinc-500">
                Built for the next generation of creators
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-600">
          <p>© {currentYear ?? ""} ClipTN</p>
          <p>Made with ambition in Tunisia 🇹🇳</p>
        </div>
      </section>

      {/* RIGHT LOGIN AREA */}
      <section className="relative flex min-h-screen w-full flex-1 items-center justify-center px-5 py-10 sm:px-10 xl:w-1/2">
        <div className="auth-glow pointer-events-none absolute right-[-180px] top-[-180px] h-[450px] w-[450px] rounded-full bg-violet-600/[0.12] blur-[130px]" />

        <div className="auth-enter relative z-10 w-full max-w-[440px]">
          {/* MOBILE BRAND */}
          <div className="mb-14 flex items-center justify-between xl:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 font-black shadow-lg shadow-violet-950/40">
                C
              </span>
              <span className="text-xl font-black">
                Clip<span className="text-violet-400">TN</span>
              </span>
            </Link>

            <span className="rounded-md border border-violet-400/20 bg-violet-400/[0.08] px-2 py-1 text-[9px] font-bold tracking-widest text-violet-300">
              BETA
            </span>
          </div>

          <div className="mb-9">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-2xl shadow-lg shadow-violet-950/20">
              ↗
            </div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-violet-400">
              Welcome back
            </p>

            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Sign in to your
              <br />
              <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                workspace.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Enter your account details to continue where you left off.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2.5 block text-xs font-semibold text-zinc-300"
              >
                Email address
              </label>

              <div className="group relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition group-focus-within:text-violet-400">
                  ✉
                </span>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="auth-input w-full rounded-xl border border-white/[0.09] bg-[#11101a] py-4 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-zinc-300"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-violet-400 transition hover:text-violet-300"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="group relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition group-focus-within:text-violet-400">
                  ◈
                </span>

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="auth-input w-full rounded-xl border border-white/[0.09] bg-[#11101a] py-4 pl-11 pr-20 text-sm text-white placeholder:text-zinc-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-violet-400 transition hover:text-violet-300"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {message && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/[0.08] p-4 text-sm leading-6 text-red-300"
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold">!</span>
                  <span>{message}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="auth-button group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-950/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing you in...
                </>
              ) : (
                <>
                  Sign in to ClipTN
                  <span className="text-lg transition group-hover:translate-x-1">
                    →
                  </span>
                </>
              )}
            </button>

            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.07]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#080810] px-4 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                  New to ClipTN?
                </span>
              </div>
            </div>

            <Link
              href="/join"
              className="flex w-full items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.025] py-4 text-sm font-semibold text-zinc-200 transition hover:border-violet-400/30 hover:bg-violet-500/[0.06] hover:text-white"
            >
              Create your account
            </Link>
          </form>

          <div className="mt-10 flex items-center justify-center gap-2 text-center text-[10px] text-zinc-600">
            <span>© {currentYear ?? ""} ClipTN</span>
            <span>·</span>
            <span>Built for creators 🇹🇳</span>
          </div>
        </div>
      </section>
    </main>
  );
}
