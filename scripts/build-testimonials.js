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
  '1930301401323975179', // @lakphy
  '1961700003459862799', // @wey_gu
  '1794746047136411723', // @morandotim
  '1988243083558035901', // @yeahwong
  '1808150012058390969', // @m1ssuo
  '1893594908147270073', // @hellokaton
  '1857623546606080350', // @TooooooBug
  '1837864449732235602', // @geekbb
  '1794162548776079701', // @miantiao_me
  '1901619539869331519', // @GitHub_Daily
  '1941722268847177887', // @KaiyuanXie
  '1952949386348249504', // @taresky
  '1988423170148495867', // @wey_gu
  '2008358120498884871', // @indie_maker_fox
  '2008717152283705401', // @FrankFika
  '2059979252578357733', // @iluciddreaming
  '1877194614806864242', // @frankwong0205
  '1888954153189380600', // @iBigQiang
  '2018655797006541184', // @wey_gu
]

const API_BASE = 'https://react-tweet.vercel.app/api/tweet'
const BATCH_SIZE = 5

async function fetchTweet(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      signal: AbortSignal.timeout(10_000),
    })
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

    // Skip reply-style tweets that open with @mentions
    if (cleanContent.startsWith('@')) {
      console.warn(`Skipping @-prefixed tweet ${id}`)
      return null
    }

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
  catch (error) {
    console.warn(`Failed to fetch tweet ${id}:`, error)
    return null
  }
}

async function main() {
  console.log('Fetching testimonials from Twitter...')

  const shuffledIds = [...TWEET_IDS]
  for (let i = shuffledIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]]
  }

  const results = []
  for (let i = 0; i < shuffledIds.length; i += BATCH_SIZE) {
    const batch = shuffledIds.slice(i, i + BATCH_SIZE)
    results.push(...await Promise.all(batch.map(fetchTweet)))
  }
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
