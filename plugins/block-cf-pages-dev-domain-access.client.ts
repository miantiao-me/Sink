export default defineNuxtPlugin(() => {
  if (window.location.hostname.endsWith('pages.dev')) {
    document.documentElement.innerHTML = `
      <html>
      <head><title>403 Forbidden</title></head>
      <body style="background:#231F20;color:#FF9300;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center">
          <h1 style="font-size:4rem;margin:0;">403</h1>
          <p style="color:#fff;margin-top:1rem;">Access Forbidden</p>
        </div>
      </body>
      </html>`
  }
})
