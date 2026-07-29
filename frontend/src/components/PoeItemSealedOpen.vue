<template>
  <div>
    <div
      class="relative flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center transition-colors focus-within:ring-2 focus-within:ring-violet-500/40"
      :class="
        dragActive
          ? 'border-violet-500 bg-violet-100/70 dark:border-violet-400 dark:bg-violet-900/30'
          : 'border-violet-300 bg-violet-50/40 hover:border-violet-400 hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950/15 dark:hover:border-violet-700 dark:hover:bg-violet-950/30'
      "
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop">
      <input
        class="absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        type="file"
        :disabled="opening"
        :aria-label="t('poe.select.encrypted')"
        @change="onFileInput" />
      <DownloadIcon class="size-8 opacity-50" />
      <template v-if="ciphertextFile && !dragActive">
        <div class="mt-4 max-w-full truncate text-xs font-medium" :title="ciphertextFile.name">
          {{ ciphertextFile.name }}
        </div>
        <div class="mt-2 text-3xs opacity-60">{{ formatBytes(ciphertextFile.size) }}</div>
        <div class="mt-4 text-3xs opacity-60">{{ t('poe.click_to_replace_file') }}</div>
      </template>
      <div v-else class="mt-4 text-xs font-medium">
        {{ t(`poe.${dragActive ? 'release' : 'drop'}.encrypted` as any) }}
      </div>
    </div>

    <label class="mt-3 block">
      <span class="text-3xs font-medium tracking-wide uppercase opacity-60">
        {{ t(usesPassphrase ? 'poe.passphrase' : 'poe.identity_seed') }}
      </span>
      <div class="mt-1 flex rounded border border-slate-300 bg-white dark:border-gray-700 dark:bg-gray-900">
        <input
          v-model="credential"
          class="min-w-0 grow bg-transparent px-2.5 py-2 text-xs outline-none"
          :type="showCredential ? 'text' : 'password'"
          :placeholder="t(`poe.${usesPassphrase ? 'passphrase' : 'identity_seed'}.placeholder` as any)"
          :disabled="opening"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @keyup.enter="openContent" />
        <button
          class="shrink-0 px-2.5 text-3xs opacity-60 hover:opacity-100"
          type="button"
          :disabled="opening"
          @click="showCredential = !showCredential">
          {{ t(showCredential ? 'hide' : 'show') }}
        </button>
      </div>
    </label>
    <p class="mt-1 text-3xs leading-4 opacity-60">
      {{ t(usesPassphrase ? 'poe.passphrase.desc' : 'poe.identity_seed.desc') }}
    </p>

    <button
      class="mt-3 w-full rounded bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-700 dark:hover:bg-violet-600"
      type="button"
      :disabled="!ciphertextFile || !credential.trim() || opening"
      @click="openContent">
      {{ t(opening ? 'poe.opening' : 'poe.open.and_verify') }}
    </button>

    <div
      v-if="status !== 'idle'"
      class="mt-3 rounded p-2.5 text-xs leading-5"
      role="status"
      :class="
        status === 'opened'
          ? 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
          : status === 'opening'
            ? 'bg-violet-100/80 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
            : 'bg-red-100/80 text-red-900 dark:bg-red-900/40 dark:text-red-100'
      ">
      {{
        t(
          status === 'opened'
            ? 'poe.sealed.opened'
            : status === 'opening'
              ? 'poe.opening.desc'
              : status === 'hash_mismatch'
                ? 'poe.hash_mismatch'
                : 'poe.sealed.failed'
        )
      }}
    </div>

    <a
      v-if="downloadUrl"
      class="mt-2 block rounded border border-emerald-400 px-3 py-2 text-center text-xs font-medium text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
      :href="downloadUrl"
      :download="downloadName">
      {{ t('poe.save_opened_file') }}
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { t } from '@/i18n'
import { formatBytes } from '@/utils/formatter'
import DownloadIcon from '@/assets/icons/download.svg?component'

type OpenStatus = 'idle' | 'opening' | 'opened' | 'failed' | 'hash_mismatch'
type HexEnvelope = {
  scheme?: number
  aead?: string
  kem?: string
  nonce?: string
  slots_mac?: string
  slots?: Array<{ epk?: string; kem_ct?: string; wrap?: string }>
  passphrase?: {
    alg?: string
    salt?: string
    params?: { m?: number; t?: number; p?: number }
  }
}

const { enc, hashes } = defineProps<{
  enc: HexEnvelope
  hashes: Record<string, string>
}>()

const ciphertextFile = ref<File>()
const credential = ref('')
const showCredential = ref(false)
const dragActive = ref(false)
const status = ref<OpenStatus>('idle')
const downloadUrl = ref('')
const downloadName = ref('')
let dragDepth = 0

const opening = computed(() => status.value === 'opening')
const usesPassphrase = computed(() => Boolean(enc.passphrase))

const hexToBytes = (hex: string) => {
  const normalized = hex.toLowerCase().replace(/^0x/, '').replace(/\s+/g, '')
  if (normalized.length % 2 !== 0 || !/^[0-9a-f]*$/.test(normalized)) {
    throw new Error('Invalid hex')
  }
  return Uint8Array.from({ length: normalized.length / 2 }, (_, i) =>
    Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16)
  )
}

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

const byteHashes = () =>
  Object.fromEntries(Object.entries(hashes).map(([algorithm, hash]) => [algorithm, hexToBytes(hash)]))

const clearDownload = () => {
  if (downloadUrl.value) {
    URL.revokeObjectURL(downloadUrl.value)
  }
  downloadUrl.value = ''
  downloadName.value = ''
}

const verifyPlaintext = async (plaintext: Uint8Array) => {
  for (const [algorithm, expected] of Object.entries(hashes)) {
    let actual: Uint8Array
    if (algorithm === 'sha2-256') {
      const { sha256 } = await import('@noble/hashes/sha2.js')
      actual = sha256(plaintext)
    } else if (algorithm === 'blake2b-256') {
      const { blake2b } = await import('@noble/hashes/blake2.js')
      actual = blake2b(plaintext, { dkLen: 32 })
    } else {
      return false
    }
    if (bytesToHex(actual) !== expected.toLowerCase().replace(/^0x/, '')) {
      return false
    }
  }
  return Object.keys(hashes).length > 0
}

const recipientEnvelope = async () => {
  const { sealedEnvelopeFromParsed } = await import('@cardanowall/crypto-core/sealed-poe')
  const envelope = sealedEnvelopeFromParsed({
    scheme: enc.scheme,
    aead: enc.aead,
    kem: enc.kem,
    nonce: enc.nonce ? hexToBytes(enc.nonce) : undefined,
    slots_mac: enc.slots_mac ? hexToBytes(enc.slots_mac) : undefined,
    slots: enc.slots?.map((slot) => ({
      ...(slot.epk ? { epk: hexToBytes(slot.epk) } : {}),
      ...(slot.kem_ct ? { kem_ct: hexToBytes(slot.kem_ct) } : {}),
      ...(slot.wrap ? { wrap: hexToBytes(slot.wrap) } : {}),
    })),
  })
  if (!envelope) {
    throw new Error('Unsupported envelope')
  }
  return envelope
}

const decryptWithPassphrase = async (ciphertext: Uint8Array) => {
  const { passphraseSealedPoeOpen } = await import('@cardanowall/crypto-core/sealed-poe')
  if (
    enc.scheme !== 1 ||
    enc.aead !== 'chacha20-poly1305-stream64k' ||
    enc.passphrase?.alg !== 'argon2id' ||
    !enc.passphrase.salt ||
    !enc.nonce
  ) {
    throw new Error('Invalid envelope')
  }
  const result = await passphraseSealedPoeOpen({
    envelope: {
      scheme: 1,
      aead: 'chacha20-poly1305-stream64k',
      nonce: hexToBytes(enc.nonce),
      passphrase: {
        alg: 'argon2id',
        salt: hexToBytes(enc.passphrase.salt),
        params: {
          m: Number(enc.passphrase.params?.m),
          t: Number(enc.passphrase.params?.t),
          p: Number(enc.passphrase.params?.p),
        },
      },
    },
    blob: ciphertext,
    passphrase: credential.value,
    hashes: byteHashes(),
  })
  return result.matched ? result.plaintext : undefined
}

const decryptForRecipient = async (ciphertext: Uint8Array) => {
  const [{ eciesSealedPoeUnwrap }, seedTools, envelope] = await Promise.all([
    import('@cardanowall/crypto-core/sealed-poe'),
    import('@cardanowall/crypto-core/seed-derive'),
    recipientEnvelope(),
  ])
  const seed = seedTools.parseIdentitySeed(credential.value)
  try {
    const secretKey =
      envelope.kem === 'x25519'
        ? seedTools.deriveX25519KeypairFromSeed(seed).secretKey
        : seedTools.deriveMlKem768X25519KeypairFromSeed(seed).secretSeed
    try {
      const result = eciesSealedPoeUnwrap({
        envelope,
        ciphertext,
        hashes: byteHashes(),
        recipientSecretKey: secretKey,
      })
      return result.matched ? result.plaintext : undefined
    } finally {
      secretKey.fill(0)
    }
  } finally {
    seed.fill(0)
  }
}

const openContent = async () => {
  if (!ciphertextFile.value || !credential.value.trim() || opening.value) {
    return
  }

  clearDownload()
  status.value = 'opening'
  try {
    const ciphertext = new Uint8Array(await ciphertextFile.value.arrayBuffer())
    const plaintext = usesPassphrase.value
      ? await decryptWithPassphrase(ciphertext)
      : await decryptForRecipient(ciphertext)
    if (!plaintext) {
      status.value = 'failed'
      return
    }
    if (!(await verifyPlaintext(plaintext))) {
      plaintext.fill(0)
      status.value = 'hash_mismatch'
      return
    }

    const openedBlob = new Blob([plaintext as Uint8Array<ArrayBuffer>], {
      type: 'application/octet-stream',
    })
    plaintext.fill(0)
    downloadUrl.value = URL.createObjectURL(openedBlob)
    downloadName.value = `${ciphertextFile.value.name.replace(/\.(sealed|enc|encrypted)$/i, '')}.opened`
    credential.value = ''
    status.value = 'opened'
  } catch {
    status.value = 'failed'
  }
}

const selectFile = (file: File) => {
  if (opening.value) {
    return
  }
  clearDownload()
  ciphertextFile.value = file
  status.value = 'idle'
}

const onFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    selectFile(file)
  }
}

const onDragEnter = () => {
  if (opening.value) {
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
  const file = event.dataTransfer?.files[0]
  if (file) {
    selectFile(file)
  }
}

watch(credential, () => {
  if (status.value === 'failed' || status.value === 'hash_mismatch') {
    status.value = 'idle'
  }
})

onBeforeUnmount(clearDownload)
</script>
