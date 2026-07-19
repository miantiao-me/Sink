<template>
  <Card class="h-fit">
    <CardHeader>
      <CardTitle><h2>{{ $t('migrate.access_export.title') }}</h2></CardTitle>
      <CardDescription>{{ $t('migrate.access_export.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <DashboardMigrateAccessExportForm />
    </CardContent>
  </Card>
</template>
