/// <reference types="vite/client" />

declare module '*.svg?component' {
  import { FunctionalComponent, SVGAttributes } from 'vue'
  const component: FunctionalComponent<SVGAttributes>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_PATH: string
  readonly VITE_SOCKET_PATH: string
  readonly VITE_IPFS_GATEWAY: string
  readonly VITE_ARWEAVE_GATEWAY: string
  readonly VITE_LOCAL_GATEWAY: string
  readonly VITE_NETWORKS: { id: string; url: string }[]
  readonly VITE_NETWORK_ID: string
  readonly VITE_NETWORK_START_TIME: number
  readonly VITE_TOTAL_SUPPLY: `${number}`
  readonly VITE_EPOCH_LENGTH: number
  readonly VITE_SLOT_LENGTH: number
  readonly VITE_ACTIVE_SLOTS_COEFF: number
  readonly VITE_SHELLEY_EPOCH: number
  readonly VITE_GOGUEN_EPOCH: number
  readonly VITE_BASHO_EPOCH: number
  readonly VITE_VOLTAIRE_EPOCH: number
}
