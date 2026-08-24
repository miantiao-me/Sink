<template>
  <section
    class="
      bg-background py-16 text-foreground
      md:py-24
    "
  >
    <div class="mx-auto max-w-6xl px-6">
      <div
        class="
          mx-auto grid max-w-3xl grid-cols-2 items-center gap-4
          sm:gap-10
          md:gap-16
        "
      >
        <img
          class="h-auto w-full min-w-0"
          alt="Cloudflare"
          src="@/assets/images/cloudflare.png"
          fetchpriority="high"
          width="350"
          height="176"
        >
        <img
          class="h-auto w-full min-w-0"
          alt="Nuxt.js"
          src="@/assets/images/nuxtjs.png"
          fetchpriority="high"
          width="350"
          height="176"
        >
      </div>
    </div>
  </section>
</template>
