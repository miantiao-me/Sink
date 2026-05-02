const EMOJI_FLAG_UNICODE_STARTING_POSITION = 127397

export function getFlag(countryCode: string = '') {
  const regex = /^[A-Z]{2}$/.test(countryCode)
  if (!countryCode || !regex)
    return void 0
  return String.fromCodePoint(...countryCode.split('').map(char => EMOJI_FLAG_UNICODE_STARTING_POSITION + char.charCodeAt(0)))
}
