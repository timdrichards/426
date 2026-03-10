<script setup lang="ts">
const props = defineProps({
  class: {
    type: String,
    default: '',
  },
  layoutClass: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="slidev-layout two-cols-header w-full h-full" :class="props.layoutClass">
    <div class="col-header" :class="props.class">
      <slot />
    </div>
    <div class="col-left" :class="props.class">
      <slot name="left" />
    </div>
    <div class="col-right" :class="props.class">
      <slot name="right" />
    </div>
    <div class="col-bottom" :class="props.class">
      <slot name="bottom" />
    </div>
  </div>
</template>

<style scoped>
.two-cols-header {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: auto 1fr auto;
  align-items: start;
}

.col-header {
  grid-area: 1 / 1 / 2 / 3;
}

.col-left {
  grid-area: 2 / 1 / 3 / 2;
}

.col-right {
  grid-area: 2 / 2 / 3 / 3;
}

.col-bottom {
  grid-area: 3 / 1 / 4 / 3;
  align-self: end;
}

:deep(.no-wrap-header .col-header h1),
:deep(.no-wrap-header .col-header h2),
:deep(.no-wrap-header .col-header h3) {
  white-space: nowrap;
}

:deep(.compact-header .col-header h1),
:deep(.compact-header .col-header h2),
:deep(.compact-header .col-header h3) {
  margin-top: 0;
  margin-bottom: 0.35rem;
  line-height: 1.1;
}
</style>
