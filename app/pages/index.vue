<script setup>
definePageMeta({
  layout: false
})

useHead({
  title: '資旅軟體開發有限公司 - GL SOFT CO., LTD.'
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <div class="max-w-2xl p-8 mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h1 class="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
        資旅軟體開發有限公司
      </h1>
      <h2 class="text-xl font-semibold text-center mb-8 text-gray-700 dark:text-gray-300">
        GL SOFT CO., LTD.
      </h2>
      <div class="space-y-4 text-gray-700 dark:text-gray-300">
        <div class="flex flex-col md:flex-row md:items-center">
          <span class="font-semibold mr-2 mb-1 md:mb-0">統編：</span>
          <span>90867427</span>
        </div>
        <div class="flex flex-col md:flex-row md:items-center">
          <span class="font-semibold mr-2 mb-1 md:mb-0">代表人：</span>
          <span>翟洪鋒 (HUNG FUNG CHAK)</span>
        </div>
        <div class="flex flex-col">
          <span class="font-semibold mb-2">地址：</span>
          <div class="ml-0 md:ml-4 space-y-1">
            <p>臺北市信義區松德路171號9樓之2</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              9 F.-2, No. 171, Songde Rd., Xinyi Dist., Taipei City 110030, Taiwan (R.O.C.)
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
