<template>
  <div>
    <div class="grid grid-cols-2 rounded-lg bg-white/80 p-1 dark:bg-gray-800/30" role="tablist">
      <button
        class="rounded-md px-2 py-2 text-xs transition-colors"
        :class="
          evidenceMode === 'leaves' ? 'bg-white font-medium shadow-sm dark:bg-gray-800' : 'opacity-60 hover:opacity-100'
        "
        type="button"
        role="tab"
        :aria-selected="evidenceMode === 'leaves'"
        @click="setEvidenceMode('leaves')">
        {{ t('poe.leaves.list') }}
      </button>
      <button
        class="rounded-md px-2 py-2 text-xs transition-colors"
        :class="
          evidenceMode === 'proof' ? 'bg-white font-medium shadow-sm dark:bg-gray-800' : 'opacity-60 hover:opacity-100'
        "
        type="button"
        role="tab"
        :aria-selected="evidenceMode === 'proof'"
        @click="setEvidenceMode('proof')">
        {{ t('poe.inclusion_proof') }}
      </button>
    </div>

    <p class="mt-2 text-3xs leading-4 opacity-70">
      {{ t(evidenceMode === 'leaves' ? 'poe.leaves.list.desc' : 'poe.inclusion_proof.desc') }}
    </p>

    <div
      class="relative mt-3 flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center transition-colors focus-within:ring-2 focus-within:ring-sky-500/40"
      :class="
        evidenceDragActive
          ? 'border-sky-500 bg-sky-100/70 dark:border-sky-400 dark:bg-sky-900/30'
          : 'border-sky-300 bg-sky-50/40 hover:border-sky-400 hover:bg-sky-50 dark:border-gray-600 dark:bg-gray-950/15 dark:hover:border-sky-700 dark:hover:bg-sky-950/30'
      "
      @dragenter.prevent="onEvidenceDragEnter"
      @dragover.prevent
      @dragleave.prevent="onEvidenceDragLeave"
      @drop.prevent="onEvidenceDrop">
      <input
        class="absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        type="file"
        :accept="evidenceMode === 'proof' ? 'application/json,.json' : 'application/cbor,.cbor'"
        :disabled="evidenceStatus === 'checking'"
        :aria-label="t('poe.select.merkle')"
        @change="onEvidenceInput" />
      <DownloadIcon class="size-8 opacity-50" />
      <template v-if="evidenceFile && !evidenceDragActive">
        <div class="mt-4 max-w-full truncate text-xs font-medium" :title="evidenceFile.name">
          {{ evidenceFile.name }}
        </div>
        <div class="mt-2 text-3xs opacity-60">{{ formatBytes(evidenceFile.size) }}</div>
        <div class="mt-4 text-3xs opacity-60">{{ t('poe.click_to_replace_file') }}</div>
      </template>
      <div v-else class="mt-4 text-xs font-medium">
        {{
          t(evidenceDragActive ? 'poe.release.merkle' : evidenceMode === 'leaves' ? 'poe.drop.cbor' : 'poe.drop.json')
        }}
      </div>
    </div>

    <div
      v-if="evidenceStatus !== 'idle'"
      class="mt-3 rounded p-2.5 text-xs leading-5"
      role="status"
      :class="
        evidenceStatus === 'valid'
          ? 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
          : evidenceStatus === 'checking'
            ? 'bg-sky-100/80 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
            : 'bg-red-100/80 text-red-900 dark:bg-red-900/40 dark:text-red-100'
      ">
      {{
        t(
          evidenceStatus === 'valid'
            ? evidenceMode === 'leaves'
              ? 'poe.leaves.list.valid'
              : 'poe.inclusion_proof.valid'
            : evidenceStatus === 'checking'
              ? 'poe.checking.merkle'
              : evidenceStatus === 'mismatch'
                ? 'poe.merkle.evidence.mismatch'
                : 'poe.merkle.evidence.invalid',
          { n: evidenceMode === 'leaves' ? leavesCount : proofTargets.length }
        )
      }}
      <div v-if="evidenceStatus === 'valid'" class="mt-1 text-3xs opacity-70">
        {{
          t('poe.leaf.algorithm', {
            algorithm: leafAlgorithms.length ? leafAlgorithms.join(', ') : t('not_specified'),
          })
        }}
      </div>
    </div>

    <template v-if="evidenceStatus === 'valid'">
      <div class="mt-3 grid grid-cols-2 rounded-lg bg-white/80 p-1 dark:bg-gray-800/30" role="tablist">
        <button
          class="rounded-md px-2 py-2 text-xs transition-colors"
          :class="
            candidateMode === 'file'
              ? 'bg-white font-medium shadow-sm dark:bg-gray-800'
              : 'opacity-60 hover:opacity-100'
          "
          type="button"
          role="tab"
          :disabled="!canCheckFile"
          :aria-selected="candidateMode === 'file'"
          @click="setCandidateMode('file')">
          {{ t('poe.check.collection') }}
        </button>
        <button
          class="rounded-md px-2 py-2 text-xs transition-colors"
          :class="
            candidateMode === 'leaf'
              ? 'bg-white font-medium shadow-sm dark:bg-gray-800'
              : 'opacity-60 hover:opacity-100'
          "
          type="button"
          role="tab"
          :aria-selected="candidateMode === 'leaf'"
          @click="setCandidateMode('leaf')">
          {{ t('poe.check.leaf') }}
        </button>
      </div>

      <p class="mt-2 text-3xs leading-4 opacity-70">
        {{ t(candidateMode === 'file' ? 'poe.check.collection.desc' : 'poe.check.leaf.desc') }}
      </p>

      <div
        v-if="candidateMode === 'file'"
        class="relative mt-3 flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center transition-colors focus-within:ring-2 focus-within:ring-sky-500/40"
        :class="
          candidateDragActive
            ? 'border-sky-500 bg-sky-100/70 dark:border-sky-400 dark:bg-sky-900/30'
            : 'border-sky-300 bg-sky-50/40 hover:border-sky-400 hover:bg-sky-50 dark:border-gray-600 dark:bg-gray-950/15 dark:hover:border-sky-700 dark:hover:bg-sky-950/30'
        "
        @dragenter.prevent="onCandidateDragEnter"
        @dragover.prevent
        @dragleave.prevent="onCandidateDragLeave"
        @drop.prevent="onCandidateDrop">
        <input
          class="absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          type="file"
          :disabled="candidateStatus === 'checking'"
          :aria-label="t('poe.select.collection')"
          @change="onCandidateInput" />
        <DownloadIcon class="size-8 opacity-50" />
        <template v-if="candidateFile && !candidateDragActive">
          <div class="mt-4 max-w-full truncate text-xs font-medium" :title="candidateFile.name">
            {{ candidateFile.name }}
          </div>
          <div class="mt-2 text-3xs opacity-60">{{ formatBytes(candidateFile.size) }}</div>
          <div class="mt-4 text-3xs opacity-60">{{ t('poe.click_to_replace_file') }}</div>
        </template>
        <div v-else class="mt-4 text-xs font-medium">
          {{ t(candidateDragActive ? 'poe.release.file' : 'poe.drop.collection') }}
        </div>
      </div>

      <div v-else class="mt-3">
        <label class="block text-3xs font-medium tracking-wide uppercase opacity-60" :for="fingerprintInputId">
          {{ t('poe.leaf.fingerprint') }}
        </label>
        <div class="mt-1 flex gap-2">
          <input
            :id="fingerprintInputId"
            v-model="leafFingerprint"
            class="min-w-0 grow rounded border border-sky-100 bg-white px-2.5 py-2 font-mono text-xs outline-none focus:border-sky-500 dark:border-gray-800 dark:bg-gray-900"
            type="text"
            :placeholder="t('poe.leaf.fingerprint.placeholder')"
            autocapitalize="off"
            autocomplete="off"
            spellcheck="false"
            @keyup.enter="verifyFingerprint" />
          <button
            class="shrink-0 rounded bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
            type="button"
            :disabled="candidateStatus === 'checking' || !leafFingerprint.trim()"
            @click="verifyFingerprint">
            {{ t('verify') }}
          </button>
        </div>
      </div>

      <div
        v-if="candidateStatus !== 'idle'"
        class="mt-3 rounded p-2.5 text-xs leading-5"
        role="status"
        :class="
          candidateStatus === 'matched'
            ? 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
            : candidateStatus === 'checking'
              ? 'bg-sky-100/80 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
              : candidateStatus === 'unsupported'
                ? 'bg-amber-100/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
                : 'bg-red-100/80 text-red-900 dark:bg-red-900/40 dark:text-red-100'
        ">
        {{
          t(
            candidateStatus === 'matched'
              ? 'poe.collection.matched'
              : candidateStatus === 'checking'
                ? 'poe.checking.collection'
                : candidateStatus === 'unsupported'
                  ? 'poe.collection.unsupported'
                  : candidateStatus === 'invalid'
                    ? 'poe.leaf.fingerprint.invalid'
                    : 'poe.collection.not_found',
            { index: matchedIndex + 1 }
          )
        }}
      </div>
    </template>

    <p class="mt-3 border-t border-sky-100 pt-2 text-3xs leading-4 opacity-60 dark:border-gray-800">
      {{ t('poe.merkle.local_privacy') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useId } from 'vue'

import { t } from '@/i18n'
import { formatBytes } from '@/utils/formatter'
import DownloadIcon from '@/assets/icons/download.svg?component'

type EvidenceMode = 'leaves' | 'proof'
type EvidenceStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'mismatch'
type CandidateMode = 'file' | 'leaf'
type CandidateStatus = 'idle' | 'checking' | 'matched' | 'not_found' | 'invalid' | 'unsupported'
type ProofTarget = { leaf: string; leafAlg?: string; index: number; label?: string }
type Commitment = { alg: string; root: string; leaf_count: number }
type IncrementalHash = { update(data: Uint8Array): unknown; digest(): Uint8Array }

const { commitment, transactionHash } = defineProps<{
  commitment: Commitment
  transactionHash: string
}>()

const evidenceMode = ref<EvidenceMode>('leaves')
const fingerprintInputId = useId()
const evidenceStatus = ref<EvidenceStatus>('idle')
const evidenceFile = ref<File>()
const evidenceDragActive = ref(false)
const candidateMode = ref<CandidateMode>('file')
const candidateStatus = ref<CandidateStatus>('idle')
const candidateFile = ref<File>()
const candidateDragActive = ref(false)
const leafFingerprint = ref('')
const matchedIndex = ref(-1)
const decodedLeaves = shallowRef<Uint8Array[]>()
const leavesLeafAlg = ref<string>()
const proofTargets = ref<ProofTarget[]>([])
let evidenceDragDepth = 0
let candidateDragDepth = 0
let evidenceRun = 0
let candidateRun = 0
let sha2Module: Promise<typeof import('@noble/hashes/sha2.js')> | undefined
let blake2Module: Promise<typeof import('@noble/hashes/blake2.js')> | undefined

const leavesCount = computed(() => decodedLeaves.value?.length || 0)
const leafAlgorithms = computed(() => {
  const algorithms =
    evidenceMode.value === 'leaves'
      ? leavesLeafAlg.value
        ? [leavesLeafAlg.value]
        : []
      : proofTargets.value.map((target) => target.leafAlg).filter((value): value is string => Boolean(value))
  return [...new Set(algorithms)]
})
const supportedAlgorithms = computed(() =>
  leafAlgorithms.value.filter((algorithm) => algorithm === 'sha2-256' || algorithm === 'blake2b-256')
)
const canCheckFile = computed(() => supportedAlgorithms.value.length > 0)

const normalizeHex32 = (value: unknown) => {
  if (typeof value !== 'string') {
    return
  }
  const normalized = value.toLowerCase().replace(/^0x/, '')
  return /^[0-9a-f]{64}$/.test(normalized) ? normalized : undefined
}

const hexToBytes = (value: string) =>
  Uint8Array.from({ length: value.length / 2 }, (_, index) =>
    Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  )

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

const resetCandidate = () => {
  candidateRun++
  candidateStatus.value = 'idle'
  candidateFile.value = undefined
  leafFingerprint.value = ''
  matchedIndex.value = -1
}

const setCandidateMode = (mode: CandidateMode) => {
  if (candidateMode.value === mode) {
    return
  }
  candidateMode.value = mode
  resetCandidate()
}

const resetEvidence = () => {
  evidenceRun++
  evidenceStatus.value = 'idle'
  evidenceFile.value = undefined
  decodedLeaves.value = undefined
  leavesLeafAlg.value = undefined
  proofTargets.value = []
  resetCandidate()
}

const setEvidenceMode = (mode: EvidenceMode) => {
  if (evidenceMode.value === mode) {
    return
  }
  evidenceMode.value = mode
  resetEvidence()
}

const markEvidenceMismatch = () => {
  evidenceStatus.value = 'mismatch'
}

const parseLeavesList = async (file: File) => {
  const run = ++evidenceRun
  evidenceStatus.value = 'checking'
  try {
    const { decodeLeavesList } = await import('@cardanowall/crypto-core/merkle')
    const decoded = decodeLeavesList(new Uint8Array(await file.arrayBuffer()))
    if (run !== evidenceRun) {
      return
    }
    if (
      decoded.treeAlg !== commitment.alg ||
      decoded.leafCount !== Number(commitment.leaf_count) ||
      bytesToHex(decoded.root) !== normalizeHex32(commitment.root)
    ) {
      markEvidenceMismatch()
      return
    }
    decodedLeaves.value = decoded.leaves
    leavesLeafAlg.value = decoded.leafAlg
    proofTargets.value = []
    evidenceStatus.value = 'valid'
    candidateMode.value = decoded.leafAlg === 'sha2-256' || decoded.leafAlg === 'blake2b-256' ? 'file' : 'leaf'
  } catch {
    if (run === evidenceRun) {
      evidenceStatus.value = 'invalid'
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseInclusionProof = async (file: File) => {
  const run = ++evidenceRun
  evidenceStatus.value = 'checking'
  try {
    const certificate: unknown = JSON.parse(await file.text())
    if (!isRecord(certificate) || certificate.format !== 'label-309-inclusion-certificate-v1') {
      throw new Error('Invalid certificate')
    }
    const anchor = certificate.anchor
    const merkle = certificate.merkle
    const items = certificate.items
    if (!isRecord(anchor) || !isRecord(merkle) || !Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid certificate')
    }
    const root = normalizeHex32(merkle.root)
    const onChainRoot = normalizeHex32(commitment.root)
    if (
      !root ||
      !onChainRoot ||
      anchor.chain !== 'cardano' ||
      anchor.metadata_label !== 309 ||
      typeof anchor.tx_hash !== 'string' ||
      anchor.tx_hash.toLowerCase() !== transactionHash.toLowerCase() ||
      merkle.tree_alg !== 'rfc9162-sha256' ||
      merkle.tree_alg !== commitment.alg ||
      merkle.tree_size !== Number(commitment.leaf_count) ||
      root !== onChainRoot
    ) {
      if (run === evidenceRun) {
        markEvidenceMismatch()
      }
      return
    }

    const { merkleSha2256VerifyInclusion } = await import('@cardanowall/crypto-core/hash')
    const treeSize = Number(merkle.tree_size)
    const rootBytes = hexToBytes(root)
    const targets: ProofTarget[] = []
    for (const rawItem of items) {
      if (!isRecord(rawItem)) {
        throw new Error('Invalid certificate item')
      }
      const leaf = normalizeHex32(rawItem.leaf)
      if (
        !leaf ||
        !Number.isSafeInteger(rawItem.index) ||
        Number(rawItem.index) < 0 ||
        Number(rawItem.index) >= treeSize ||
        !Array.isArray(rawItem.proof)
      ) {
        throw new Error('Invalid certificate item')
      }
      const proof = rawItem.proof.map((sibling) => {
        const hex = normalizeHex32(sibling)
        if (!hex) {
          throw new Error('Invalid proof sibling')
        }
        return hexToBytes(hex)
      })
      if (!merkleSha2256VerifyInclusion(hexToBytes(leaf), Number(rawItem.index), treeSize, proof, rootBytes)) {
        throw new Error('Proof does not verify')
      }
      targets.push({
        leaf,
        index: Number(rawItem.index),
        ...(typeof rawItem.leaf_alg === 'string' ? { leafAlg: rawItem.leaf_alg } : {}),
        ...(typeof rawItem.label === 'string' ? { label: rawItem.label } : {}),
      })
    }
    if (run !== evidenceRun) {
      return
    }
    decodedLeaves.value = undefined
    leavesLeafAlg.value = undefined
    proofTargets.value = targets
    evidenceStatus.value = 'valid'
    candidateMode.value = targets.some((target) => target.leafAlg === 'sha2-256' || target.leafAlg === 'blake2b-256')
      ? 'file'
      : 'leaf'
  } catch {
    if (run === evidenceRun) {
      evidenceStatus.value = 'invalid'
    }
  }
}

const selectEvidence = (file: File) => {
  resetEvidence()
  evidenceFile.value = file
  void (evidenceMode.value === 'leaves' ? parseLeavesList(file) : parseInclusionProof(file))
}

const onEvidenceInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    selectEvidence(file)
  }
}

const onEvidenceDragEnter = () => {
  if (evidenceStatus.value === 'checking') {
    return
  }
  evidenceDragDepth++
  evidenceDragActive.value = true
}

const onEvidenceDragLeave = () => {
  evidenceDragDepth = Math.max(0, evidenceDragDepth - 1)
  if (evidenceDragDepth === 0) {
    evidenceDragActive.value = false
  }
}

const onEvidenceDrop = (event: DragEvent) => {
  evidenceDragDepth = 0
  evidenceDragActive.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    selectEvidence(file)
  }
}

const createHasher = async (algorithm: string): Promise<IncrementalHash> => {
  if (algorithm === 'sha2-256') {
    const { sha256 } = await (sha2Module ??= import('@noble/hashes/sha2.js'))
    return sha256.create()
  }
  const { blake2b } = await (blake2Module ??= import('@noble/hashes/blake2.js'))
  return blake2b.create({ dkLen: 32 })
}

const hashFile = async (file: File, algorithms: string[]) => {
  const hashers = await Promise.all(
    [...new Set(algorithms)].map(async (algorithm) => ({ algorithm, hasher: await createHasher(algorithm) }))
  )
  const reader = file.stream().getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    for (const { hasher } of hashers) {
      hasher.update(value)
    }
  }
  return new Map(hashers.map(({ algorithm, hasher }) => [algorithm, bytesToHex(hasher.digest())]))
}

const verifyLeaf = async (leaf: string) => {
  if (evidenceMode.value === 'proof') {
    const target = proofTargets.value.find((item) => item.leaf === leaf)
    if (!target) {
      return -1
    }
    return target.index
  }

  const leaves = decodedLeaves.value
  if (!leaves) {
    return -1
  }
  const index = leaves.findIndex((value) => bytesToHex(value) === leaf)
  if (index < 0) {
    return -1
  }
  const { merkleSha2256InclusionProof, merkleSha2256VerifyInclusion } = await import('@cardanowall/crypto-core/hash')
  const proof = merkleSha2256InclusionProof(leaves, index)
  return merkleSha2256VerifyInclusion(
    leaves[index]!,
    index,
    Number(commitment.leaf_count),
    proof,
    hexToBytes(normalizeHex32(commitment.root)!)
  )
    ? index
    : -1
}

const verifyCandidateFile = async (file: File) => {
  const run = ++candidateRun
  candidateFile.value = file
  candidateStatus.value = 'checking'
  matchedIndex.value = -1
  try {
    if (!canCheckFile.value) {
      candidateStatus.value = 'unsupported'
      return
    }
    const hashes = await hashFile(file, supportedAlgorithms.value)
    if (run !== candidateRun) {
      return
    }
    if (evidenceMode.value === 'leaves') {
      const leaf = leavesLeafAlg.value ? hashes.get(leavesLeafAlg.value) : undefined
      const index = leaf ? await verifyLeaf(leaf) : -1
      if (index >= 0) {
        if (run !== candidateRun) {
          return
        }
        matchedIndex.value = index
        candidateStatus.value = 'matched'
        return
      }
    } else {
      for (const target of proofTargets.value) {
        if (!target.leafAlg || hashes.get(target.leafAlg) !== target.leaf) {
          continue
        }
        if (run !== candidateRun) {
          return
        }
        matchedIndex.value = target.index
        candidateStatus.value = 'matched'
        return
      }
    }
    candidateStatus.value = 'not_found'
  } catch {
    if (run === candidateRun) {
      candidateStatus.value = 'not_found'
    }
  }
}

const selectCandidate = (file: File) => {
  if (candidateStatus.value === 'checking') {
    return
  }
  void verifyCandidateFile(file)
}

const onCandidateInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    selectCandidate(file)
  }
}

const onCandidateDragEnter = () => {
  if (candidateStatus.value === 'checking') {
    return
  }
  candidateDragDepth++
  candidateDragActive.value = true
}

const onCandidateDragLeave = () => {
  candidateDragDepth = Math.max(0, candidateDragDepth - 1)
  if (candidateDragDepth === 0) {
    candidateDragActive.value = false
  }
}

const onCandidateDrop = (event: DragEvent) => {
  candidateDragDepth = 0
  candidateDragActive.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    selectCandidate(file)
  }
}

const verifyFingerprint = async () => {
  if (candidateStatus.value === 'checking') {
    return
  }
  const leaf = normalizeHex32(leafFingerprint.value.trim())
  if (!leaf) {
    candidateStatus.value = 'invalid'
    return
  }
  const run = ++candidateRun
  candidateStatus.value = 'checking'
  matchedIndex.value = -1
  try {
    const index = await verifyLeaf(leaf)
    if (run !== candidateRun) {
      return
    }
    matchedIndex.value = index
    candidateStatus.value = index >= 0 ? 'matched' : 'not_found'
  } catch {
    if (run === candidateRun) {
      candidateStatus.value = 'not_found'
    }
  }
}
</script>
