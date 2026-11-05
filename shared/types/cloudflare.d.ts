declare module 'h3' {
  interface H3EventContext {
    hostSurface?: import('../utils/host-surface').HostSurface
    authMethod?: import('./auth').AuthMethod
    userID?: string
    userEmail?: string
    cloudflare: {
      request: Request<unknown, IncomingRequestCfProperties>
      env: Cloudflare.Env
      context: ExecutionContext
    }
  }
}

export {}
