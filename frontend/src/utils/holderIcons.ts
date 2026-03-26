import CrabIcon from '@/assets/icons/crab.svg?component'
import DolphinIcon from '@/assets/icons/dolphin.svg?component'
import FishIcon from '@/assets/icons/fish.svg?component'
import OctopusIcon from '@/assets/icons/octopus.svg?component'
import SharkIcon from '@/assets/icons/shark.svg?component'
import ShrimpIcon from '@/assets/icons/shrimp.svg?component'
import SquidIcon from '@/assets/icons/squid.svg?component'
import StingrayIcon from '@/assets/icons/stingray.svg?component'
import WhaleIcon from '@/assets/icons/whale.svg?component'

const holderIcons = [ShrimpIcon, CrabIcon, FishIcon, SquidIcon, OctopusIcon, StingrayIcon, DolphinIcon, SharkIcon, WhaleIcon]

const getHolderIcon = (balance: number | `${number}`) => {
  balance = Math.trunc((balance as number) / 1_000_000)

  return holderIcons[balance <= 0 ? 0 : balance > 99_999_999 ? 8 : ('' + balance).length]
}

export { getHolderIcon, holderIcons }
