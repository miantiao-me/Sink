<script setup lang="ts">
const { data: oidcConfig, status } = useFetch<{ enabled: boolean }>('/api/auth/config')
const loginMode = computed(() => resolveLoginMode(status.value, oidcConfig.value?.enabled))
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>
        <h1 class="text-2xl font-medium text-balance">
          {{ $t('login.title') }}
        </h1>
      </CardTitle>
      <CardDescription v-if="loginMode === 'single-user'">
        {{ $t('login.description') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <Skeleton v-if="loginMode === 'loading'" class="h-9 w-full" />
      <template v-else-if="loginMode === 'oidc'">
        <Button type="button" class="w-full" @click="signInWithOidc()">
          {{ $t('login.oidc_submit') }}
        </Button>
      </template>
      <LoginForm v-else-if="loginMode === 'single-user'" />
      <Alert v-else variant="destructive" role="alert">
        <AlertTitle>{{ $t('login.failed') }}</AlertTitle>
      </Alert>
    </CardContent>
  </Card>
</template>
