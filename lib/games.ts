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
  plans: ('free' | 'team' | 'pro')[] // which plans can access
  emoji: string
}

export const GAMES: GameConfig[] = [
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
    description: 'Complete a prompt like "People are always surprised to learn I..."',
    engine: 'submit-reveal',
    category: 'reveal',
    durationMinutes: 5,
    minPlayers: 2,
    emoji: '✍️',
    plans: ['free', 'team', 'pro'],
    prompt: 'People are always surprised to learn I...',
    fields: [{ label: 'Your answer', placeholder: 'Complete the sentence...' }],
  },
  {
    id: 'hot-take',
    name: 'Hot Take',
    description: 'Everyone submits an unpopular opinion. Team votes whose is hottest.',
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
    description: 'Submit the worst advice you\'ve ever given or received. Team votes.',
    engine: 'submit-reveal',
    category: 'laugh',
    durationMinutes: 6,
    minPlayers: 3,
    emoji: '😬',
    plans: ['team', 'pro'],
    fields: [{ label: 'The terrible advice', placeholder: 'The worse the better...' }],
  },
  {
    id: 'would-you-rather',
    name: 'Would You Rather',
    description: '5 rapid-fire dilemmas. Everyone votes. See how your team thinks.',
    engine: 'vote',
    category: 'compete',
    durationMinutes: 4,
    minPlayers: 2,
    emoji: '⚡',
    plans: ['free', 'team', 'pro'],
    rounds: 5,
  },
  {
    id: 'gif-battle',
    name: 'GIF Battle',
    description: 'Find a GIF that best matches the prompt. Team votes for the best.',
    engine: 'vote',
    category: 'laugh',
    durationMinutes: 5,
    minPlayers: 3,
    emoji: '🎬',
    plans: ['team', 'pro'],
  },
  {
    id: 'hot-seat',
    name: 'Hot Seat',
    description: 'One person on stage for 60 seconds. Team submits questions, they pick one to answer.',
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
  {
    id: 'this-or-that',
    name: 'This or That',
    description: '10 binary choices in 20 seconds each. Coffee or Tea? Early bird or Night owl?',
    engine: 'timed',
    category: 'compete',
    durationMinutes: 4,
    minPlayers: 2,
    emoji: '⚖️',
    plans: ['team', 'pro'],
    timerSeconds: 20,
    rounds: 10,
  },
  {
    id: 'emoji-story',
    name: 'Emoji Story',
    description: 'Describe your weekend or current mood using only emojis. Others guess.',
    engine: 'timed',
    category: 'laugh',
    durationMinutes: 5,
    minPlayers: 2,
    emoji: '😂',
    plans: ['team', 'pro'],
    timerSeconds: 30,
  },
]

export const getGame = (id: string) => GAMES.find(g => g.id === id)
export const getFreeGames = () => GAMES.filter(g => g.plans.includes('free'))
export const getGamesByPlan = (plan: 'free' | 'team' | 'pro') =>
  GAMES.filter(g => g.plans.includes(plan))
