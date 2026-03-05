<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    minutes?: number
    label?: string
    goal?: string
  }>(),
  {
    minutes: 15,
    label: 'Countdown',
    goal: '',
  }
)

const totalSeconds = Math.max(0, Math.floor(props.minutes * 60))
const remainingSeconds = ref(totalSeconds)
const isRunning = ref(false)
const hasStarted = ref(false)

let timer: ReturnType<typeof setInterval> | undefined

const timeLabel = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60)
  const seconds = remainingSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function startTimer() {
  hasStarted.value = true
  isRunning.value = true
}

function togglePause() {
  if (!hasStarted.value || remainingSeconds.value <= 0) return
  isRunning.value = !isRunning.value
}

onMounted(() => {
  timer = setInterval(() => {
    if (isRunning.value && remainingSeconds.value > 0) {
      remainingSeconds.value -= 1
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="text-center">
    <div class="text-xl opacity-70 mb-4">{{ label }}</div>

    <div class="mx-auto w-fit rounded-2xl border border-gray-300 bg-white/80 px-10 py-6">
      <div class="text-7xl font-bold tracking-wider">{{ timeLabel }}</div>
    </div>

    <div class="mt-6">
      <button
        class="rounded-lg bg-blue-600 px-5 py-2 text-white font-semibold disabled:opacity-50"
        :disabled="hasStarted || remainingSeconds <= 0"
        @click="startTimer"
      >
        Start
      </button>

      <button
        class="ml-3 rounded-lg bg-gray-600 px-5 py-2 text-white font-semibold disabled:opacity-50"
        :disabled="!hasStarted || remainingSeconds <= 0"
        @click="togglePause"
      >
        {{ isRunning ? 'Pause' : 'Resume' }}
      </button>
    </div>

    <div v-if="goal" class="mt-8 text-lg opacity-70">{{ goal }}</div>
  </div>
</template>
