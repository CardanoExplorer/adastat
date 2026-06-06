import { type Ref, onUnmounted, reactive } from 'vue'

type Options = {
  scrollContainer?: Ref<HTMLElement | null>
  scrollEdgeSize?: number
  scrollSpeed?: number
  onReorder?: (from: number, to: number) => void
}

type DragState = {
  active: boolean
  idx: number
  newIdx: number
  ghostEl: HTMLElement | null
}

export const useDragAndDrop = (options: Options = {}) => {
  const { scrollContainer, scrollEdgeSize = 60, scrollSpeed = 8, onReorder } = options

  const dragState = reactive<DragState>({
    active: false,
    idx: -1,
    newIdx: -1,
    ghostEl: null,
  })

  const offset = { x: 0, y: 0 },
    ptr = { x: 0, y: 0 }

  const dropZoneEls = new Map<number, HTMLElement>()

  let scrollRAF: number, ghostRect: DOMRect

  const registerDropZone = (idx: number, el: HTMLElement) => {
    if (el) {
      dropZoneEls.set(idx, el)
    } else {
      dropZoneEls.delete(idx)
    }
  }

  const createGhost = (idx: number, handleEl: HTMLElement) => {
    const dropZoneEl = dropZoneEls.get(idx)!,
      rect = dropZoneEl.getBoundingClientRect(),
      sourceEl = dropZoneEl.cloneNode(true) as HTMLElement,
      handleButton = handleEl.cloneNode(true) as HTMLElement,
      ghost = document.createElement('div')

    sourceEl.style.background = 'none'

    ghost.appendChild(sourceEl)
    ghost.appendChild(handleButton)

    Object.assign(handleButton.style, {
      display: 'block',
      opacity: '50%',
      cursor: 'grabbing',
    })

    ghost.className = 'rounded-md bg-blue-100/50 dark:bg-gray-700/50 fixed z-90 rotate-1'

    Object.assign(ghost.style, {
      top: rect.top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
    })

    document.body.appendChild(ghost)
    dragState.ghostEl = ghost

    return rect
  }

  const moveGhost = (cx: number, cy: number) => {
    const { ghostEl } = dragState

    if (ghostEl) {
      ghostEl.style.left = cx - offset.x + 'px'
      ghostEl.style.top = cy - offset.y + 'px'
    }

    ptr.x = cx
    ptr.y = cy
  }

  const removeGhost = () => {
    dragState.ghostEl?.remove()
    dragState.ghostEl = null
  }

  const autoScroll = () => {
    const el = scrollContainer?.value
    if (el) {
      const r = el.getBoundingClientRect(),
        fl = ptr.x - r.left,
        fr = r.right - ptr.x

      if (fl < scrollEdgeSize) {
        el.scrollLeft -= scrollSpeed * (1 - fl / scrollEdgeSize)
      } else if (fr < scrollEdgeSize) {
        el.scrollLeft += scrollSpeed * (1 - fr / scrollEdgeSize)
      }

      if (dragState.active) {
        scrollRAF = requestAnimationFrame(autoScroll)
      }
    }
  }

  const updateHit = (cx: number, cy: number) => {
    if (ptr.x !== cx) {
      let newIdx = -1

      for (const [idx, el] of dropZoneEls) {
        const r = el.getBoundingClientRect()

        if (cx >= r.left && cx <= r.right && cy + ghostRect.height >= r.top && cy <= r.bottom) {
          if (idx !== dragState.idx) {
            const ex = r.left + r.width / 2

            if (idx > dragState.idx) {
              newIdx = cx > ex ? idx : idx - 1
            } else {
              newIdx = cx < ex ? idx : idx + 1
            }
          }

          break
        }
      }

      dragState.newIdx = newIdx
    }
  }

  const startDrag = (idx: number, handleEl: HTMLElement, cx: number, cy: number) => {
    const container = scrollContainer?.value
    if (container) {
      container.style.pointerEvents = 'none'
    }

    ghostRect = createGhost(idx, handleEl)

    offset.x = cx - ghostRect.left
    offset.y = cy - ghostRect.top

    dragState.active = true
    dragState.idx = idx
    dragState.newIdx = -1

    moveGhost(cx, cy)

    scrollRAF = requestAnimationFrame(autoScroll)
  }

  const moveDrag = (cx: number, cy: number) => {
    if (dragState.active) {
      updateHit(cx, cy)

      moveGhost(cx, cy)
    }
  }

  const endDrag = () => {
    const container = scrollContainer?.value

    if (container) {
      container.style.pointerEvents = ''
    }

    if (dragState.active) {
      cancelAnimationFrame(scrollRAF)

      const { idx, newIdx } = dragState

      if (idx !== -1 && newIdx !== -1 && newIdx !== idx) {
        onReorder?.(idx, newIdx)
      }

      removeGhost()

      dragState.active = false
      dragState.idx = -1
      dragState.newIdx = -1
    }
  }

  const onMouseDown = (idx: number, e: MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault()

      startDrag(idx, e.currentTarget as HTMLElement, e.clientX, e.clientY)

      const mv = (ev: MouseEvent) => moveDrag(ev.clientX, ev.clientY)

      const up = () => {
        endDrag()
        window.removeEventListener('mousemove', mv)
        window.removeEventListener('mouseup', up)
      }

      window.addEventListener('mousemove', mv)
      window.addEventListener('mouseup', up)
    }
  }

  const onTouchStart = (idx: number, e: TouchEvent) => {
    const t = e.touches[0]
    if (t) {
      startDrag(idx, e.currentTarget as HTMLElement, t.clientX, t.clientY)

      const mv = (ev: TouchEvent) => {
        ev.preventDefault()
        const tt = ev.touches[0]!
        moveDrag(tt.clientX, tt.clientY)
      }

      const en = () => {
        endDrag()
        window.removeEventListener('touchmove', mv)
        window.removeEventListener('touchend', en)
        window.removeEventListener('touchcancel', en)
      }

      window.addEventListener('touchmove', mv, { passive: false })
      window.addEventListener('touchend', en)
      window.addEventListener('touchcancel', en)
    }
  }

  onUnmounted(() => {
    cancelAnimationFrame(scrollRAF)
    removeGhost()
    dropZoneEls.clear()
  })

  const getDragHandleProps = (idx: number) => {
    return {
      onMousedown: (e: MouseEvent) => onMouseDown(idx, e),
      onTouchstart: (e: TouchEvent) => onTouchStart(idx, e),
    }
  }

  const getDropZoneClass = (idx: number) => {
    if (dragState.active) {
      if (dragState.idx === idx) {
        return '*:opacity-20'
      } else if (dragState.newIdx === idx) {
        return `after:absolute after:w-0.5 after:rounded after:shadow-blur-xs dark:after:shadow-sky-600 after:shadow-blue-200 after:bg-blue-400 dark:after:bg-sky-400 after:z-5 after:inset-y-2 ${idx < dragState.idx ? 'after:left-0' : 'after:right-0'}`
      }
    }
  }

  const reorder = (arr: unknown[], from: number, to: number) => {
    const [item] = arr.splice(from, 1)

    arr.splice(to, 0, item)
  }

  return { dragState, registerDropZone, getDragHandleProps, getDropZoneClass, reorder }
}
