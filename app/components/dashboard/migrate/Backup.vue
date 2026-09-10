<script setup lang="ts">
import { CloudUpload, Loader } from '@lucide/vue'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const isBackingUp = ref(false)

async function handleBackup() {
  isBackingUp.value = true

  try {
    await useAPI('/api/backup', {
      method: 'POST',
    })

    toast.success(t('migrate.backup.success'))
  }
  catch (error) {
    toast.error(t('migrate.backup.failed'), {
      description: error instanceof Error ? error.message : String(error),
    })
  }
  finally {
    isBackingUp.value = false
  }
}
</script>

<template>
  <Card class="h-fit">
    <CardHeader>
      <CardTitle><h2>{{ $t('migrate.backup.title') }}</h2></CardTitle>
      <CardDescription>{{ $t('migrate.backup.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Button
        :disabled="isBackingUp"
        :aria-busy="isBackingUp"
        @click="handleBackup"
      >
        <Loader
          v-if="isBackingUp" aria-hidden="true" class="
            mr-2 size-4
            motion-safe:animate-spin
          "
        />
        <CloudUpload v-else aria-hidden="true" class="mr-2 size-4" />
        <template v-if="isBackingUp">
          {{ $t('migrate.backup.backing_up') }}
        </template>
        <template v-else>
          {{ $t('migrate.backup.button') }}
        </template>
      </Button>
    </CardContent>
  </Card>
</template>
