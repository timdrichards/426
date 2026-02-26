<template>
  <div
    ref="playerContainer"
    class="asciinema-wrapper"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps(['src', 'rows'])
const playerContainer = ref(null)
const player = ref(null)
let visibilityObserver
let hasStartedOnce = false

const loadAsset = (tag, attributes) => {
  return new Promise(resolve => {
    const el = document.createElement(tag)
    Object.assign(el, attributes)
    el.onload = resolve
    document.head.appendChild(el)
  })
}

onMounted(async () => {
  // Manually inject if they aren't there
  if (!document.querySelector('link[href="/asciinema-player.css"]')) {
    await loadAsset('link', {
      rel: 'stylesheet',
      href: '/asciinema-player.css',
    })
  }
  if (!window.AsciinemaPlayer) {
    await loadAsset('script', { src: '/asciinema-player.min.js' })
  }

  // Initialize once loaded
  if (window.AsciinemaPlayer) {
    player.value = window.AsciinemaPlayer.create(props.src, playerContainer.value, {
      rows: props.rows || 20,
      // Don't auto-play on mount; Slidev may pre-render slides off-screen.
      autoPlay: false,
      preload: true,
    })

    // Start from the beginning the first time this slide becomes visible.
    visibilityObserver = new IntersectionObserver(
      entries => {
        const isVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0.5)
        if (!isVisible || hasStartedOnce || !player.value) return

        hasStartedOnce = true
        try {
          player.value.seek(0)
          player.value.play()
        } catch {
          // Fallback if the player API differs across versions.
        }
      },
      { threshold: [0.5] }
    )

    visibilityObserver.observe(playerContainer.value)
  }
})

onBeforeUnmount(() => {
  visibilityObserver?.disconnect()
})
</script>

<style scoped>
.asciinema-wrapper {
  min-height: 300px;
  width: 100%;
  background: black;
}
</style>
