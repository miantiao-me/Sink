<script setup>
import { Ellipsis, X } from 'lucide-vue-next'

const showMenu = ref(false)
const { title } = useAppConfig()
</script>

<template>
  <section class="pb-6">
    <nav class="relative z-50 container h-24 select-none">
      <div
        class="
          relative mx-auto flex h-24 flex-wrap items-center justify-between
          overflow-hidden border-b border-gray-200 px-0 font-medium
          md:overflow-visible
          lg:justify-center
        "
      >
        <div class="flex h-full w-1/4 items-center justify-start pr-4">
          <a
            href="/"
            :title="title"
            class="
              flex items-center space-x-2 py-4 text-xl font-black text-gray-900
              md:py-0
              dark:text-gray-100
            "
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full"
            >
              <img
                src="/sink.png"
                :alt="title"
                class="h-full w-full rounded-full"
              >
            </span>
            <span class="mx-2">{{ title }}</span>
          </a>
        </div>

        <div
          class="
            top-0 left-0 h-full w-full items-start bg-gray-900/50 p-4 text-sm
            md:relative md:flex md:w-3/4 md:items-center md:bg-transparent
            md:p-0
            lg:text-base
          "
          :class="{ 'fixed flex': showMenu, 'hidden': !showMenu }"
          @touchmove.prevent
        >
          <div
            class="
              h-auto w-full flex-col overflow-hidden rounded-lg bg-background
              md:relative md:flex md:flex-row md:overflow-visible
              md:rounded-none
            "
          >
            <a
              href="/"
              :title="title"
              class="
                inline-flex h-16 w-auto items-center px-4 text-xl leading-none
                font-black text-gray-900
                md:hidden
                dark:text-gray-100
              "
            >
              <span
                class="
                  flex h-8 w-8 items-center justify-center rounded-full
                  bg-gray-900 text-white
                "
              >
                <img
                  src="/sink.png"
                  :alt="title"
                  class="h-full w-full rounded-full"
                >
              </span>
              <span class="mx-2">{{ title }}</span>
            </a>
            <div class="mx-4 w-auto" />
            <div
              class="
                flex w-full flex-col items-start justify-end pt-4
                md:flex-row md:items-center md:py-0
              "
            >
              <a
                class="
                  mr-0 w-full cursor-pointer px-6 py-2 text-gray-700
                  md:mr-2 md:w-auto md:px-3
                  lg:mr-3
                  dark:text-gray-300
                "
                href="/dashboard"
                :title="`${title} Dashboard`"
              >{{ $t('dashboard.title') }}</a>

              <SwitchLanguage />

              <SwitchTheme />
            </div>
          </div>
        </div>

        <div
          class="
            absolute right-0 flex h-10 w-10 cursor-pointer flex-col items-center
            justify-center rounded-full
            hover:bg-muted
            md:hidden
          "
          :class="{ 'right-2': showMenu }"
          @click="showMenu = !showMenu"
        >
          <Ellipsis
            v-show="!showMenu"
            class="h-6 w-6"
          />
          <X
            v-show="showMenu"
            class="h-6 w-6"
          />
        </div>
      </div>
    </nav>
  </section>
</template>
