import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Tweet IDs to fetch
const TWEET_IDS = [
  '1990813013247492308', // @xmok_
  '1876990358250246628', // @ianhowells
  '1931199560489251052', // @indie_maker_fox
  '1944683470627741966', // @allentown521
  '1925250262870237555', // @Mokkapps
  '1795169172873413116', // @GitHubGPT
  '1953003326317920422', // @ossalternative
  '1809763345320624271', // @f_sugar
  '1833125667568804284', // @bitdoze
  '1817702576629985685', // @HiTw93
  '1846465874389356916', // @luoleiorg
  '1796478331522781460', // @LuoSays
  '1905626254931624281', // @DeBill_me
  '1930301401323975179', // @lakphy
  '1961700003459862799', // @wey_gu
  '1794746047136411723', // @NoPeople404
  '1988243083558035901', // @yeahwong
  '1808150012058390969', // @m1ssuo
  '1893594908147270073', // @hellokaton
  '1857623546606080350', // @TooooooBug
]

const API_BASE = 'https://react-tweet.vercel.app/api/tweet'

async function fetchTweet(id) {
  const res = await fetch(`${API_BASE}/${id}`)
  if (!res.ok) {
    console.warn(`Failed to fetch tweet ${id}: ${res.status}`)
    return null
  }

  const json = await res.json()
  const tweet = json.data

  if (!tweet) {
    console.warn(`No data for tweet ${id}`)
    return null
  }

  // Clean up tweet text: remove t.co links and extra whitespace
  const cleanContent = tweet.text
    .replace(/https:\/\/t\.co\/\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    id: tweet.id_str,
    name: tweet.user.name,
    username: tweet.user.screen_name,
    content: cleanContent,
    url: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
    verified: tweet.user.is_blue_verified || false,
    date: tweet.created_at,
  }
}

async function main() {
  console.log('Fetching testimonials from Twitter...')

  // Shuffle TWEET_IDS for random order
  const shuffledIds = [...TWEET_IDS].sort(() => Math.random() - 0.5)

  const results = await Promise.all(shuffledIds.map(fetchTweet))
  const testimonials = results.filter(Boolean)

  if (testimonials.length === 0) {
    console.error('No testimonials fetched!')
    process.exit(1)
  }

  // Ensure data directory exists
  const dataDir = join(import.meta.dirname, '../app/data')
  mkdirSync(dataDir, { recursive: true })

  const outputPath = join(dataDir, 'testimonials.json')
  writeFileSync(outputPath, JSON.stringify(testimonials, null, 2), 'utf8')

  console.log(`✓ Generated ${testimonials.length} testimonials to ${outputPath}`)
}

main().catch((err) => {
  console.error('Failed to build testimonials:', err)
  process.exit(1)
})
