<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    tone?: 'info' | 'warning' | 'danger' | 'success'
  }>(),
  {
    title: 'Note',
    tone: 'info',
  }
)

const toneClasses = computed(() => {
  if (props.tone === 'warning') return 'border-amber-500 bg-amber-50'
  if (props.tone === 'danger') return 'border-rose-500 bg-rose-50'
  if (props.tone === 'success') return 'border-emerald-500 bg-emerald-50'
  return 'border-sky-500 bg-sky-50'
})
</script>

<template>
  <div class="rounded-xl border-l-8 px-4 py-3" :class="toneClasses">
    <div class="text-xl font-bold">{{ title }}</div>
    <div class="mt-1">
      <slot />
    </div>
  </div>
</template>
