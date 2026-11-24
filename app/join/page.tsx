
import Link from "next/link";

export default function JoinPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090f] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -left-48 top-20 h-[550px] w-[550px] rounded-full bg-violet-700/15 blur-[150px]" />
      <div className="pointer-events-none absolute -right-48 bottom-0 h-[550px] w-[550px] rounded-full bg-fuchsia-700/10 blur-[150px]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tight">
            Clip<span className="text-violet-400">TN</span>
            <span className="ml-2 align-top text-[9px] font-bold tracking-[0.2em] text-zinc-600">
              BETA
            </span>
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white"
          >
            Log in <span className="ml-1 text-violet-400">↗</span>
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-violet-300 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.8)]" />
              YOUR NEXT CHAPTER STARTS HERE
            </div>

            <h1 className="text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              One platform.
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Two ways to grow.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
              Whether you're creating the content or turning its best moments
              into clips, there's a place for you on ClipTN.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Streamer */}
            <Link
              href="/register?role=streamer"
              className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#12111b] p-7 transition duration-500 hover:-translate-y-2 hover:border-violet-400/40 hover:shadow-[0_25px_80px_rgba(124,58,237,0.13)] sm:p-9"
            >
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/10 blur-[85px] transition duration-500 group-hover:bg-violet-600/20" />

              <div className="relative flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-3xl transition duration-500 group-hover:scale-110 group-hover:bg-violet-500/20">
                  🎙️
                </div>

                <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] font-bold tracking-wider text-violet-300">
                  CREATOR
                </span>
              </div>

              <div className="relative mt-9">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-400">
                  For content creators
                </p>

                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  I'm a Streamer<span className="text-violet-400">.</span>
                </h2>

                <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">
                  You've got the content. Let the community help it reach
                  further. Create clipping campaigns and give talented editors
                  a chance to share your best moments.
                </p>
              </div>

              <div className="relative mt-auto flex items-center justify-between border-t border-white/[0.08] pt-7">
                <div>
                  <p className="text-sm font-bold text-violet-300 transition group-hover:text-violet-200">
                    Join as a Streamer
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Launch your first campaign
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10 text-xl text-violet-300 transition duration-300 group-hover:translate-x-1 group-hover:bg-violet-500 group-hover:text-white">
                  →
                </div>
              </div>
            </Link>

            {/* Clipper */}
            <Link
              href="/register?role=clipper"
              className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#12111b] p-7 transition duration-500 hover:-translate-y-2 hover:border-fuchsia-400/40 hover:shadow-[0_25px_80px_rgba(192,38,211,0.12)] sm:p-9"
            >
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[85px] transition duration-500 group-hover:bg-fuchsia-600/20" />

              <div className="relative flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 text-3xl transition duration-500 group-hover:scale-110 group-hover:bg-fuchsia-500/20">
                  ✂️
                </div>

                <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.07] px-3 py-1.5 text-[10px] font-bold tracking-wider text-fuchsia-300">
                  CREATIVE
                </span>
              </div>

              <div className="relative mt-9">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-400">
                  For creative editors
                </p>

                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  I'm a Clipper<span className="text-fuchsia-400">.</span>
                </h2>

                <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">
                  You know how to find the moments worth sharing. Discover
                  campaigns, create engaging clips and qualify for potential
                  rewards based on eligible views.
                </p>
              </div>

              <div className="relative mt-auto flex items-center justify-between border-t border-white/[0.08] pt-7">
                <div>
                  <p className="text-sm font-bold text-fuchsia-300 transition group-hover:text-fuchsia-200">
                    Join as a Clipper
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Discover clipping opportunities
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 text-xl text-fuchsia-300 transition duration-300 group-hover:translate-x-1 group-hover:bg-fuchsia-500 group-hover:text-white">
                  →
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-5">
            <span className="text-xs text-zinc-500">
              Already part of the community?
            </span>

            <Link
              href="/login"
              className="text-xs font-bold text-violet-400 transition hover:text-violet-300"
            >
              Sign in to your account →
            </Link>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] py-6 text-[11px] text-zinc-600 sm:flex-row">
          <span>© 2026 ClipTN. Built with ambition in Tunisia 🇹🇳</span>
          <span>Made for creators. Powered by creativity.</span>
        </footer>
      </div>
    </main>
  );
}
