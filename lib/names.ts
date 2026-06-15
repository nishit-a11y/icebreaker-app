// Random fun name generator for participants
// No emails required — just a fun identity for the session

const adjectives = [
  'Purple', 'Cosmic', 'Sneaky', 'Mighty', 'Fuzzy', 'Blazing', 'Jolly',
  'Rusty', 'Neon', 'Golden', 'Silent', 'Wild', 'Brave', 'Clever',
  'Dizzy', 'Epic', 'Fancy', 'Gentle', 'Happy', 'Icy', 'Jumpy',
  'Keen', 'Lively', 'Moody', 'Noble', 'Odd', 'Peppy', 'Quirky',
  'Rapid', 'Shiny', 'Tiny', 'Urban', 'Vivid', 'Wacky', 'Zesty',
]

const nouns = [
  'Falcon', 'Mango', 'Llama', 'Panda', 'Rocket', 'Wizard', 'Ninja',
  'Penguin', 'Dragon', 'Phoenix', 'Koala', 'Narwhal', 'Jaguar', 'Otter',
  'Badger', 'Cactus', 'Dingo', 'Ember', 'Ferret', 'Gopher', 'Husky',
  'Iguana', 'Jackal', 'Kiwi', 'Lynx', 'Moose', 'Newt', 'Osprey',
  'Piranha', 'Quail', 'Raven', 'Sloth', 'Toucan', 'Uakari', 'Viper',
  'Walrus', 'Xerus', 'Yak', 'Zebu',
]

export function generateRandomName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj} ${noun}`
}

export function generateRoomCode(): string {
  const words = ['WOLF', 'BEAR', 'LION', 'HAWK', 'JADE', 'NOVA', 'BOLT', 'ECHO', 'FLUX', 'GLOW']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${word}-${num}`
}
