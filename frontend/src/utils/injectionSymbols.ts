import type { InjectionKey, Ref, ShallowRef } from 'vue'

import type { Vote } from '@/utils/helper'

type Pointer = {
  x: number
  y: number
}

type Touch = {
  isDown: boolean
  target: Element | null
  pointerType: string
}

type KeyDown = { key: string; code: string; alt: boolean; ctrl: boolean; shift: boolean } | Record<string, never>

type VoteDetailsModalData = {
  vote?: Vote
  comment?: string
  rationale?: string
}

type OpenVoteDetailsModal = (data: VoteDetailsModalData, trigger?: HTMLElement) => void

const pointerSymbol: InjectionKey<Readonly<Pointer>> = Symbol('pointer')

const appVisibleSymbol: InjectionKey<Readonly<Ref<boolean>>> = Symbol('appVisible')

const appActiveSymbol: InjectionKey<Readonly<Ref<boolean>>> = Symbol('appActive')

const keyDownSymbol: InjectionKey<Readonly<ShallowRef<KeyDown>>> = Symbol('keyDown')

const touchSymbol: InjectionKey<Readonly<Touch>> = Symbol('touch')

const openVoteDetailsModalSymbol: InjectionKey<OpenVoteDetailsModal> = Symbol('openVoteDetailsModal')

export { pointerSymbol, appVisibleSymbol, appActiveSymbol, keyDownSymbol, touchSymbol, openVoteDetailsModalSymbol }

export type { Pointer, KeyDown, Touch, VoteDetailsModalData }
