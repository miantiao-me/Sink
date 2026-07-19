<template>
  <div class="space-y-6" aria-hidden="true">
    <div class="flex h-10 items-center">
      <Skeleton class="h-6 w-56 max-w-2/3" />
    </div>

    <div
      class="
        grid gap-4
        sm:grid-cols-3 sm:gap-3
        lg:gap-4
      "
    >
      <Card v-for="index in 3" :key="index" size="sm">
        <CardHeader class="flex flex-row items-center justify-between">
          <Skeleton class="h-4 w-20" />
          <Skeleton class="size-4 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-20" />
        </CardContent>
      </Card>
    </div>

    <div>
      <div class="mb-4 flex items-center">
        <Skeleton class="h-9 w-44 rounded-md" />
      </div>
      <Card>
        <CardContent>
          <Skeleton class="aspect-4/1 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
