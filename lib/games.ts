// Game library — 10 games across 4 engines
// Adding a new game = adding a config entry, not new code

export type Engine = 'submit-reveal' | 'vote' | 'round-robin' | 'timed'

export interface GameConfig {
  id: string
  name: string
  description: string
  engine: Engine
  category: 'reveal' | 'compete' | 'connect' | 'laugh' | 'timed'
  durationMinutes: number
  minPlayers: number
  fields?: { label: string; placeholder: string; isLie?: boolean }[]
  prompt?: string
  timerSeconds?: number
  rounds?: number
  questionBank?: 'wyr' | 'this-or-that' | 'finish-sentence' | 'who-in-the-room'
  plans: ('free' | 'team' | 'pro')[]
  emoji: string
}

export const GAMES: GameConfig[] = [
  // ── Submit & Reveal ────────────────────────────────────────────────────────
  {
    id: 'two-truths',
    name: 'Two Truths & One Lie',
    description: 'Submit 2 truths and 1 lie. Everyone guesses which is the lie.',
    engine: 'submit-reveal',
    category: 'reveal',
    durationMinutes: 8,
    minPlayers: 3,
    emoji: '🤥',
    plans: ['free', 'team', 'pro'],
    fields: [
      { label: 'Truth #1', placeholder: 'e.g. I once went skydiving...' },
      { label: 'Truth #2', placeholder: 'e.g. I speak three languages...' },
      { label: 'The Lie', placeholder: 'Make it believable!', isLie: true },
    ],
  },
  {
    id: 'finish-sentence',
    name: 'Finish the Sentence',
    description: 'Complete a random prompt, then guess who wrote each answer.',
    engine: 'submit-reveal',
    category: 'reveal',
    durationMinutes: 6,
    minPlayers: 2,
    emoji: '✍️',
    plans: ['free', 'team', 'pro'],
    questionBank: 'finish-sentence',
    fields: [{ label: 'Complete the sentence', placeholder: 'Your answer...' }],
  },
  {
    id: 'hot-take',
    name: 'Hot Take',
    description: 'Submit an unpopular opinion. Everyone guesses who said it.',
    engine: 'submit-reveal',
    category: 'laugh',
    durationMinutes: 6,
    minPlayers: 3,
    emoji: '🌶️',
    plans: ['free', 'team', 'pro'],
    fields: [{ label: 'Your hot take', placeholder: 'The more controversial the better...' }],
  },
  {
    id: 'worst-advice',
    name: 'Worst Advice Ever',
    description: "Share the worst advice you've given or received. Everyone guesses who said it.",
    engine: 'submit-reveal',
    category: 'laugh',
    durationMinutes: 6,
    minPlayers: 3,
    emoji: '😬',
    plans: ['team', 'pro'],
    fields: [{ label: 'The terrible advice', placeholder: 'The worse the better...' }],
  },
  {
    id: 'emoji-story',
    name: 'Emoji Story',
    description: 'Describe your weekend using only emojis. Everyone guesses who said what.',
    engine: 'submit-reveal',
    category: 'laugh',
    durationMinutes: 5,
    minPlayers: 2,
    emoji: '😂',
    plans: ['team', 'pro'],
    fields: [{ label: 'Your emoji story (emojis only!)', placeholder: '😴☕🏃💻🍕😴' }],
  },

  // ── Vote ───────────────────────────────────────────────────────────────────
  {
    id: 'would-you-rather',
    name: 'Would You Rather',
    description: 'Rapid-fire dilemmas. Everyone votes — results auto-reveal on a timer.',
    engine: 'vote',
    category: 'compete',
    durationMinutes: 5,
    minPlayers: 2,
    emoji: '⚡',
    plans: ['free', 'team', 'pro'],
    questionBank: 'wyr',
    rounds: 7,
    timerSeconds: 20,
  },
  {
    id: 'who-in-the-room',
    name: 'Who in the Room?',
    description: '"Most likely to..." — tap who fits best. No right answers, only laughs.',
    engine: 'vote',
    category: 'laugh',
    durationMinutes: 5,
    minPlayers: 3,
    emoji: '👀',
    plans: ['free', 'team', 'pro'],
    questionBank: 'who-in-the-room',
    rounds: 7,
    timerSeconds: 20,
  },

  // ── Timed ──────────────────────────────────────────────────────────────────
  {
    id: 'this-or-that',
    name: 'This or That',
    description: 'Quick binary choices with a countdown. See how your team thinks.',
    engine: 'timed',
    category: 'compete',
    durationMinutes: 4,
    minPlayers: 2,
    emoji: '⚖️',
    plans: ['team', 'pro'],
    questionBank: 'this-or-that',
    timerSeconds: 15,
    rounds: 10,
  },

  // ── Round Robin ────────────────────────────────────────────────────────────
  {
    id: 'hot-seat',
    name: 'Hot Seat',
    description: 'One person on the spot. Team submits questions, they pick one to answer.',
    engine: 'round-robin',
    category: 'connect',
    durationMinutes: 8,
    minPlayers: 3,
    emoji: '🔥',
    plans: ['team', 'pro'],
  },
  {
    id: 'recommendation-round',
    name: 'Recommendation Round',
    description: 'Everyone shares one recommendation: book, show, restaurant, or app.',
    engine: 'round-robin',
    category: 'connect',
    durationMinutes: 5,
    minPlayers: 2,
    emoji: '⭐',
    plans: ['team', 'pro'],
    fields: [
      { label: 'What are you recommending?', placeholder: 'Book, show, restaurant, app...' },
      { label: 'Why?', placeholder: 'One sentence...' },
    ],
  },
]

export const getGame = (id: string) => GAMES.find(g => g.id === id)
export const getFreeGames = () => GAMES.filter(g => g.plans.includes('free'))
export const getGamesByPlan = (plan: 'free' | 'team' | 'pro') =>
  GAMES.filter(g => g.plans.includes(plan))
