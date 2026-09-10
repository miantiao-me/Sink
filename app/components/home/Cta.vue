<script setup lang="ts">
const { documentation } = useAppConfig()
</script>

<template>
  <section
    class="
      bg-background py-16 text-foreground
      md:py-24
    "
  >
    <div class="mx-auto max-w-6xl px-6">
      <Card
        class="mx-auto max-w-3xl"
      >
        <CardContent
          class="
            py-4 text-center
            md:py-6
          "
        >
          <h2
            class="text-3xl font-semibold text-balance"
          >
            {{ $t('home.cta.title') }}
          </h2>
          <p class="mt-4 text-muted-foreground">
            {{ $t('home.cta.description') }}
          </p>

          <div class="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              as-child
              size="lg"
            >
              <a
                :href="`${documentation}/guide/getting-started`"
                target="_blank"
                rel="noopener noreferrer"
                :title="$t('home.cta.button')"
              >
                {{ $t('home.cta.button') }}
              </a>
            </Button>

            <Button
              as-child
              size="lg"
              variant="outline"
            >
              <NuxtLink to="/dashboard" :title="$t('dashboard.title')">
                {{ $t('dashboard.title') }}
              </NuxtLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
