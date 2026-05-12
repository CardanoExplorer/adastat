type EventMap = Record<string, unknown>

export const createEventBus = <T extends EventMap>() => {
  const handlerMap = new Map<keyof T, Set<(payload: unknown) => void>>()

  return {
    on<K extends keyof T>(event: K, handler: (payload: T[K]) => void) {
      const handlers = handlerMap.get(event) ?? new Set()

      if (!handlers.size) {
        handlerMap.set(event, handlers)
      }

      handlers.add(handler as (payload: unknown) => void)

      return () => {
        handlers.delete(handler as (payload: unknown) => void)

        if (!handlers.size) {
          handlerMap.delete(event)
        }
      }
    },

    emit<K extends keyof T>(event: K, payload: T[K]) {
      handlerMap.get(event)?.forEach((h) => h(payload))
    },
  }
}
