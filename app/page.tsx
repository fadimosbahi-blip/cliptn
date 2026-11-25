import Link from "next/link";
import Image from "next/image";

const campaigns = [
  {
    creator: "Gaming Creator",
    initials: "GC",
    category: "FPS / COMPETITIVE",
    title: "Turn epic moments into viral clips",
    description: "Find the best moments from competitive gaming sessions.",
    reward: "2.00 TND",
    budget: "200 TND",
    color: "from-violet-500 to-indigo-600",
  },
  {
    creator: "Streamer Network",
    initials: "SN",
    category: "JUST CHATTING",
    title: "Find the funniest stream moments",
    description: "Clip reactions, unexpected moments and entertaining highlights.",
    reward: "1.50 TND",
    budget: "150 TND",
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    creator: "Gaming Studio",
    initials: "GS",
    category: "GAMING",
    title: "Share the next unforgettable play",
    description: "Help a gaming creator reach a wider audience.",
    reward: "2.50 TND",
    budget: "300 TND",
    color: "from-blue-500 to-violet-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Discover campaigns",
    description:
      "Explore campaigns from creators and find content you would love to clip.",
  },
  {
    number: "02",
    title: "Create and publish",
    description:
      "Turn authorized stream footage into engaging short-form videos.",
  },
  {
    number: "03",
    title: "Earn from your work",
    description:
      "Submit your published clips. Eligible verified views can earn rewards.",
  },
];

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#080810] text-white">
      {/* Subtle animated page-wide atmosphere */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="page-ambient-orb page-ambient-orb-one absolute -left-48 top-[8%] h-[520px] w-[520px] rounded-full bg-violet-700/[0.10] blur-[140px]" />
        <div className="page-ambient-orb page-ambient-orb-two absolute -right-56 top-[30%] h-[600px] w-[600px] rounded-full bg-blue-600/[0.08] blur-[160px]" />
        <div className="page-ambient-orb page-ambient-orb-three absolute left-[28%] top-[68%] h-[460px] w-[460px] rounded-full bg-fuchsia-600/[0.06] blur-[150px]" />
        <div className="page-particles absolute inset-0 opacity-35" />
        <div className="page-grid absolute inset-0 opacity-30" />
      </div>

      <div className="relative z-10">
      <style>{`
        @keyframes ambientDriftOne {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(34px, 24px, 0) scale(1.06); }
        }

        @keyframes ambientDriftTwo {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-30px, 28px, 0) scale(1.08); }
        }

        @keyframes particleDrift {
          0% { background-position: 0 0, 35px 55px, 90px 20px; }
          50% { background-position: 18px -22px, 12px 78px, 115px -5px; }
          100% { background-position: 0 0, 35px 55px, 90px 20px; }
        }

        .page-ambient-orb-one {
          animation: ambientDriftOne 24s ease-in-out infinite;
        }

        .page-ambient-orb-two {
          animation: ambientDriftTwo 29s ease-in-out infinite;
        }

        .page-ambient-orb-three {
          animation: ambientDriftOne 32s ease-in-out infinite reverse;
        }

        .page-particles {
          background-image:
            radial-gradient(circle, rgba(196,181,253,.42) 1px, transparent 1.7px),
            radial-gradient(circle, rgba(129,140,248,.30) 1px, transparent 1.8px),
            radial-gradient(circle, rgba(217,70,239,.24) 1px, transparent 1.8px);
          background-size: 150px 150px, 210px 210px, 270px 270px;
          animation: particleDrift 42s ease-in-out infinite;
        }

        .page-grid {
          background-image:
            linear-gradient(rgba(167,139,250,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(167,139,250,.035) 1px, transparent 1px);
          background-size: 76px 76px;
          mask-image: linear-gradient(to bottom, black, transparent 85%);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-13px) rotate(1deg); }
        }

        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(12px); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: .35; transform: scale(1); }
          50% { opacity: .65; transform: scale(1.12); }
        }

        @keyframes drift {
          0% { transform: translate3d(-2%, 0, 0); }
          50% { transform: translate3d(2%, -2%, 0); }
          100% { transform: translate3d(-2%, 0, 0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }

        @keyframes campaignScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .hero-enter {
          animation: slideIn .8s ease-out both;
        }

        .hero-delay-1 { animation-delay: .12s; }
        .hero-delay-2 { animation-delay: .24s; }
        .hero-delay-3 { animation-delay: .36s; }

        .float-card {
          animation: float 6s ease-in-out infinite;
        }

        .float-card-reverse {
          animation: floatReverse 7s ease-in-out infinite;
        }

        .ambient-glow {
          animation: pulseGlow 7s ease-in-out infinite;
        }

        .ambient-drift {
          animation: drift 12s ease-in-out infinite;
        }

        .shimmer-text {
          background-size: 200% auto;
          animation: shimmer 7s linear infinite;
        }

        .grid-background {
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: linear-gradient(to bottom, black, transparent 90%);
        }

        .premium-card {
          transition: transform .35s ease, border-color .35s ease,
            background-color .35s ease, box-shadow .35s ease;
        }

        .premium-card:hover {
          transform: translateY(-7px);
          border-color: rgba(167,139,250,.42);
          box-shadow: 0 20px 65px rgba(91,33,182,.12);
        }

        .premium-button {
          transition: transform .25s ease, box-shadow .25s ease,
            background-color .25s ease;
        }

        .premium-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(124,58,237,.3);
        }

        .nav-link {
          transition: color .2s ease;
        }

        .nav-link:hover {
          color: white;
        }

        .campaign-track {
          display: flex;
          width: max-content;
          animation: campaignScroll 38s linear infinite;
        }

        .campaign-track:hover {
          animation-play-state: paused;
        }

        .campaign-mask {
          overflow: hidden;
          mask-image: linear-gradient(
            to right,
            transparent,
            black 7%,
            black 93%,
            transparent
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent,
            black 7%,
            black 93%,
            transparent
          );
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }

          .campaign-track {
            animation: none;
          }
        }
      `}</style>

      {/* Navigation */}
      <header className="relative z-20 border-b border-white/[0.07] bg-[#080810]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link
            href="/"
            className="group flex shrink-0 items-center"
            aria-label="ClipTN homepage"
          >
            <Image
              src="/cliptn-logo.png"
              alt="ClipTN"
              width={1774}
              height={887}
              priority
              className="h-14 w-auto object-contain transition duration-300 group-hover:scale-105"
            />
          </Link>

          <div className="hidden items-center gap-9 text-sm text-zinc-400 md:flex">
            <a href="#campaigns" className="nav-link">Explore campaigns</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#about" className="nav-link">About us</a>
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-zinc-300 transition hover:text-white sm:block"
            >
              Log in
            </Link>
            <Link
              href="/join"
              className="premium-button rounded-xl border border-violet-400/30 bg-violet-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-violet-950/30 hover:bg-violet-500"
            >
              Join ClipTN <span className="ml-1">↗</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative isolate px-6 pb-28 pt-20 lg:px-10 lg:pb-36 lg:pt-28">
        <div className="grid-background pointer-events-none absolute inset-0 -z-10 opacity-60" />

        <div className="ambient-glow pointer-events-none absolute -left-40 top-10 -z-10 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[130px]" />
        <div className="ambient-drift pointer-events-none absolute right-[-10%] top-10 -z-10 h-[600px] w-[600px] rounded-full bg-fuchsia-700/10 blur-[150px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          <div className="relative z-10 text-center lg:text-left">
            <div className="hero-enter mb-8 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2 text-xs font-medium text-violet-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
              </span>
              Built for creators. Powered by clippers.
              <span>🇹🇳</span>
            </div>

            <h1 className="hero-enter hero-delay-1 text-5xl font-black leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-[76px]">
              Your creativity.
              <br />
              Your clips.
              <br />
              <span className="shimmer-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
                Your opportunity.
              </span>
            </h1>

            <p className="hero-enter hero-delay-2 mx-auto mt-8 max-w-xl text-base leading-8 text-zinc-400 sm:text-lg lg:mx-0">
              Clip your favourite creators, publish unforgettable moments,
              and earn rewards from qualified views. A new creator clipping
              marketplace starts here.
            </p>

            <div className="hero-enter hero-delay-3 mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/join"
                className="premium-button rounded-xl bg-violet-600 px-8 py-4 font-semibold shadow-xl shadow-violet-950/40 hover:bg-violet-500"
              >
                Get started <span className="ml-2">→</span>
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-white/10 bg-white/[0.035] px-8 py-4 font-semibold text-zinc-200 transition hover:border-violet-400/40 hover:bg-white/[0.07]"
              >
                Discover how it works
              </a>
            </div>

            <div className="hero-enter hero-delay-3 mt-12 flex flex-wrap justify-center gap-x-7 gap-y-4 text-xs font-medium text-zinc-500 lg:justify-start">
              <span><span className="mr-2 text-violet-400">✦</span>Discover creators</span>
              <span><span className="mr-2 text-violet-400">✦</span>Create content</span>
              <span><span className="mr-2 text-violet-400">✦</span>Earn rewards</span>
            </div>
          </div>

          {/* Animated marketplace visual */}
          <div className="relative mx-auto flex min-h-[430px] w-full max-w-[540px] items-center justify-center lg:min-h-[540px]">
            <div className="ambient-glow absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[100px]" />

            <div className="absolute left-1/2 top-1/2 h-[370px] w-[370px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/[0.10]" />
            <div className="absolute left-1/2 top-1/2 h-[285px] w-[285px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-violet-300/[0.15]" />

            <div className="float-card relative z-10 w-[85%] max-w-[390px] rounded-3xl border border-white/[0.13] bg-[#171522]/90 p-5 shadow-2xl shadow-violet-950/40 backdrop-blur-2xl sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500">CLIPTN MARKETPLACE</p>
                  <p className="mt-1 text-lg font-bold">Campaign overview</p>
                </div>
                <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-2.5 text-violet-300">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H17a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6.5A2.5 2.5 0 0 1 4 18.5z" />
                    <path d="m10 9 5 3-5 3z" />
                  </svg>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 font-bold">GC</div>
                    <div>
                      <p className="text-sm font-semibold">Gaming Creator</p>
                      <p className="text-xs text-zinc-500">Creator campaign</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold tracking-wider text-emerald-300">EXAMPLE</span>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-bold tracking-[0.18em] text-violet-300">FPS / COMPETITIVE</p>
                  <h3 className="mt-2 text-lg font-bold leading-snug">Turn epic moments into viral clips</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">Capture the moments everyone wants to watch again.</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/20 p-3">
                    <p className="text-[10px] text-zinc-500">Reward / 1K views</p>
                    <p className="mt-1 text-lg font-bold">2.00 <span className="text-xs text-violet-300">TND</span></p>
                  </div>
                  <div className="rounded-xl bg-black/20 p-3">
                    <p className="text-[10px] text-zinc-500">Example budget</p>
                    <p className="mt-1 text-lg font-bold">200 <span className="text-xs text-violet-300">TND</span></p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-4">
                  <div className="flex -space-x-2">
                    <div className="h-6 w-6 rounded-full border-2 border-[#171522] bg-violet-500" />
                    <div className="h-6 w-6 rounded-full border-2 border-[#171522] bg-fuchsia-500" />
                    <div className="h-6 w-6 rounded-full border-2 border-[#171522] bg-indigo-500" />
                  </div>
                  <p className="text-[10px] text-zinc-500">A marketplace built around creativity</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-500">
                <span>Illustrative campaign preview</span>
                <span className="text-violet-300">ClipTN ↗</span>
              </div>
            </div>

            <div className="float-card-reverse absolute -left-1 top-[12%] z-20 rounded-2xl border border-white/10 bg-[#1c1929]/95 p-4 shadow-xl shadow-black/30 backdrop-blur-xl sm:-left-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/15 text-lg text-fuchsia-300">✂</div>
                <div>
                  <p className="text-xs font-semibold">Create something</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Your next great clip</p>
                </div>
              </div>
            </div>

            <div className="float-card absolute -bottom-1 right-0 z-20 rounded-2xl border border-violet-400/20 bg-[#1c1929]/95 p-4 shadow-xl shadow-black/30 backdrop-blur-xl sm:-right-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-lg text-violet-300">✦</div>
                <div>
                  <p className="text-xs font-semibold">Your creativity matters</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Made for creators and clippers</p>
                </div>
              </div>
                          </div>

            <div className="ambient-glow absolute right-[8%] top-[8%] h-3 w-3 rounded-full bg-fuchsia-300 blur-[2px]" />
            <div className="ambient-glow absolute bottom-[12%] left-[8%] h-2 w-2 rounded-full bg-violet-300 blur-[1px]" />
          </div>
        </div>
      </section>

      {/* Campaign carousel */}
      <section id="campaigns" className="border-y border-white/[0.07] bg-[#0d0c16] py-24">
        <div className="mx-auto mb-12 max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
                The marketplace
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Discover opportunities
              </h2>
              <p className="mt-3 text-zinc-400">
                Find campaigns. Create clips. Get rewarded.
              </p>
            </div>
            <span className="w-fit rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-xs text-zinc-400">
              Campaign previews · Illustrative examples
            </span>
          </div>
        </div>

        <div className="campaign-mask">
          <div className="campaign-track gap-5 px-3">
            {[...campaigns, ...campaigns].map((campaign, index) => (
              <article
                key={`${campaign.title}-${index}`}
                className="premium-card group w-[310px] shrink-0 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#191725] to-[#11101a] p-6 sm:w-[370px]"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${campaign.color} text-sm font-bold shadow-lg`}>
                      {campaign.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{campaign.creator}</p>
                      <p className="text-xs text-zinc-500">Creator campaign</p>
                    </div>
                  </div>
                  <span className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.07] px-2 py-1 text-[9px] font-bold tracking-wider text-emerald-400">
                    PREVIEW
                  </span>
                </div>

                <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-violet-400">
                  {campaign.category}
                </p>

                <h3 className="text-xl font-bold leading-snug">
                  {campaign.title}
                </h3>

                <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-400">
                  {campaign.description}
                </p>

                <div className="my-6 grid grid-cols-2 gap-3 border-y border-white/[0.08] py-5">
                  <div>
                    <p className="text-xs text-zinc-500">Reward / 1K views</p>
                    <p className="mt-1 text-lg font-bold">{campaign.reward}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Campaign budget</p>
                    <p className="mt-1 text-lg font-bold">{campaign.budget}</p>
                  </div>
                </div>

                <Link
                  href="/join"
                  className="block rounded-lg border border-white/10 bg-white/[0.02] py-3 text-center text-sm font-semibold transition group-hover:border-violet-400/40 group-hover:bg-violet-500/10"
                >
                  Discover ClipTN <span className="ml-1 text-violet-300">↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-7xl px-6 text-xs text-zinc-600 lg:px-10">
          These are illustrative campaign examples, not live offers or guaranteed earnings.
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative px-6 py-24 lg:px-10">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-800/[0.07] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
              Simple by design
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              From a moment to an opportunity.
            </h2>
            <p className="mt-4 leading-7 text-zinc-400">
              A simple process connecting creators who need reach with clippers who know how to capture attention.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="premium-card rounded-2xl border border-white/[0.08] bg-[#12111b] p-7">
                <div className="mb-7 flex items-center justify-between">
                  <span className="text-4xl font-black tracking-tight text-violet-400/40">{step.number}</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] text-violet-300">✦</span>
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="mt-3 leading-7 text-zinc-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-6 pb-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
          <div className="premium-card rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950/70 via-[#171323] to-[#11101a] p-8 sm:p-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-xl text-violet-300">◈</div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
              For streamers
            </p>
            <h3 className="text-2xl font-bold">
              Let your community spread your content.
            </h3>
            <p className="mt-4 leading-7 text-zinc-400">
              Launch funded clipping campaigns, set your rules, and give talented editors an opportunity to distribute your best moments.
            </p>
          </div>

          <div className="premium-card rounded-3xl border border-white/10 bg-gradient-to-br from-[#191323] to-[#11101a] p-8 sm:p-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-xl text-fuchsia-300">✂</div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">
              For clippers
            </p>
            <h3 className="text-2xl font-bold">
              Turn your editing skills into an opportunity.
            </h3>
            <p className="mt-4 leading-7 text-zinc-400">
              Discover campaigns, create original clips, publish them, and qualify for rewards based on verified performance.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="join" className="px-6 pb-24 lg:px-10">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-950/70 via-[#171225] to-[#10101a] px-6 py-16 text-center sm:px-12">
          <div className="ambient-glow pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-[90px]" />
          <div className="ambient-glow pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-violet-600/20 blur-[90px]" />

          <div className="relative">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-violet-300">
              The beginning of something bigger
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Ready to become part of ClipTN?
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-7 text-zinc-400">
              Whether you create content or turn it into clips, there is a place for your creativity here.
            </p>
            <Link
              href="/join"
              className="premium-button mt-8 inline-flex rounded-xl bg-violet-600 px-8 py-4 font-semibold shadow-lg shadow-violet-950/30 hover:bg-violet-500"
            >
              Join ClipTN <span className="ml-2">→</span>
            </Link>
            <p className="mt-4 text-xs text-zinc-500">
              Create your account and choose your role.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#080810] px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center">
          <Link href="/" className="text-xl font-black text-white">
            Clip<span className="text-violet-400">TN</span>
          </Link>
          <p>Built with ambition in Tunisia 🇹🇳</p>
          <p>© 2026 ClipTN. All rights reserved.</p>
        </div>
      </footer>
      </div>
    </main>
  );
}