import Link from 'next/link'
import { GAMES } from '@/lib/games'

// ─── Static data ──────────────────────────────────────────────────────────────

const FREE_GAME_IDS = ['two-truths', 'finish-sentence', 'hot-take', 'would-you-rather', 'who-in-the-room']

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  free:  { label: 'Free', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  team:  { label: 'Team', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  pro:   { label: 'Pro',  color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
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
    color: 'bg-white/5 border-white/15',
    highlight: false,
    cta: 'Start free',
    features: [
      '5 games included',
      'Up to 10 players per session',
      '1 active room at a time',
      'Real-time sync',
      'No player sign-up needed',
    ],
    gameIds: FREE_GAME_IDS,
  },
  {
    name: 'Team',
    price: '$29',
    period: '/month',
    color: 'bg-white border-white',
    highlight: true,
    cta: 'Start free trial',
    features: [
      'All 10 games',
      'Up to 30 players per session',
      'Unlimited concurrent rooms',
      'Session history & replays',
      'Priority support',
    ],
    gameIds: GAMES.filter(g => g.plans.includes('team')).map(g => g.id),
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/month',
    color: 'bg-white/5 border-white/15',
    highlight: false,
    cta: 'Get Pro',
    features: [
      'Everything in Team',
      'Up to 50 players per session',
      'Custom branding & room links',
      'Engagement analytics',
      'Dedicated onboarding call',
    ],
    gameIds: GAMES.map(g => g.id),
  },
]

const USE_CASES = [
  {
    emoji: '💻',
    title: 'Remote team standups',
    desc: 'Open your Monday standup with a 5-minute icebreaker. Players join from Slack — no extra app.',
  },
  {
    emoji: '🚀',
    title: 'New hire onboarding',
    desc: 'Help new joiners feel at home on day one. Play "Finish the Sentence" or "Two Truths & One Lie" to spark real connections.',
  },
  {
    emoji: '🎓',
    title: 'Workshops & training',
    desc: 'Kill dead air before a session. Get everyone engaged and laughing before the real work begins.',
  },
  {
    emoji: '🤝',
    title: 'Client kick-offs',
    desc: 'Break the awkwardness of a first meeting with a quick "Would You Rather" round. Sets a warm tone instantly.',
  },
]

const STATS = [
  { value: '10', label: 'unique games' },
  { value: '50', label: 'players per room' },
  { value: '5 min', label: 'average session' },
  { value: '0', label: 'apps to download' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 flex flex-col">

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧊</span>
          <span className="text-white font-bold text-xl tracking-tight">IceBreak</span>
          <span className="text-white/30 text-xs ml-1 hidden sm:inline">by ThoughtBulb</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-12 pb-20">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-4 py-1.5 text-sm mb-8 backdrop-blur-sm border border-white/20">
          <span>✨</span>
          <span>10 games · No downloads · Players join in seconds</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 max-w-3xl">
          Break the ice.<br />
          <span className="text-yellow-300">Build the team.</span>
        </h1>
        <p className="text-white/75 text-xl md:text-2xl max-w-xl mb-10 leading-relaxed">
          Self-playing icebreakers your whole team can enjoy — including the host.
          Share a code, everyone joins, the game runs itself.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center mb-16">
          <Link
            href="/auth/signup"
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 shadow-lg shadow-yellow-400/30"
          >
            🎮 Host a session free
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm">Have a code?</span>
            <Link href="/join" className="text-white font-semibold underline underline-offset-4 hover:text-yellow-300 transition-colors">
              Join a room →
            </Link>
          </div>
        </div>

        {/* Room code mockup */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-sm w-full">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Share with your team</p>
          <div className="bg-white text-purple-700 font-mono font-black text-3xl tracking-widest px-6 py-3 rounded-xl shadow-lg text-center mb-3">
            WOLF-42
          </div>
          <p className="text-white/40 text-xs">Players enter this code — no sign-up, no app</p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white/5 border-y border-white/10 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-yellow-300 font-black text-4xl">{s.value}</p>
              <p className="text-white/50 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Games showcase ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-white font-extrabold text-3xl md:text-4xl mb-3">
              10 games. Every vibe.
            </h2>
            <p className="text-white/60 text-lg max-w-xl mx-auto">
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
                  className="bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/25 rounded-2xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{game.emoji}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-xs">{category}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-base mb-1">{game.name}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{game.description}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-white/30">
                    <span>⏱ ~{game.durationMinutes} min</span>
                    <span>·</span>
                    <span>👥 {game.minPlayers}+ players</span>
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
      <section className="bg-white/5 border-y border-white/10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white font-extrabold text-3xl text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                emoji: '🖥️',
                title: 'Host creates a room',
                desc: 'Sign in, pick a game, and share the 6-character room code on your Zoom, Teams, or Slack.',
              },
              {
                step: '02',
                emoji: '📱',
                title: 'Players join instantly',
                desc: 'Visit the link, type the code, get a fun random name. No email, no download, no account.',
              },
              {
                step: '03',
                emoji: '🎉',
                title: 'Game runs itself',
                desc: 'Timers, guessing, scoring — all automated. Everyone plays together, including the host.',
              },
            ].map(({ step, emoji, title, desc }) => (
              <div key={step} className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mx-auto">
                    {emoji}
                  </div>
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                    {step.replace('0', '')}
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
            <h2 className="text-white font-extrabold text-3xl md:text-4xl mb-3">
              Why teams choose IceBreak
            </h2>
            <p className="text-white/55 text-lg">Built by the team at ThoughtBulb who ran 500+ facilitated workshops and got tired of the overhead.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                emoji: '🤖',
                title: 'Fully self-playing',
                desc: 'Timers auto-advance, results reveal themselves, scoring is automatic. Zero facilitation required — the host gets to be a player too.',
              },
              {
                emoji: '🕵️',
                title: 'Guess-who mechanic',
                desc: 'Answers are shown anonymously. Everyone guesses who said what. Correct guesses earn points. Nobody guessing you earns a sneaky bonus.',
              },
              {
                emoji: '⚡',
                title: 'Live in under 30 seconds',
                desc: 'Share a 6-character code. Players join from any device in seconds. No IT approvals, no downloads, no onboarding.',
              },
              {
                emoji: '🔄',
                title: 'Never repeats',
                desc: '400+ questions across all games, randomly shuffled every session. You can play the same game every week without getting bored.',
              },
              {
                emoji: '👥',
                title: 'Scales to 50 people',
                desc: 'Works equally well for a 4-person standup or a 50-person all-hands. Real-time sync keeps everyone on the same page.',
              },
              {
                emoji: '🔒',
                title: 'Privacy by design',
                desc: 'Players don\'t need accounts or emails. Sessions are ephemeral. No personal data stored beyond what the game needs.',
              },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
                <span className="text-2xl flex-shrink-0 mt-0.5">{emoji}</span>
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
      <section className="bg-white/5 border-y border-white/10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-white font-extrabold text-3xl md:text-4xl mb-3">
              Simple pricing. Only the host pays.
            </h2>
            <p className="text-white/55 text-lg">Players always join free. No per-seat nonsense. No credit card to start.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {PRICING.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-7 flex flex-col ${
                  plan.highlight ? 'bg-white text-gray-900' : 'bg-white/5 text-white border-white/15'
                }`}
              >
                {plan.highlight && (
                  <div className="text-purple-600 text-xs font-black uppercase tracking-wider mb-3">
                    ⭐ Most popular
                  </div>
                )}
                <div className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-gray-900' : 'text-white'}`}>
                  {plan.name}
                </div>
                <div className="flex items-end gap-1 mb-5">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-purple-600' : 'text-yellow-300'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-gray-500' : 'text-white/40'}`}>
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-purple-500' : 'text-green-400'}`}>✓</span>
                      <span className={plan.highlight ? 'text-gray-700' : 'text-white/70'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className={`block text-center font-bold py-3 rounded-xl transition-colors ${
                    plan.highlight
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
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
            <h2 className="text-white font-extrabold text-3xl mb-3">Works for every team moment</h2>
            <p className="text-white/55 text-lg">Wherever your team gathers — online or in-person — IceBreak fits right in.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {USE_CASES.map(uc => (
              <div key={uc.title} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
                <span className="text-3xl flex-shrink-0">{uc.emoji}</span>
                <div>
                  <h3 className="text-white font-bold mb-1.5">{uc.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ThoughtBulb credibility ── */}
      <section className="bg-white/5 border-y border-white/10 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">
            💡
          </div>
          <h2 className="text-white font-extrabold text-2xl mb-3">Built by ThoughtBulb</h2>
          <p className="text-white/60 leading-relaxed mb-6">
            ThoughtBulb is a learning &amp; engagement studio that has designed and facilitated hundreds of workshops, team-building sessions, and leadership programmes across India and Southeast Asia. IceBreak is our answer to one question we kept hearing: <em className="text-white/80">"Can this part run itself?"</em>
          </p>
          <a
            href="https://thethoughtbulb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-yellow-300 hover:text-yellow-200 font-semibold transition-colors"
          >
            Learn about ThoughtBulb →
          </a>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-white font-extrabold text-4xl md:text-5xl mb-4">
            Ready to break the ice?
          </h2>
          <p className="text-white/60 text-xl mb-10">
            Free forever. No credit card. Your team joins in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-10 py-4 rounded-xl text-lg transition-all hover:scale-105 shadow-lg shadow-yellow-400/25"
            >
              🎮 Start hosting free
            </Link>
            <Link
              href="/join"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors"
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
            <span className="text-2xl">🧊</span>
            <span className="text-white/70 font-semibold">IceBreak</span>
            <span className="text-white/30 text-sm">by</span>
            <a
              href="https://thethoughtbulb.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white/80 text-sm transition-colors"
            >
              ThoughtBulb
            </a>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/auth/signin" className="hover:text-white/70 transition-colors">Sign in</Link>
            <Link href="/join" className="hover:text-white/70 transition-colors">Join a room</Link>
            <a href="mailto:hello@thethoughtbulb.com" className="hover:text-white/70 transition-colors">Contact</a>
          </div>
          <p className="text-white/30 text-sm">© {new Date().getFullYear()} ThoughtBulb</p>
        </div>
      </footer>

    </main>
  )
}
