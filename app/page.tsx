import Link from 'next/link'
import {
  Monitor, Smartphone, PartyPopper,
  Bot, Eye, Zap, RefreshCw, Users, ShieldCheck,
  Laptop, Rocket, GraduationCap, Handshake,
  Lightbulb, Check, ChevronRight, Gamepad2, Clock, PackageX,
  ArrowRight, Plus, Minus,
} from 'lucide-react'
import { GAMES } from '@/lib/games'

// ─── Static data ──────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  free:  { label: 'Free', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  team:  { label: 'Team', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  pro:   { label: 'Pro',  color: 'bg-purple-400/20 text-purple-300 border border-purple-400/30' },
}

const CATEGORY_LABEL: Record<string, string> = {
  reveal:  'Guess who',
  compete: 'Vote',
  connect: 'Share',
  laugh:   'Laugh',
  timed:   'Timed',
}

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: 'bg-white/[0.06] border-white/10 text-white',
    highlight: false,
    cta: 'Start free',
    ctaStyle: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white focus-visible:ring-2 focus-visible:ring-white/50',
    features: [
      '5 games included',
      'Up to 10 players',
      '1 active room',
      'Real-time sync',
      'No player sign-up',
    ],
  },
  {
    name: 'Team',
    price: '$29',
    period: '/month',
    color: 'bg-white border-white shadow-2xl shadow-white/20',
    highlight: true,
    cta: 'Start free trial',
    ctaStyle: 'bg-purple-600 hover:bg-purple-500 text-white focus-visible:ring-2 focus-visible:ring-purple-400',
    features: [
      'All 10 games',
      'Up to 30 players',
      'Unlimited rooms',
      'Session history',
      'Priority support',
    ],
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/month',
    color: 'bg-white/[0.06] border-white/10 text-white',
    highlight: false,
    cta: 'Get Pro',
    ctaStyle: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white focus-visible:ring-2 focus-visible:ring-white/50',
    features: [
      'Everything in Team',
      'Up to 50 players',
      'Custom branding',
      'Engagement analytics',
      'Dedicated onboarding',
    ],
  },
]

const HOW_IT_WORKS = [
  { Icon: Monitor,     title: 'Host creates a room',    desc: 'Sign in, pick a game, and share the room code on Zoom, Teams, or Slack.' },
  { Icon: Smartphone,  title: 'Players join instantly',  desc: 'Type the code, get a fun random name. No email, no download, no account.' },
  { Icon: PartyPopper, title: 'Game runs itself',        desc: 'Timers, guessing, scoring — all automated. Host plays alongside everyone.' },
]

const FEATURES = [
  { Icon: Bot,        title: 'Fully self-playing',       desc: 'Timers auto-advance, results reveal themselves, scoring is automatic. Zero facilitation — the host gets to be a player too.' },
  { Icon: Eye,        title: 'Guess-who mechanic',       desc: 'Answers are shown anonymously. Everyone guesses who said what. Correct guesses earn +2 pts. Nobody guessing you earns a sneaky +1.' },
  { Icon: Zap,        title: 'Live in 30 seconds',       desc: 'Share a 6-character code. Players join from any device. No IT approvals, no downloads, no onboarding.' },
  { Icon: RefreshCw,  title: 'Never repeats',            desc: '400+ questions across all games, randomly shuffled every session. Same game every week — different experience.' },
  { Icon: Users,      title: 'Scales to 50 people',      desc: 'Works for a 4-person standup or a 50-person all-hands. Real-time sync keeps everyone on the same page.' },
  { Icon: ShieldCheck, title: 'Privacy by design',       desc: "Players don't need accounts or emails. Sessions are ephemeral. No personal data beyond what the game needs." },
]

const USE_CASES = [
  { Icon: Laptop,         title: 'Remote team standups',    desc: 'Open your Monday standup with a 5-minute icebreaker. Players join from Slack — no extra app.' },
  { Icon: Rocket,         title: 'New hire onboarding',     desc: 'Help new joiners feel at home on day one. Play "Two Truths & One Lie" to spark real connections.' },
  { Icon: GraduationCap,  title: 'Workshops & training',    desc: 'Kill dead air before a session. Get everyone engaged and laughing before the real work begins.' },
  { Icon: Handshake,      title: 'Client kick-offs',        desc: 'Break the awkwardness of a first meeting with a quick "Would You Rather" round. Sets a warm tone instantly.' },
]

const FAQS = [
  { q: 'Is it really free?',                    a: 'Yes — the Free plan is free forever. 5 games, up to 10 players, no credit card required.' },
  { q: 'Do players need to download anything?', a: 'No. Players open a browser link, type the room code, and they\'re in. Works on any device.' },
  { q: 'Can the host play too?',                a: 'Yes! All games are self-playing. Timers and scoring are automatic, so the host enjoys the game alongside everyone else.' },
  { q: 'What if we play the same game twice?',  a: '400+ questions shuffle randomly every session. You can play Would You Rather every week and never see the same set.' },
  { q: 'How many people can join a room?',      a: 'Up to 10 on Free, 30 on Team, and 50 on Pro. Players always join free — only the host needs a plan.' },
]

const STATS = [
  { Icon: Gamepad2, value: '10',    label: 'unique games' },
  { Icon: Users,    value: '50',    label: 'players per room' },
  { Icon: Clock,    value: '5 min', label: 'average session' },
  { Icon: PackageX, value: '0',     label: 'apps to download' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 flex flex-col">

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 bg-purple-800/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">🧊</span>
            <span className="text-white font-bold text-lg tracking-tight">IceBreak</span>
            <span className="text-white/30 text-xs ml-1 hidden sm:inline">by ThoughtBulb</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="text-white/70 hover:text-white text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md px-2 py-1"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 cursor-pointer"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-4 py-1.5 text-sm mb-8 backdrop-blur-sm border border-white/20">
          <span aria-hidden="true">✨</span>
          <span>10 games · No downloads · Players join in seconds</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 max-w-3xl tracking-tight">
          Break the ice.<br />
          <span className="text-yellow-300">Build the team.</span>
        </h1>
        <p className="text-white/75 text-xl md:text-2xl max-w-xl mb-10 leading-relaxed">
          Self-playing icebreakers your whole team enjoys — including the host.
          Share a code, everyone joins, the game runs itself.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center mb-16">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-900 font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-yellow-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 cursor-pointer"
          >
            <Gamepad2 size={20} aria-hidden="true" />
            Host a session free
          </Link>
          <Link
            href="/join"
            className="inline-flex items-center gap-1.5 text-white font-semibold hover:text-yellow-300 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded-md px-2 py-1 cursor-pointer"
          >
            Already have a code? Join a room
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {/* Room code mockup */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-sm w-full">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Share with your team</p>
          <div className="bg-white text-purple-700 font-mono font-black text-3xl tracking-widest px-6 py-3 rounded-xl shadow-lg text-center mb-3 select-all">
            WOLF-42
          </div>
          <p className="text-white/40 text-xs">Players enter this code — no sign-up, no app</p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white/[0.06] border-y border-white/10 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(({ Icon, value, label }) => (
            <div key={label}>
              <Icon size={22} className="text-yellow-300 mx-auto mb-2" aria-hidden="true" />
              <p className="text-white font-black text-3xl">{value}</p>
              <p className="text-white/50 text-sm mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Games showcase ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-white font-extrabold text-3xl md:text-4xl mb-3 tracking-tight">
              10 games. Every vibe.
            </h2>
            <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
              From laugh-out-loud moments to genuine team connections — pick the game that fits your mood.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAMES.map(game => {
              const lowestPlan = game.plans[0] as 'free' | 'team' | 'pro'
              const badge = PLAN_BADGE[lowestPlan]
              const category = CATEGORY_LABEL[game.category] ?? game.category

              return (
                <div
                  key={game.id}
                  className="bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 rounded-2xl p-5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl" role="img" aria-label={game.name}>{game.emoji}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-xs">{category}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-base mb-1">{game.name}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{game.description}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-white/30">
                    <span>⏱ ~{game.durationMinutes} min</span>
                    <span>·</span>
                    <span>{game.minPlayers}+ players</span>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-center text-white/30 text-sm mt-8">
            All games are self-playing — no one needs to facilitate. The host can enjoy it too.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white/[0.05] border-y border-white/10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white font-extrabold text-3xl text-center mb-12 tracking-tight">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ Icon, title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="relative inline-block mb-5">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Icon size={28} className="text-white/80" aria-hidden="true" />
                  </div>
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why IceBreak ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-white font-extrabold text-3xl md:text-4xl mb-3 tracking-tight">
              Why teams choose IceBreak
            </h2>
            <p className="text-white/55 text-lg">
              Built by{' '}
              <a href="https://thethoughtbulb.com" target="_blank" rel="noopener noreferrer" className="text-yellow-300 hover:text-yellow-200 transition-colors duration-200 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded">
                ThoughtBulb
              </a>
              {' '}— a studio that ran 500+ facilitated workshops and got tired of the overhead.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-white/[0.06] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={20} className="text-yellow-300" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">{title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-white/[0.05] border-y border-white/10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-white font-extrabold text-3xl md:text-4xl mb-3 tracking-tight">
              Simple pricing. Only the host pays.
            </h2>
            <p className="text-white/55 text-lg">Players always join free. No per-seat nonsense. No credit card to start.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {PRICING.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-7 flex flex-col ${plan.color}`}
              >
                {plan.highlight && (
                  <div className="text-purple-600 text-xs font-black uppercase tracking-wider mb-3">
                    ⭐ Most popular
                  </div>
                )}
                <div className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-gray-900' : 'text-white'}`}>
                  {plan.name}
                </div>
                <div className="flex items-end gap-1 mb-6">
                  <span className={`text-4xl font-extrabold tracking-tight ${plan.highlight ? 'text-purple-600' : 'text-yellow-300'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-gray-500' : 'text-white/40'}`}>
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-3 mb-7 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={15} className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-purple-500' : 'text-green-400'}`} aria-hidden="true" />
                      <span className={plan.highlight ? 'text-gray-700' : 'text-white/70'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className={`block text-center font-bold py-3 rounded-xl transition-all duration-200 focus-visible:outline-none cursor-pointer ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-white/35 text-sm">
            All plans include unlimited players joining free · Cancel anytime · No hidden fees
          </p>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-white font-extrabold text-3xl mb-3 tracking-tight">Works for every team moment</h2>
            <p className="text-white/55 text-lg">Wherever your team gathers — online or in-person — IceBreak fits right in.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {USE_CASES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-white/[0.06] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-200">
                <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-purple-300" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1.5">{title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white/[0.05] border-y border-white/10 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-white font-extrabold text-3xl text-center mb-10 tracking-tight">Common questions</h2>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details
                key={q}
                className="group bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors duration-200"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none text-white font-semibold text-sm hover:bg-white/[0.04] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-400">
                  {q}
                  <span className="flex-shrink-0 text-white/40 group-open:rotate-180 transition-transform duration-200">
                    <ChevronRight size={16} className="rotate-90" aria-hidden="true" />
                  </span>
                </summary>
                <p className="px-6 pb-5 text-white/60 text-sm leading-relaxed border-t border-white/10 pt-4">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── ThoughtBulb credibility ── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-yellow-400/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lightbulb size={26} className="text-yellow-300" aria-hidden="true" />
          </div>
          <h2 className="text-white font-extrabold text-2xl mb-3 tracking-tight">Built by ThoughtBulb</h2>
          <p className="text-white/60 leading-relaxed mb-6 text-[15px]">
            ThoughtBulb is a learning &amp; engagement studio that has designed and facilitated hundreds of workshops,
            team-building sessions, and leadership programmes across India and Southeast Asia.
            IceBreak is our answer to one question we kept hearing:{' '}
            <em className="text-white/80 not-italic font-medium">"Can this part run itself?"</em>
          </p>
          <a
            href="https://thethoughtbulb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-yellow-300 hover:text-yellow-200 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded-md cursor-pointer"
          >
            Learn about ThoughtBulb
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-white/[0.05] border-t border-white/10 py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-white font-extrabold text-4xl md:text-5xl mb-4 tracking-tight">
            Ready to break the ice?
          </h2>
          <p className="text-white/60 text-xl mb-10 leading-relaxed">
            Free forever. No credit card. Your team joins in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-900 font-bold px-10 py-4 rounded-xl text-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-yellow-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 cursor-pointer"
            >
              <Gamepad2 size={20} aria-hidden="true" />
              Start hosting free
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
            >
              Join a room
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🧊</span>
            <span className="text-white/70 font-semibold">IceBreak</span>
            <span className="text-white/30 text-sm">by</span>
            <a
              href="https://thethoughtbulb.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white/80 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded cursor-pointer"
            >
              ThoughtBulb
            </a>
          </div>
          <nav aria-label="Footer navigation" className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/auth/signin" className="hover:text-white/70 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded">Sign in</Link>
            <Link href="/join" className="hover:text-white/70 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded">Join a room</Link>
            <a href="mailto:hello@thethoughtbulb.com" className="hover:text-white/70 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded cursor-pointer">Contact</a>
          </nav>
          <p className="text-white/30 text-sm">© {new Date().getFullYear()} ThoughtBulb</p>
        </div>
      </footer>

    </main>
  )
}
