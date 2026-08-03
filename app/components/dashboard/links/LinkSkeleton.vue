<template>
  <Card
    size="sm"
    class="relative isolate h-full min-w-0"
    aria-hidden="true"
  >
    <CardContent class="flex h-full min-w-0 flex-1 flex-col gap-3">
      <div class="flex min-w-0 items-start gap-2">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton class="size-8 shrink-0 rounded-full" />
          <div class="min-w-0 flex-1 space-y-2">
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </div>

        <div
          class="
            flex shrink-0 items-center justify-end gap-1
            sm:gap-0
          "
        >
          <Skeleton
            v-for="index in 3"
            :key="index"
            class="
              size-10 rounded-md
              sm:size-9
            "
          />
          <Skeleton
            class="
              hidden size-9 rounded-md
              sm:block
            "
          />
        </div>
      </div>

      <div class="mt-auto flex flex-col space-y-3">
        <div class="flex h-5 min-w-0 items-center gap-2">
          <Skeleton class="h-4 w-20 shrink-0" />
          <Separator orientation="vertical" />
          <Skeleton class="h-4 min-w-0 flex-1" />
        </div>
        <div class="flex h-5 min-w-0 items-center gap-2">
          <Skeleton class="h-5 w-28 shrink-0 rounded-full bg-secondary" />
          <Skeleton class="ml-auto h-5 w-16 rounded-full" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
