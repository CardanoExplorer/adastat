import type { InjectionKey, Ref, ShallowRef } from 'vue'

type Pointer = {
  x: number
  y: number
}

type KeyDown = { key: string; code: string; alt: boolean; ctrl: boolean; shift: boolean } | Record<string, never>

const pointerSymbol: InjectionKey<Readonly<Pointer>> = Symbol('pointer')

const appVisibleSymbol: InjectionKey<Readonly<Ref<boolean>>> = Symbol('appVisible')

const appActiveSymbol: InjectionKey<Readonly<Ref<boolean>>> = Symbol('appActive')

const keyDownSymbol: InjectionKey<Readonly<ShallowRef<KeyDown>>> = Symbol('keyDown')

export { pointerSymbol, appVisibleSymbol, appActiveSymbol, keyDownSymbol }

export type { Pointer, KeyDown }
