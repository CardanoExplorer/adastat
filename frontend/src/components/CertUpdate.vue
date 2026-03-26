<template>
  <div class="flex gap-2">
    <SettingsIcon v-if="!iconHide" class="h-10 w-10 stroke-[0.5] p-0.5 text-yellow-600" />
    <div class="text-sm leading-5">
      {{ t('update') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import SettingsIcon from '@/assets/icons/settings.svg?component'

import { t } from '@/i18n'

defineProps<{
  iconHide?: boolean
}>()
</script>
