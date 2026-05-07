import type { InjectionKey, Ref, ShallowRef } from 'vue'

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

const pointerSymbol: InjectionKey<Readonly<Pointer>> = Symbol('pointer')

const appVisibleSymbol: InjectionKey<Readonly<Ref<boolean>>> = Symbol('appVisible')

const appActiveSymbol: InjectionKey<Readonly<Ref<boolean>>> = Symbol('appActive')

const keyDownSymbol: InjectionKey<Readonly<ShallowRef<KeyDown>>> = Symbol('keyDown')

const touchSymbol: InjectionKey<Readonly<Touch>> = Symbol('touch')

export { pointerSymbol, appVisibleSymbol, appActiveSymbol, keyDownSymbol, touchSymbol }

export type { Pointer, KeyDown, Touch }
