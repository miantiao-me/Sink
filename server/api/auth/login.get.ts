export default eventHandler(async (event) => {
  const config = await getOidcConfiguration(event)
  const runtime = getOidcRuntimeConfig(event)
  const codeVerifier = oidcClient.randomPKCECodeVerifier()
  const codeChallenge = await oidcClient.calculatePKCECodeChallenge(codeVerifier)
  const state = oidcClient.randomState()
  const nonce = oidcClient.randomNonce()
  const returnTo = normalizeOidcReturnTo(getQuery(event).returnTo)

  await setOidcTransaction(event, {
    codeVerifier,
    state,
    nonce,
    returnTo,
    expiresAt: Math.floor(Date.now() / 1000) + 10 * 60,
  })

  const authorizationUrl = oidcClient.buildAuthorizationUrl(config, {
    redirect_uri: runtime.redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })
  return sendRedirect(event, authorizationUrl.href)
})
