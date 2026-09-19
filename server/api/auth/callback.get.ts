export default eventHandler(async (event) => {
  const transaction = await takeOidcTransaction(event)
  if (!transaction) {
    throw createError({
      status: 401,
      statusText: 'Invalid or expired OIDC transaction',
    })
  }

  const config = await getOidcConfiguration(event)
  const tokens = await oidcClient.authorizationCodeGrant(config, getRequestURL(event), {
    pkceCodeVerifier: transaction.codeVerifier,
    expectedState: transaction.state,
    expectedNonce: transaction.nonce,
  }).catch((cause) => {
    throw createError({
      status: 401,
      statusText: 'OIDC callback validation failed',
      cause,
    })
  })
  const claims = tokens.claims()
  if (!claims) {
    throw createError({
      status: 401,
      statusText: 'OIDC response did not contain a valid ID token',
    })
  }

  const userInfo = config.serverMetadata().userinfo_endpoint
    ? await oidcClient.fetchUserInfo(config, tokens.access_token, claims.sub)
    : undefined
  await setOidcSession(event, {
    user: oidcUserFromClaims(claims, userInfo),
    issuer: claims.iss,
    expiresAt: oidcSessionExpiration(event, claims),
  })

  return sendRedirect(event, transaction.returnTo)
})
