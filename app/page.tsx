import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧊</span>
          <span className="text-white font-bold text-xl tracking-tight">IceBreak</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
            Host login
          </Link>
          <Link href="/auth/signup" className="bg-white text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-4 py-1.5 text-sm mb-8 backdrop-blur-sm border border-white/20">
          <span>✨</span>
          <span>10 games · No downloads · No accounts for players</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 max-w-3xl">
          Break the ice.<br />
          <span className="text-yellow-300">Build the team.</span>
        </h1>
        <p className="text-white/80 text-xl md:text-2xl max-w-xl mb-10">
          5-minute icebreakers that actually work. Players join instantly with a room code — no email, no app.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/auth/signup"
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 shadow-lg shadow-yellow-400/30"
          >
            🎮 Host a session free
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Already have a code?</span>
            <Link href="/join" className="text-white font-semibold underline underline-offset-4 hover:text-yellow-300 transition-colors">
              Join a room →
            </Link>
          </div>
        </div>

        {/* Room code demo */}
        <div className="mt-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-sm w-full">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Share with your team</p>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-white text-purple-700 font-mono font-black text-3xl tracking-widest px-6 py-3 rounded-xl shadow-lg">
              WOLF-42
            </div>
          </div>
          <p className="text-white/50 text-xs mt-3">Players enter this code to join — no sign-up needed</p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white/5 backdrop-blur-sm border-t border-white/10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white font-bold text-2xl text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { emoji: '🖥️', title: 'Host creates a room', desc: 'Pick a game, share the room code with your team on Zoom or in-person.' },
              { emoji: '📱', title: 'Players join instantly', desc: 'Go to the link, type the code, get a random fun name. Zero sign-up.' },
              { emoji: '🎉', title: 'Play together', desc: 'Submit, vote, laugh. Results show in real-time on everyone\'s screen.' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                  {emoji}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-white font-bold text-2xl mb-4">Simple pricing. Only the host pays.</h2>
          <p className="text-white/60 mb-8">Players always join free. No per-seat nonsense.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: 'Free', price: '$0', desc: '3 games, up to 10 players', highlight: false },
              { name: 'Team', price: '$29/mo', desc: 'All 10 games, up to 30 players', highlight: true },
              { name: 'Pro', price: '$79/mo', desc: 'Unlimited games + analytics', highlight: false },
            ].map(({ name, price, desc, highlight }) => (
              <div
                key={name}
                className={`rounded-2xl p-6 border ${highlight
                  ? 'bg-white text-gray-900 border-white shadow-lg shadow-white/20'
                  : 'bg-white/10 text-white border-white/20'}`}
              >
                {highlight && <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Most popular</div>}
                <div className="font-bold text-xl mb-1">{name}</div>
                <div className={`text-2xl font-extrabold mb-2 ${highlight ? 'text-purple-600' : 'text-yellow-300'}`}>{price}</div>
                <div className={`text-sm ${highlight ? 'text-gray-600' : 'text-white/60'}`}>{desc}</div>
              </div>
            ))}
          </div>
          <Link href="/auth/signup" className="inline-block mt-8 bg-white text-purple-700 font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors">
            Start free — no credit card
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6 text-center text-white/40 text-sm">
        <p>Built with ❤️ by <a href="https://thethoughtbulb.com" className="hover:text-white/70 transition-colors">ThoughtBulb</a></p>
      </footer>
    </main>
  )
}
