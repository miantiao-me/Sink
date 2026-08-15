<script setup lang="ts">
const { data: oidcConfig } = useFetch<{ enabled: boolean }>('/api/auth/config')
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>
        <h1 class="text-2xl font-medium text-balance">
          {{ $t('login.title') }}
        </h1>
      </CardTitle>
      <CardDescription>
        {{ $t('login.description') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <template v-if="oidcConfig?.enabled">
        <Button type="button" class="w-full" @click="signInWithOidc()">
          {{ $t('login.oidc_submit') }}
        </Button>
      </template>
      <LoginForm v-else />
    </CardContent>
  </Card>
</template>
