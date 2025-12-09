/**
 * Deep Link Configuration for Mobile Apps
 *
 * This file contains configurations for different mobile apps and their deep link schemes.
 * Add new app configurations here to support additional mobile apps.
 */

export interface DeepLinkConfig {
  hostname: string
  appScheme: string
  transformPath?: (url: URL) => string
  description?: string
}

/**
 * Configuration for Amazon Shopping App
 * Supports multiple Amazon domains
 */
const amazonDomains = [
  { hostname: 'amazon.com', country: 'US' },
  { hostname: 'amazon.co.uk', country: 'UK' },
  { hostname: 'amazon.de', country: 'Germany' },
  { hostname: 'amazon.fr', country: 'France' },
  { hostname: 'amazon.ca', country: 'Canada' },
  { hostname: 'amazon.com.au', country: 'Australia' },
  { hostname: 'amazon.co.jp', country: 'Japan' },
  { hostname: 'amazon.in', country: 'India' },
]

const amazonConfigs: DeepLinkConfig[] = amazonDomains.map(({ hostname, country }) => ({
  hostname,
  appScheme: 'com.amazon.mobile.shopping.web://',
  transformPath: (url: URL) => url.hostname + url.pathname + url.search,
  description: `Amazon ${country} Shopping App`,
}))

/**
 * Social Media Apps - Most Popular
 */
const socialMediaConfigs: DeepLinkConfig[] = [
  {
    hostname: 'instagram.com',
    appScheme: 'instagram://app/',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        if (!parts.length)
          return 'camera'

        // Handle posts: /p/POST_ID/
        if (parts[0] === 'p' && parts[1]) {
          return `media?id=${parts[1]}`
        }

        // Handle reels: /reel/REEL_ID/ or /reels/REEL_ID/
        if ((parts[0] === 'reel' || parts[0] === 'reels') && parts[1]) {
          return `reel?id=${parts[1]}`
        }

        // Handle stories: /stories/USERNAME/STORY_ID/
        if (parts[0] === 'stories' && parts[1] && parts[2]) {
          return `story?story_id=${parts[2]}&username=${parts[1]}`
        }

        // Handle IGTV: /tv/VIDEO_ID/
        if (parts[0] === 'tv' && parts[1]) {
          return `tv?id=${parts[1]}`
        }

        // Handle user profiles: /USERNAME/
        if (parts[0] && !['p', 'reel', 'reels', 'stories', 'tv'].includes(parts[0])) {
          return `user?username=${parts[0]}`
        }

        return 'camera'
      }
      catch {
        return 'camera'
      }
    },
    description: 'Instagram App',
  },
  {
    hostname: 'tiktok.com',
    appScheme: 'snssdk1233://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle videos: /@username/video/VIDEO_ID
        if (parts[0]?.startsWith('@') && parts[1] === 'video' && parts[2]) {
          return `video?id=${parts[2]}`
        }

        // Handle user profiles: /@username
        if (parts[0]?.startsWith('@')) {
          return `user/profile?username=${parts[0].substring(1)}`
        }

        // Handle direct video links: /video/VIDEO_ID
        if (parts[0] === 'video' && parts[1]) {
          return `video?id=${parts[1]}`
        }

        return 'home'
      }
      catch {
        return 'home'
      }
    },
    description: 'TikTok App',
  },
  {
    hostname: 'vm.tiktok.com',
    appScheme: 'snssdk1233://',
    transformPath: (_url: URL) => {
      // Short URLs - just open the app, it will handle the redirect
      return 'home'
    },
    description: 'TikTok App (Short URL)',
  },
  {
    hostname: 'vt.tiktok.com',
    appScheme: 'snssdk1233://',
    transformPath: (_url: URL) => {
      return 'home'
    },
    description: 'TikTok App (Short URL)',
  },
  {
    hostname: 'x.com',
    appScheme: 'twitter://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        if (!parts.length)
          return 'timeline'

        // Handle tweets: /username/status/TWEET_ID
        if (parts.length >= 3 && parts[1] === 'status') {
          return `status?id=${parts[2]}`
        }

        // Handle user profiles: /username
        if (parts.length === 1) {
          return `user?screen_name=${parts[0]}`
        }

        return 'timeline'
      }
      catch {
        return 'timeline'
      }
    },
    description: 'X (Twitter) App',
  },
  {
    hostname: 'twitter.com',
    appScheme: 'twitter://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        if (!parts.length)
          return 'timeline'

        // Handle tweets: /username/status/TWEET_ID
        if (parts.length >= 3 && parts[1] === 'status') {
          return `status?id=${parts[2]}`
        }

        // Handle user profiles: /username
        if (parts.length === 1) {
          return `user?screen_name=${parts[0]}`
        }

        return 'timeline'
      }
      catch {
        return 'timeline'
      }
    },
    description: 'Twitter App',
  },
  {
    hostname: 'facebook.com',
    appScheme: 'fb://facewebmodal/f',
    transformPath: (url: URL) => {
      try {
        // Facebook deep links are complex - fallback to opening in app
        const fullUrl = url.href
        return `?href=${encodeURIComponent(fullUrl)}`
      }
      catch {
        return ''
      }
    },
    description: 'Facebook App',
  },
  {
    hostname: 'm.facebook.com',
    appScheme: 'fb://facewebmodal/f',
    transformPath: (url: URL) => {
      try {
        const fullUrl = url.href
        return `?href=${encodeURIComponent(fullUrl)}`
      }
      catch {
        return ''
      }
    },
    description: 'Facebook App',
  },
  {
    hostname: 'linkedin.com',
    appScheme: 'linkedin://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle profiles: /in/username
        if (parts[0] === 'in' && parts[1]) {
          return `profile/${parts[1]}`
        }

        // Handle company pages: /company/company-name
        if (parts[0] === 'company' && parts[1]) {
          return `company/${parts[1]}`
        }

        // Handle posts: /feed/update/urn:li:activity:ID
        if (parts[0] === 'feed' || parts[0] === 'posts') {
          return `feed${url.search}`
        }

        return 'feed'
      }
      catch {
        return 'feed'
      }
    },
    description: 'LinkedIn App',
  },
  {
    hostname: 'reddit.com',
    appScheme: 'reddit://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle subreddits: /r/subreddit
        if (parts[0] === 'r' && parts[1]) {
          // Handle posts: /r/subreddit/comments/POST_ID/title
          if (parts[2] === 'comments' && parts[3]) {
            return `${parts[1]}/comments/${parts[3]}`
          }
          return parts[1]
        }

        // Handle user profiles: /u/username or /user/username
        if ((parts[0] === 'u' || parts[0] === 'user') && parts[1]) {
          return `user/${parts[1]}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Reddit App',
  },
]

/**
 * Messaging Apps
 */
const messagingConfigs: DeepLinkConfig[] = [
  {
    hostname: 'wa.me',
    appScheme: 'whatsapp://',
    transformPath: (url: URL) => {
      try {
        const phoneNumber = url.pathname.substring(1).split('?')[0]
        const text = url.searchParams.get('text')

        if (!phoneNumber)
          return 'send'

        if (text) {
          return `send?phone=${phoneNumber}&text=${encodeURIComponent(text)}`
        }
        return `send?phone=${phoneNumber}`
      }
      catch {
        return 'send'
      }
    },
    description: 'WhatsApp App',
  },
  {
    hostname: 'web.whatsapp.com',
    appScheme: 'whatsapp://',
    transformPath: (url: URL) => {
      try {
        if (url.searchParams.has('phone')) {
          const phone = url.searchParams.get('phone')
          const text = url.searchParams.get('text')

          if (text) {
            return `send?phone=${phone}&text=${encodeURIComponent(text)}`
          }
          return `send?phone=${phone}`
        }
        return 'send'
      }
      catch {
        return 'send'
      }
    },
    description: 'WhatsApp App',
  },
  {
    hostname: 'api.whatsapp.com',
    appScheme: 'whatsapp://',
    transformPath: (url: URL) => {
      try {
        if (url.searchParams.has('phone')) {
          const phone = url.searchParams.get('phone')
          const text = url.searchParams.get('text')

          if (text) {
            return `send?phone=${phone}&text=${encodeURIComponent(text)}`
          }
          return `send?phone=${phone}`
        }
        return 'send'
      }
      catch {
        return 'send'
      }
    },
    description: 'WhatsApp App',
  },
  {
    hostname: 't.me',
    appScheme: 'tg://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        if (!parts.length)
          return 'resolve'

        // Handle join links: /joinchat/INVITE_CODE or /+INVITE_CODE
        if (parts[0] === 'joinchat' && parts[1]) {
          return `join?invite=${parts[1]}`
        }

        if (parts[0].startsWith('+')) {
          return `join?invite=${parts[0].substring(1)}`
        }

        // Handle sticker sets: /addstickers/SET_NAME
        if (parts[0] === 'addstickers' && parts[1]) {
          return `addstickers?set=${parts[1]}`
        }

        // Handle username/channel: /username
        return `resolve?domain=${parts[0]}`
      }
      catch {
        return 'resolve'
      }
    },
    description: 'Telegram App',
  },
  {
    hostname: 'telegram.me',
    appScheme: 'tg://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)
        if (!parts.length)
          return 'resolve'
        return `resolve?domain=${parts[0]}`
      }
      catch {
        return 'resolve'
      }
    },
    description: 'Telegram App',
  },
  {
    hostname: 'discord.com',
    appScheme: 'discord://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle channels: /channels/GUILD_ID/CHANNEL_ID
        if (parts[0] === 'channels' && parts[1] && parts[2]) {
          return `channels/${parts[1]}/${parts[2]}`
        }

        // Handle invites: /invite/CODE
        if (parts[0] === 'invite' && parts[1]) {
          return `invite/${parts[1]}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Discord App',
  },
  {
    hostname: 'discord.gg',
    appScheme: 'discord://',
    transformPath: (url: URL) => {
      try {
        const inviteCode = url.pathname.substring(1).split('?')[0]
        return inviteCode ? `invite/${inviteCode}` : ''
      }
      catch {
        return ''
      }
    },
    description: 'Discord App (Invite)',
  },
]

/**
 * Shopping Apps
 */
const shoppingConfigs: DeepLinkConfig[] = [
  {
    hostname: 'ebay.com',
    appScheme: 'ebay://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle items: /itm/ITEM_ID or /itm/title/ITEM_ID
        if (parts[0] === 'itm') {
          const itemId = parts[parts.length - 1]
          return `item/view?id=${itemId}`
        }

        // Handle user profiles: /usr/USERNAME
        if (parts[0] === 'usr' && parts[1]) {
          return `user/${parts[1]}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'eBay App',
  },
  {
    hostname: 'etsy.com',
    appScheme: 'etsy://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle listings: /listing/LISTING_ID
        if (parts[0] === 'listing' && parts[1]) {
          return `listing/${parts[1]}`
        }

        // Handle shops: /shop/SHOP_NAME
        if (parts[0] === 'shop' && parts[1]) {
          return `shop/${parts[1]}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Etsy App',
  },
  {
    hostname: 'walmart.com',
    appScheme: 'walmart://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle products: /ip/PRODUCT_NAME/PRODUCT_ID
        if (parts[0] === 'ip' && parts.length >= 2) {
          const productId = parts[parts.length - 1]
          return `product/${productId}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Walmart App',
  },
]

/**
 * Entertainment Apps
 */
const entertainmentConfigs: DeepLinkConfig[] = [
  {
    hostname: 'youtube.com',
    appScheme: 'youtube://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle video: /watch?v=VIDEO_ID
        if (url.pathname === '/watch' || parts[0] === 'watch') {
          const videoId = url.searchParams.get('v')
          return videoId ? `watch?v=${videoId}` : ''
        }

        // Handle shorts: /shorts/VIDEO_ID
        if (parts[0] === 'shorts' && parts[1]) {
          return `shorts/${parts[1]}`
        }

        // Handle channels: /channel/CHANNEL_ID or /c/CHANNEL_NAME or /@HANDLE
        if (parts[0] === 'channel' && parts[1]) {
          return `channel/${parts[1]}`
        }

        if (parts[0] === 'c' && parts[1]) {
          return `channel/${parts[1]}`
        }

        if (parts[0] === 'user' && parts[1]) {
          return `user/${parts[1]}`
        }

        if (parts[0]?.startsWith('@')) {
          return `channel/${parts[0].substring(1)}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'YouTube App',
  },
  {
    hostname: 'youtu.be',
    appScheme: 'youtube://',
    transformPath: (url: URL) => {
      try {
        const videoId = url.pathname.substring(1).split('?')[0]
        return videoId ? `watch?v=${videoId}` : ''
      }
      catch {
        return ''
      }
    },
    description: 'YouTube App (Short URL)',
  },
  {
    hostname: 'music.youtube.com',
    appScheme: 'youtubemusic://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        if (parts[0] === 'watch' || url.pathname === '/watch') {
          const videoId = url.searchParams.get('v')
          return videoId ? `watch?v=${videoId}` : ''
        }

        if (parts[0] === 'playlist' && url.searchParams.get('list')) {
          return `playlist?list=${url.searchParams.get('list')}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'YouTube Music App',
  },
  {
    hostname: 'netflix.com',
    appScheme: 'nflx://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle titles: /title/TITLE_ID or /watch/TITLE_ID
        if (parts[0] === 'title' && parts[1]) {
          return `title/${parts[1]}`
        }

        if (parts[0] === 'watch' && parts[1]) {
          return `watch/${parts[1]}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Netflix App',
  },
  {
    hostname: 'open.spotify.com',
    appScheme: 'spotify://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        if (parts.length < 2)
          return ''

        const [type, id] = parts

        // Handle: /track/ID, /album/ID, /playlist/ID, /artist/ID, /show/ID, /episode/ID
        if (['track', 'album', 'playlist', 'artist', 'show', 'episode'].includes(type)) {
          return `${type}/${id}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Spotify App',
  },
  {
    hostname: 'twitch.tv',
    appScheme: 'twitch://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        if (!parts.length)
          return 'stream'

        // Handle videos: /videos/VIDEO_ID or /USERNAME/videos/VIDEO_ID
        const videoIndex = parts.indexOf('videos')
        if (videoIndex !== -1 && parts[videoIndex + 1]) {
          return `video/v${parts[videoIndex + 1]}`
        }

        // Handle clips: /USERNAME/clip/CLIP_SLUG or /clip/CLIP_SLUG
        const clipIndex = parts.indexOf('clip')
        if (clipIndex !== -1 && parts[clipIndex + 1]) {
          return `clip/${parts[clipIndex + 1]}`
        }

        // Handle streams: /USERNAME
        return `stream/${parts[0]}`
      }
      catch {
        return 'stream'
      }
    },
    description: 'Twitch App',
  },
]

/**
 * Productivity Apps
 */
const productivityConfigs: DeepLinkConfig[] = [
  {
    hostname: 'drive.google.com',
    appScheme: 'googledrive://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle files: /file/d/FILE_ID/view
        if (parts[0] === 'file' && parts[1] === 'd' && parts[2]) {
          return `file?id=${parts[2]}`
        }

        // Handle folders: /drive/folders/FOLDER_ID
        if (parts.includes('folders')) {
          const folderIndex = parts.indexOf('folders')
          if (parts[folderIndex + 1]) {
            return `folder?id=${parts[folderIndex + 1]}`
          }
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Google Drive App',
  },
  {
    hostname: 'docs.google.com',
    appScheme: 'googledocs://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle: /document/d/DOC_ID, /spreadsheets/d/SHEET_ID, /presentation/d/PRESENTATION_ID
        if (parts[0] === 'document' && parts[1] === 'd' && parts[2]) {
          return `document?id=${parts[2]}`
        }

        if (parts[0] === 'spreadsheets' && parts[1] === 'd' && parts[2]) {
          return `spreadsheets?id=${parts[2]}`
        }

        if (parts[0] === 'presentation' && parts[1] === 'd' && parts[2]) {
          return `presentation?id=${parts[2]}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Google Docs/Sheets/Slides App',
  },
  {
    hostname: 'dropbox.com',
    appScheme: 'dbapi-2://',
    transformPath: (url: URL) => {
      try {
        // Dropbox deep links work better with the web URL
        return `1/view${url.pathname}${url.search}`
      }
      catch {
        return ''
      }
    },
    description: 'Dropbox App',
  },
  {
    hostname: 'notion.so',
    appScheme: 'notion://',
    transformPath: (url: URL) => {
      try {
        const pathname = url.pathname.substring(1)
        return pathname ? `${pathname}${url.search}` : ''
      }
      catch {
        return ''
      }
    },
    description: 'Notion App',
  },
  {
    hostname: 'slack.com',
    appScheme: 'slack://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle archives: /archives/CHANNEL_ID or /archives/CHANNEL_ID/pMESSAGE_TS
        if (parts[0] === 'archives' && parts[1]) {
          const channelId = parts[1]

          // Extract team ID from URL if present
          const match = url.hostname.match(/^([^.]+)\.slack\.com$/)
          const teamId = match ? match[1] : ''

          if (parts[2] && parts[2].startsWith('p')) {
            // Has message timestamp
            const messageTs = parts[2].substring(1)
            return `channel?team=${teamId}&id=${channelId}&message=${messageTs}`
          }

          return `channel?team=${teamId}&id=${channelId}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Slack App',
  },
  {
    hostname: 'trello.com',
    appScheme: 'trello://',
    transformPath: (url: URL) => {
      try {
        const parts = url.pathname.split('/').filter(p => p)

        // Handle boards: /b/BOARD_ID/board-name
        if (parts[0] === 'b' && parts[1]) {
          return `x-callback-url/showBoard?boardId=${parts[1]}`
        }

        // Handle cards: /c/CARD_ID/card-name
        if (parts[0] === 'c' && parts[1]) {
          return `x-callback-url/showCard?cardId=${parts[1]}`
        }

        return ''
      }
      catch {
        return ''
      }
    },
    description: 'Trello App',
  },
]

/**
 * All deep link configurations
 * Add new configurations here or import from other modules
 */
export const DEEP_LINK_CONFIGS: DeepLinkConfig[] = [
  ...amazonConfigs,
  ...socialMediaConfigs,
  ...messagingConfigs,
  ...shoppingConfigs,
  ...entertainmentConfigs,
  ...productivityConfigs,
]

/**
 * Helper function to get all supported hostnames
 */
export function getSupportedHostnames(): string[] {
  return DEEP_LINK_CONFIGS.map(config => config.hostname)
}

/**
 * Helper function to normalize hostname (remove www.)
 */
function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, '')
}

/**
 * Helper function to get configuration for a specific hostname
 * Handles www. variants automatically
 */
export function getConfigForHostname(hostname: string): DeepLinkConfig | undefined {
  const normalized = normalizeHostname(hostname)

  return DEEP_LINK_CONFIGS.find((config) => {
    const configNormalized = normalizeHostname(config.hostname)
    return normalized === configNormalized
      || normalized.endsWith(`.${configNormalized}`)
  })
}

/**
 * Helper function to check if a hostname is supported
 */
export function isHostnameSupported(hostname: string): boolean {
  return getConfigForHostname(hostname) !== undefined
}

/**
 * Helper function to generate deep link from URL
 */
export function generateDeepLink(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const config = getConfigForHostname(urlObj.hostname)

    if (!config)
      return null

    const path = config.transformPath ? config.transformPath(urlObj) : ''
    return `${config.appScheme}${path}`
  }
  catch {
    return null
  }
}
