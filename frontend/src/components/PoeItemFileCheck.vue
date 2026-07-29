<template>
  <div :aria-busy="checking">
    <div
      class="relative flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center transition-colors focus-within:ring-2 focus-within:ring-sky-500/40"
      :class="
        dragActive
          ? 'border-sky-500 bg-sky-100/70 dark:border-sky-400 dark:bg-sky-900/30'
          : 'border-sky-300 bg-sky-50/40 hover:border-sky-400 hover:bg-sky-50 dark:border-gray-600 dark:bg-gray-950/15 dark:hover:border-sky-700 dark:hover:bg-sky-950/30'
      "
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop">
      <input
        class="absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        type="file"
        :disabled="checking"
        :aria-label="t('poe.select.file')"
        @change="onFileInput" />
      <DownloadIcon class="size-8 opacity-50" />
      <template v-if="file && !dragActive">
        <div class="mt-4 max-w-full truncate text-xs font-medium" :title="file.name">{{ file.name }}</div>
        <div class="mt-2 text-3xs opacity-60">{{ formatBytes(file.size) }}</div>
        <div class="mt-4 text-3xs opacity-60">{{ t('poe.click_to_replace_file') }}</div>
      </template>
      <div v-else class="mt-4 text-xs font-medium">
        {{ t(dragActive ? 'poe.release.file' : 'poe.drop.file') }}
      </div>
    </div>

    <div v-if="file" class="mt-3 rounded bg-white/60 p-2.5 text-xs dark:bg-gray-950/25">
      <div v-if="checking" class="flex items-center gap-2 text-3xs opacity-70" role="status">
        <span class="inline-block size-3 animate-spin rounded-full border-2 border-sky-500 border-r-transparent"></span>
        {{ t('poe.calculating_fingerprints') }}
      </div>

      <ul v-else-if="results.length" class="space-y-1.5">
        <li v-for="result of results" :key="result.algorithm" class="flex items-start gap-2">
          <span
            class="mt-px flex size-4 shrink-0 items-center justify-center rounded-full text-3xs"
            :class="
              result.match === true
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                : result.match === false
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
            ">
            {{ result.match === true ? '✓' : result.match === false ? '!' : '?' }}
          </span>
          <div class="min-w-0">
            <div class="font-mono text-3xs">{{ result.algorithm }}</div>
            <div
              class="text-3xs"
              :class="
                result.match === true
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : result.match === false
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-amber-700 dark:text-amber-300'
              ">
              {{
                t(
                  result.match === true
                    ? 'poe.fingerprint.matches'
                    : result.match === false
                      ? 'poe.fingerprint.mismatch'
                      : 'poe.algorithm_not_supported'
                )
              }}
            </div>
          </div>
        </li>
      </ul>

      <div
        v-if="status !== 'idle' && status !== 'checking'"
        class="mt-3 rounded p-2.5 text-xs leading-5"
        role="status"
        :class="
          status === 'matched'
            ? 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
            : status === 'mismatched'
              ? 'bg-red-100/80 text-red-900 dark:bg-red-900/40 dark:text-red-100'
              : 'bg-amber-100/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
        ">
        {{
          t(
            status === 'matched'
              ? 'poe.file.matches_item'
              : status === 'mismatched'
                ? 'poe.file.does_not_match_item'
                : status === 'unsupported'
                  ? 'poe.file.not_fully_checked'
                  : 'poe.file.check_failed',
            { n: itemNumber }
          )
        }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { t } from '@/i18n'
import { formatBytes } from '@/utils/formatter'
import DownloadIcon from '@/assets/icons/download.svg?component'

type FileCheckStatus = 'idle' | 'checking' | 'matched' | 'mismatched' | 'unsupported' | 'error'
type HashResult = { algorithm: string; match?: boolean }
type IncrementalHash = { update(data: Uint8Array): unknown; digest(): Uint8Array }

const { hashes, itemNumber } = defineProps<{
  hashes: Record<string, string>
  itemNumber: number
}>()

const file = ref<File>()
const status = ref<FileCheckStatus>('idle')
const results = ref<HashResult[]>([])
const checking = ref(false)
const dragActive = ref(false)
let dragDepth = 0
let sha2Module: Promise<typeof import('@noble/hashes/sha2.js')> | undefined
let blake2Module: Promise<typeof import('@noble/hashes/blake2.js')> | undefined

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

const createHasher = async (algorithm: string): Promise<IncrementalHash | undefined> => {
  if (algorithm === 'sha2-256') {
    const { sha256 } = await (sha2Module ??= import('@noble/hashes/sha2.js'))
    return sha256.create()
  }

  if (algorithm === 'blake2b-256') {
    const { blake2b } = await (blake2Module ??= import('@noble/hashes/blake2.js'))
    return blake2b.create({ dkLen: 32 })
  }
}

const verifyFile = async (selectedFile: File) => {
  if (checking.value) {
    return
  }

  file.value = selectedFile
  results.value = []
  status.value = 'checking'
  checking.value = true

  const entries = Object.entries(hashes)

  try {
    const hashers = await Promise.all(
      entries.map(async ([algorithm]) => ({ algorithm, hasher: await createHasher(algorithm) }))
    )
    const activeHashers = hashers.filter(
      (entry): entry is { algorithm: string; hasher: IncrementalHash } => entry.hasher !== undefined
    )
    const reader = selectedFile.stream().getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      for (const { hasher } of activeHashers) {
        hasher.update(value)
      }
    }

    const actualHashes = new Map(activeHashers.map(({ algorithm, hasher }) => [algorithm, bytesToHex(hasher.digest())]))

    results.value = entries.map(([algorithm, expected]) => ({
      algorithm,
      ...(actualHashes.has(algorithm)
        ? { match: actualHashes.get(algorithm) === expected.toLowerCase().replace(/^0x/, '') }
        : {}),
    }))

    status.value = results.value.some((result) => result.match === false)
      ? 'mismatched'
      : results.value.some((result) => result.match === undefined)
        ? 'unsupported'
        : results.value.length > 0
          ? 'matched'
          : 'error'
  } catch {
    status.value = 'error'
  } finally {
    checking.value = false
  }
}

const onFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const selectedFile = input.files?.[0]
  input.value = ''
  if (selectedFile) {
    void verifyFile(selectedFile)
  }
}

const onDragEnter = () => {
  if (checking.value) {
    return
  }
  dragDepth++
  dragActive.value = true
}

const onDragLeave = () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) {
    dragActive.value = false
  }
}

const onDrop = (event: DragEvent) => {
  dragDepth = 0
  dragActive.value = false
  const selectedFile = event.dataTransfer?.files[0]
  if (selectedFile) {
    void verifyFile(selectedFile)
  }
}
</script>
