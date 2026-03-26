import { onBeforeUnmount } from 'vue'

export const useDebounce = (fn: (...args: any[]) => void, delay: number) => {
  let timerId: ReturnType<typeof setTimeout>

  const debounce = (...args: any[]) => {
    clearTimeout(timerId)

    timerId = setTimeout(() => {
      fn(...args)
    }, delay)
  }

  const cancel = () => {
    clearTimeout(timerId)
  }

  onBeforeUnmount(cancel)

  return { debounce, cancel }
}
