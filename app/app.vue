<script setup lang="ts">
const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Smart Food KSB'
const description = 'Dashboard Dinas Ketahanan Pangan Kabupaten Sumbawa Barat'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ksbmaju.sumbawabaratkab.go.id/_next/image?url=%2Fassets%2Fimages%2Flogo-ksb.png&w=384&q=75',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <NuxtPwaManifest />

  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
