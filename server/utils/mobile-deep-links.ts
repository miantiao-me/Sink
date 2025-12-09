import type { H3Event } from 'h3'
import { UAParser } from 'ua-parser-js'
import { DEEP_LINK_CONFIGS } from './deep-link-configs'

// Simple HTML escaping function to prevent XSS
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export interface MobileDeepLinkResult {
  shouldInterceptRedirect: boolean
  htmlResponse: Response | null
}

export async function handleMobileDeepLink(event: H3Event, targetUrl: string): Promise<MobileDeepLinkResult> {
  const config = useRuntimeConfig(event)

  // Normalize runtime config values (they arrive as strings)
  const enableMobileDeepLinks = String(config.enableMobileDeepLinks) === 'true'
  const deepLinkTimeout = Number(config.deepLinkTimeout) || 3000

  // Check if mobile deep linking is enabled in environment
  if (!enableMobileDeepLinks) {
    return {
      shouldInterceptRedirect: false,
      htmlResponse: null,
    }
  }

  // Get the user agent
  const userAgent = getRequestHeader(event, 'user-agent') || ''
  const parser = new UAParser(userAgent)
  const device = parser.getDevice()
  const isMobile = device.type === 'mobile' || device.type === 'tablet'

  if (!isMobile) {
    return {
      shouldInterceptRedirect: false,
      htmlResponse: null,
    }
  }

  // Parse the target URL
  const parsedUrl = new URL(targetUrl)

  // Find matching deep link configuration
  const hostname = parsedUrl.hostname.toLowerCase()
  const matchingConfig = DEEP_LINK_CONFIGS.find((config) => {
    const candidate = config.hostname.toLowerCase()
    return hostname === candidate || hostname.endsWith(`.${candidate}`)
  })

  if (!matchingConfig) {
    return {
      shouldInterceptRedirect: false,
      htmlResponse: null,
    }
  }

  // Generate the deep link URL
  const appPath = matchingConfig.transformPath
    ? matchingConfig.transformPath(parsedUrl)
    : parsedUrl.pathname + parsedUrl.search

  const appUrl = matchingConfig.appScheme + appPath.replace(/^\//, '')

  // Escape URLs to prevent XSS
  const safeAppUrl = escapeHtml(appUrl)
  const safeTargetUrl = escapeHtml(targetUrl)

  // Create HTML response with deep linking
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Opening App...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          text-align: center;
          background: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
        }
        .loader {
          font-size: 2rem;
          margin-bottom: 20px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .message {
          color: #666;
          font-size: 1.1rem;
          margin-bottom: 10px;
        }
        .sub-message {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }
        .button-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 20px;
        }
        .fallback-link {
          padding: 12px 20px;
          background: #000000;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          font-size: 0.9rem;
          font-weight: 500;
          transition: background-color 0.2s;
          border: 1px solid #000000;
        }
        .fallback-link:hover {
          background: #333333;
        }
        .app-link {
          padding: 12px 20px;
          background: #ffffff;
          color: #000000;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          font-size: 0.9rem;
          font-weight: 500;
          transition: background-color 0.2s;
          border: 1px solid #000000;
        }
        .app-link:hover {
          background: #f5f5f5;
        }
        .no-js-message {
          color: #dc3545;
          font-size: 0.85rem;
          margin-top: 15px;
          padding: 10px;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
        #choice-section {
          display: none;
        }
      </style>
    </head>
    <body>
      <div id="choice-section" class="container">
        <div class="loader">⌛</div>
        <div class="message">Opening app...</div>
        <div class="sub-message">If the app doesn't open, you'll be redirected to the website</div>

        <div class="button-group">
          <a id="app-button" href="${safeAppUrl}" class="app-link">Open In App</a>
          <a id="browser-button" href="${safeTargetUrl}" class="fallback-link">Open In Browser</a>
        </div>

        <noscript>
          <div class="no-js-message">
            JavaScript is disabled. Please choose an option above to continue.
          </div>
        </noscript>
      </div>

      <a id="hidden" href="${safeAppUrl}" />

      <script>
        // Mobile detection
        var isMobile = {
          Android: function() {
            return /Android/i.test(navigator.userAgent);
          },
          BlackBerry: function() {
            return /BlackBerry/i.test(navigator.userAgent);
          },
          iOS: function() {
            return /iPhone|iPad|iPod/i.test(navigator.userAgent);
          },
          Windows: function() {
            return /IEMobile/i.test(navigator.userAgent);
          },
          any: function() {
            return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Windows());
          }
        };

        function redirectToApp() {
          window.location = "${safeAppUrl}";
        }

        function redirectToBrowser() {
          window.location = "${safeTargetUrl}";
        }

        // Try to open the app first
        if (isMobile.any()) {
          // Special handling for Facebook Messenger on iPhone
          const isFacebookMessengerIphone = /FBCR/i.test(navigator.userAgent) && /iPhone/i.test(navigator.userAgent);

          if (!isFacebookMessengerIphone) {
            redirectToApp();
          }
        }

        // Show choice section after a delay
        setTimeout(function() {
          document.getElementById('choice-section').style.display = 'block';
        }, 2000);

        // Fallback to browser after timeout
        setTimeout(function() {
          window.location.replace("${safeTargetUrl}");
        }, ${deepLinkTimeout});
      </script>
    </body>
    </html>
  `

  return {
    shouldInterceptRedirect: true,
    htmlResponse: new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    }),
  }
}
