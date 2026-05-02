<script setup lang="ts">
import testimonials from '@/data/testimonials.json'

interface Testimonial {
  id: string
  name: string
  username: string
  content: string
  url: string
  verified: boolean
  date: string
}

const typedTestimonials = testimonials as Testimonial[]
</script>

<template>
  <section>
    <div
      class="
        py-12
        md:py-16
      "
    >
      <div class="mx-auto max-w-6xl px-6">
        <div class="text-center">
          <h2 class="text-3xl font-semibold">
            {{ $t('home.testimonials.title') }}
          </h2>
          <p class="mt-4 text-muted-foreground">
            {{ $t('home.testimonials.subtitle') }}
          </p>
        </div>
        <div
          class="
            mt-8 columns-1 gap-3 space-y-3
            md:mt-12 md:columns-3
          "
        >
          <a
            v-for="testimonial in typedTestimonials"
            :key="testimonial.id"
            :href="testimonial.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block break-inside-avoid"
          >
            <Card
              class="
                transition-shadow
                hover:shadow-md
              "
            >
              <CardContent class="grid grid-cols-[auto_1fr] gap-3 px-4 py-0">
                <Avatar class="size-9">
                  <AvatarImage
                    :alt="testimonial.name"
                    :src="`https://unavatar.webp.se/x/${testimonial.username}`"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <AvatarFallback>{{ testimonial.name.slice(0, 2) }}</AvatarFallback>
                </Avatar>

                <div>
                  <div class="flex items-center gap-1">
                    <h3 class="font-medium">
                      {{ testimonial.name }}
                    </h3>
                    <svg
                      v-if="testimonial.verified"
                      class="size-4 text-blue-500"
                      viewBox="0 0 22 22"
                      fill="currentColor"
                    >
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                    </svg>
                  </div>

                  <span
                    class="block text-sm tracking-wide text-muted-foreground"
                  >
                    @{{ testimonial.username }}
                  </span>

                  <blockquote class="mt-3">
                    <p class="text-foreground">
                      {{ testimonial.content }}
                    </p>
                  </blockquote>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
