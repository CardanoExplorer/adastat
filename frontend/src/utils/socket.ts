import { ref, watch } from 'vue'

import { currency } from '@/i18n'
import { autoUpdate } from '@/utils/settings'

import { isUrlAbsolute } from './helper'

type SocketData = {
  epoch_no: number
  slot_no: number
  epoch_slot_no: number
  block_no: number
  block_hash: string
}

let socket: WebSocket, reconnectTimerId: number

const socketData = ref<SocketData>(),
  socketPath = import.meta.env.VITE_SOCKET_PATH,
  socketUrl = isUrlAbsolute(socketPath) ? socketPath : window.location.origin.replace('http', 'ws') + socketPath,
  reconnectInterval = 5000

const socketInit = () => {
  if (!socket || socket.readyState > 1) {
    socket = new WebSocket(socketUrl + '?currency=' + currency.value)

    socket.onopen = () => {
      console.log('socket.onopen')
    }

    socket.onmessage = (e) => {
      console.log('socket.onmessage', e.data)

      try {
        const data: SocketData = JSON.parse(e.data)

        if (socketData.value?.block_hash != data.block_hash) {
          socketData.value = data
        }
      } catch {}

      if (!autoUpdate.value) {
        socketClose()
      }
    }

    socket.onclose = (e) => {
      console.log('socket.onclose')
      if (e.code != 1000) {
        socketReconnect()
      }
    }

    socket.onerror = () => {
      socketReconnect()
    }
  }
}

const socketReconnect = function () {
  console.log('socketReconnect ' + reconnectInterval + 'ms')

  clearTimeout(reconnectTimerId)

  reconnectTimerId = setTimeout(() => {
    console.log('socketReconnect')
    socketInit()
  }, reconnectInterval)
}

const socketClose = function () {
  if (socket) {
    socket.close(1000)
  }
}

watch(autoUpdate, () => {
  if (autoUpdate.value) {
    socketInit()
  } else {
    socketClose()
  }
})

watch(currency, () => {
  socketClose()
  socketInit()
})

export { socketClose, socketData, socketInit }
