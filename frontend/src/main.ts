import '@/main.css'

import { createApp, watch } from 'vue'

import App from '@/App.vue'
import i18n, { locale } from '@/i18n'
import router from '@/router'
import api from '@/utils/api'

const app = createApp(App)

const appMountHandler = watch(
  locale,
  (localeVal) => {
    if (localeVal) {
      appMountHandler.stop()

      app.mount('#app')
    }
  },
  {
    immediate: true,
  }
)

app.use(i18n)
app.use(router)
app.use(api)

// For what? Tbh I don't know :) But maybe it will be useful for someone during testing
if (import.meta.env.MODE == 'development') {
  window.$app = app

  const log = console.log,
    dft = new Intl.DateTimeFormat(
      'sv', // locale for ISO string format
      {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }
    )

  console.log = (...args) => {
    const now = Date.now()

    log.apply(console, [dft.format(now) + '.' + (now + '').slice(-3), ...args])
  }

  BigInt.prototype.toJSON = function () {
    return this.toString()
  }
}

declare global {
  interface Window {
    $app: typeof app
  }

  interface BigInt {
    toJSON: () => string
  }
}
