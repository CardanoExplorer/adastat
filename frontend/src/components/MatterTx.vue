<template>
  <div ref="wrapper" class="relative overflow-hidden">
    <div
      v-if="data.fee > 0"
      ref="fee"
      class="pointer-events-none absolute z-1 flex flex-col justify-end rounded-full border-2 border-orange-500 p-1 pb-0.5 text-center whitespace-nowrap text-orange-500 dark:border-orange-400 dark:text-orange-400">
      {{ formatToken(formatValue(data.fee, 6, true)) }}
      <div class="text-3xs">Fee</div>
    </div>
    <div
      v-if="data.certificate > 0"
      ref="certificate"
      class="pointer-events-none absolute z-1 flex w-max flex-col justify-center rounded border-2 border-lime-500 px-1.5 text-center dark:border-lime-400">
      {{ formatNumber(data.certificate) }}
      <div class="text-3xs text-lime-500 dark:text-lime-400">Certs</div>
    </div>
    <div v-if="data.metadata.rows.length" ref="metadata" class="pointer-events-none absolute z-1 flex text-slate-500 dark:text-gray-400">
      <svg viewBox="0 0 20 47" class="w-5">
        <path d="M20 1C10 1 10 1 8 11L3 36C1 46 1 46 11 46h9" stroke-dasharray="2" fill="none" class="stroke-current stroke-2 non-scaling-stroke"></path>
      </svg>
      <div class="relative -mx-2.5 w-max pt-1.5 text-center whitespace-nowrap">
        <div class="absolute top-0 h-full w-full px-2.5">
          <svg viewBox="0 0 9 47" class="h-full w-full" preserveAspectRatio="none">
            <path d="M0 1H9M0 46H9" stroke-dasharray="2" fill="none" class="stroke-current stroke-2 non-scaling-stroke"></path>
          </svg>
        </div>
        {{ formatBytes(metadataSize) }}
        <div class="text-3xs">Metadata</div>
      </div>
      <svg viewBox="0 0 20 47" class="w-5">
        <path d="M0 1C10 1 10 1 12 11l5 25c2 10 2 10-8 10H0" stroke-dasharray="2" fill="none" class="stroke-current stroke-2 non-scaling-stroke"></path>
      </svg>
    </div>
    <div v-if="datumData.size" ref="datum" class="pointer-events-none absolute z-1 flex text-violet-500 dark:text-violet-400">
      <svg viewBox="0 0 20 47" class="w-5">
        <path d="M20 1H11C1 1 1 1 3 11L8 36c2 10 2 10 12 10" stroke-dasharray="2" fill="none" class="stroke-current stroke-2 non-scaling-stroke"></path>
      </svg>
      <div class="relative -mx-2.5 w-max pt-1.5 text-center whitespace-nowrap">
        <div class="absolute top-0 h-full w-full px-2.5">
          <svg viewBox="0 0 9 47" class="h-full w-full" preserveAspectRatio="none">
            <path d="M0 1H9M0 46H9" stroke-dasharray="2" fill="none" class="stroke-current stroke-2 non-scaling-stroke"></path>
          </svg>
        </div>
        <div class="text-3xs">Datum</div>
        {{ formatNumber(datumData.size) }}
      </div>
      <svg viewBox="0 0 20 47" class="w-5">
        <path d="M0 46c10 0 10 0 12-10l5-25C19 1 19 1 9 1H0" stroke-dasharray="2" fill="none" class="stroke-current stroke-2 non-scaling-stroke"></path>
      </svg>
    </div>
    <div v-if="data.withdrawals.rows.length" ref="reward" class="pointer-events-none absolute z-1 flex items-center text-down-500 dark:text-down-400">
      <svg viewBox="0 0 232 232" class="absolute top-0 left-0 h-full w-full">
        <path
          d="M16 94c-16 22-16 22 0 44l48 66c16 22 16 22 47 12l68-22c31-10 31-10 31-38V76c0-28 0-28-31-38L111 16C80 6 80 6 64 28Z"
          fill="none"
          class="stroke-current stroke-2 non-scaling-stroke"></path>
      </svg>
      <div class="w-max -rotate-90 transform p-3 text-center whitespace-nowrap">
        {{ formatToken(formatValue(rewardAmount, 6, true)) }}
        <div class="text-3xs">Rewards</div>
      </div>
    </div>
    <div v-if="mintData.pos || mintData.neg" ref="mint" class="pointer-events-none absolute z-1 p-2">
      <svg viewBox="0 0 224 224" class="absolute top-0 left-0 h-full w-full">
        <defs>
          <linearGradient id="mintBurnTokensGradient" x1="50%" y1="100%" x2="100%" y2="50%">
            <stop offset="0" stop-color="currentColor" :class="mintData.pos ? 'text-up-500 dark:text-up-400' : 'text-down-500 dark:text-down-400'" />
            <stop offset="1" stop-color="currentColor" :class="mintData.neg ? 'text-down-500 dark:text-down-400' : 'text-up-500 dark:text-up-400'" />
          </linearGradient>
        </defs>
        <path
          d="M34 45C15 56 15 56 15 78v68c0 22 0 22 19 33l59 34c19 11 19 11 38 0l59-34c19-11 19-11 19-33V78c0-22 0-22-19-33L131 11C112 0 112 0 93 11Z"
          stroke="url(#mintBurnTokensGradient)"
          fill="none"
          class="stroke-2 non-scaling-stroke"></path>
      </svg>
      <div class="-rotate-90 transform flex-col justify-center text-center">
        <div v-if="mintData.pos" class="text-3xs text-up-500 dark:text-up-400">Mint</div>
        <div class="flex justify-center gap-1">
          <div v-if="mintData.pos" class="whitespace-nowrap text-up-500 dark:text-up-400">+{{ mintData.pos }}</div>
          <div v-if="mintData.neg" class="whitespace-nowrap text-down-500 dark:text-down-400">-{{ mintData.neg }}</div>
        </div>
        <div v-if="mintData.neg" class="text-3xs text-down-500 dark:text-down-400">Burn</div>
      </div>
    </div>
    <div v-if="depositData.pos || depositData.neg" ref="deposit" class="pointer-events-none absolute z-1 flex flex-col justify-center p-2 px-2.5 text-center">
      <svg viewBox="0 0 100 100" class="absolute top-0 left-0 h-full w-full">
        <defs>
          <linearGradient id="depositGradient" x1="30%" y1="30%" x2="70%" y2="70%">
            <stop offset="0" stop-color="currentColor" :class="depositData.pos ? 'text-down-500 dark:text-down-400' : 'text-up-500 dark:text-up-400'" />
            <stop offset="1" stop-color="currentColor" :class="depositData.neg ? 'text-up-500 dark:text-up-400' : 'text-down-500 dark:text-down-400'" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="49" stroke="url(#depositGradient)" fill="none" class="stroke-2 non-scaling-stroke" />
      </svg>
      <div v-if="depositData.pos" class="text-3xs text-down-500 dark:text-down-400">Deposit</div>
      <div class="flex justify-center gap-1">
        <div v-if="depositData.pos" class="whitespace-nowrap text-down-500 dark:text-down-400">-{{ formatToken(formatValue(depositData.pos, 6, true)) }}</div>
        <div v-if="depositData.neg" class="whitespace-nowrap text-up-500 dark:text-up-400">+{{ formatToken(formatValue(depositData.neg, 6, true)) }}</div>
      </div>
      <div v-if="depositData.neg" class="text-3xs text-up-500 dark:text-up-400">Refund</div>
    </div>
    <template v-if="addressValues.length > 5">
      <div
        v-if="stackedAddressValues.amount > 0"
        :ref="(el) => (amountRef[0] = el as HTMLElement)"
        class="pointer-events-none absolute z-1 flex w-max flex-col justify-center rounded-full border-2 border-dashed border-blue-500 px-2 text-center whitespace-nowrap dark:border-sky-400">
        <div class="ml-auto text-3xs whitespace-nowrap text-blue-500 dark:text-sky-400">🐚 {{ formatNumber(stackedAddressValues.amountReceiver) }}</div>
        {{ formatToken(formatValue(Number(stackedAddressValues.amount), 6, true)) }}
      </div>
      <div
        v-if="stackedAddressValues.token > 0"
        :ref="(el) => (tokenRef[0] = el as HTMLElement)"
        class="pointer-events-none absolute z-1 flex w-max flex-col justify-center border-amber-500 px-4 text-center leading-4 whitespace-nowrap dark:border-yellow-400">
        <svg viewBox="0 0 224 224" fill="none" class="absolute top-0 left-0 h-full w-full text-amber-500 dark:text-yellow-400">
          <path
            d="M34 45C15 56 15 56 15 78v68c0 22 0 22 19 33l59 34c19 11 19 11 38 0l59-34c19-11 19-11 19-33V78c0-22 0-22-19-33L131 11C112 0 112 0 93 11Z"
            stroke-dasharray="4 2"
            class="stroke-current stroke-2 non-scaling-stroke"></path>
        </svg>
        <div class="ml-auto text-3xs whitespace-nowrap text-amber-500 dark:text-yellow-400">🐚 {{ formatNumber(stackedAddressValues.tokenReceiver) }}</div>
        {{ formatNumber(stackedAddressValues.token) }}
        <div class="text-3xs text-amber-500 dark:text-yellow-400">Tokens</div>
      </div>
    </template>
    <template v-else>
      <template :key="i" v-for="(val, i) of addressValues">
        <div
          v-if="val.amount > 0"
          :ref="(el) => (amountRef[i] = el as HTMLElement)"
          class="pointer-events-none absolute z-1 flex w-max items-center rounded-full border-2 border-blue-500 px-1.5 text-center whitespace-nowrap dark:border-sky-400">
          {{ formatToken(formatValue(Number(val.amount), 6, true)) }}
        </div>
        <div
          v-if="val.token > 0"
          :ref="(el) => (tokenRef[i] = el as HTMLElement)"
          class="pointer-events-none absolute z-1 flex w-max flex-col justify-center border-amber-500 px-2.5 text-center whitespace-nowrap dark:border-yellow-400">
          <svg viewBox="0 0 224 224" fill="none" class="absolute top-0 left-0 h-full w-full text-amber-500 dark:text-yellow-400">
            <path
              d="M34 45C15 56 15 56 15 78v68c0 22 0 22 19 33l59 34c19 11 19 11 38 0l59-34c19-11 19-11 19-33V78c0-22 0-22-19-33L131 11C112 0 112 0 93 11Z"
              class="stroke-current stroke-2 non-scaling-stroke"></path>
          </svg>
          {{ formatNumber(val.token) }}
          <div class="text-3xs text-amber-500 dark:text-yellow-400">Token</div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Bodies, Body, Constraint, Engine, Events, Mouse, MouseConstraint, Render, Runner, World } from 'matter-js'
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

import { formatBytes, formatNumber, formatToken, formatValue } from '@/utils/formatter'
import type { AnyObject, BigIntObject, HTMLElementObject } from '@/utils/helper'

// import { getColorHSL, getRatio } from '@/components/PercentFilled.vue'
type PosNegData = {
  pos: number
  neg: number
  body: Body | null
  posColor: string
  negColor: string
}

const { data } = defineProps<{
  data: AnyObject
}>()

const wrapperRef = useTemplateRef('wrapper'),
  feeRef = useTemplateRef('fee'),
  mintRef = useTemplateRef('mint'),
  depositRef = useTemplateRef('deposit'),
  rewardRef = useTemplateRef('reward'),
  certificateRef = useTemplateRef('certificate'),
  metadataRef = useTemplateRef('metadata'),
  datumRef = useTemplateRef('datum'),
  amountRef = ref<HTMLElementObject>({}),
  tokenRef = ref<HTMLElementObject>({}),
  addresses: Record<
    string,
    {
      amount: bigint
      tokens: BigIntObject
    }
  > = {},
  addressValues: {
    amount: bigint
    token: number
  }[] = [],
  stackedAddressValues = {
    amount: 0n,
    amountReceiver: 0,
    token: 0,
    tokenReceiver: 0,
  },
  tokens: BigIntObject = {},
  mintData: PosNegData = {
    pos: 0,
    neg: 0,
    body: null,
    posColor: '',
    negColor: '',
  },
  depositData: PosNegData = {
    pos: 0,
    neg: 0,
    body: null,
    posColor: '',
    negColor: '',
  },
  datumData: Set<string> = new Set()

const makeSquare = (el: HTMLElement): number => {
  if (el.offsetWidth > el.offsetHeight) {
    el.style.height = el.offsetWidth + 'px'
  } else if (el.offsetHeight > el.offsetWidth) {
    el.style.width = el.offsetHeight + 'px'
  }

  return el.offsetWidth
}

for (const row of data.inputs.rows.concat(data.withdrawals.rows)) {
  const address = row.stake_bech32 || row.address

  if (addresses[address]) {
    addresses[address].amount -= BigInt(row.amount)
  } else {
    addresses[address] = {
      amount: -BigInt(row.amount),
      tokens: {},
    }
  }

  if (row.tokens?.rows) {
    for (const token of row.tokens.rows) {
      const fingerprint = token.fingerprint,
        qty = BigInt(token.quantity)

      addresses[address].tokens[fingerprint] = (addresses[address].tokens[fingerprint] || 0n) - qty

      tokens[fingerprint] = (tokens[fingerprint] || 0n) - qty
    }
  }
}

for (const row of data.outputs.rows) {
  const address = row.stake_bech32 || row.address

  if (addresses[address]) {
    addresses[address].amount += BigInt(row.amount)
  } else {
    addresses[address] = {
      amount: BigInt(row.amount),
      tokens: {},
    }
  }

  for (const token of row.tokens.rows) {
    const fingerprint = token.fingerprint,
      qty = BigInt(token.quantity)

    addresses[address].tokens[fingerprint] = (addresses[address].tokens[fingerprint] || 0n) + qty

    tokens[fingerprint] = (tokens[fingerprint] || 0n) + qty
  }

  if (row.data_hash) {
    datumData.add(row.data_hash)
  }
}

const addressesTokens: Set<string> = new Set()
for (const addressData of Object.values(addresses)) {
  let token = 0

  for (const fingerprint of Object.keys(addressData.tokens)) {
    if (addressData.tokens[fingerprint]! > 0) {
      token++
      addressesTokens.add(fingerprint)
    }
  }

  if (addressData.amount > 0 || token > 0) {
    if (addressData.amount > 0) {
      stackedAddressValues.amount += addressData.amount
      stackedAddressValues.amountReceiver++
    }

    if (token > 0) {
      stackedAddressValues.tokenReceiver++
    }

    addressValues.push({
      amount: addressData.amount,
      token: token,
    })
  }
}
stackedAddressValues.token = addressesTokens.size

for (const tokenQty of Object.values(tokens)) {
  if (tokenQty > 0) {
    mintData.pos++
  } else if (tokenQty < 0) {
    mintData.neg++
  }
}

let rewardAmount = 0
for (const row of data.withdrawals.rows) {
  rewardAmount -= +row.amount
}

for (const row of data.stake_registrations.rows.concat(
  data.stake_deregistrations.rows,
  data.pool_updates.rows,
  data.gov_actions.rows,
  data.drep_registrations.rows
)) {
  if (row.deposit_amount > 0) {
    depositData.pos += +row.deposit_amount
  } else if (row.deposit_amount < 0) {
    depositData.neg -= +row.deposit_amount
  }
}

let metadataSize = 0
for (const row of data.metadata.rows) {
  metadataSize += row.size
}

let engine: Engine, world: World, render: Render, runner: Runner

const initWorld = () => {
  const wrapper = wrapperRef.value!,
    wrapperWidth = wrapper.offsetWidth - 2,
    wrapperHeight = wrapper.offsetHeight - 2,
    wrapperCenterX = wrapperWidth / 2,
    wrapperCenterY = wrapperHeight / 2,
    // shapeMaxArea = wrapperWidth * wrapperHeight * 0.1,
    bodiesRef: {
      body: Body
      ref: HTMLElement
    }[] = []

  engine = Engine.create({
    enableSleeping: true,
  })
  world = engine.world
  render = Render.create({
    element: wrapper,
    engine: engine,
    options: {
      width: wrapperWidth,
      height: wrapperHeight,
      background: '#0000',
      wireframes: false,
      showSleeping: false,
    },
  })

  engine.gravity.x = 0
  engine.gravity.y = 0

  for (let i = 0; i < 4; i++) {
    const [x, y, w, h] =
      i < 2
        ? [i < 1 ? wrapperWidth + 20 : -20, wrapperCenterY, 40, wrapperHeight + 80]
        : [wrapperCenterX, i < 3 ? wrapperHeight + 20 : -20, wrapperWidth + 80, 40]

    World.add(world, Bodies.rectangle(x, y, w, h, { isStatic: true, restitution: 1, friction: 0.001, render: { fillStyle: '#0000' } }))
  }

  if (feeRef.value) {
    const ref = feeRef.value,
      radius = makeSquare(ref) / 2,
      body = Bodies.circle(wrapperCenterX, wrapperCenterY, radius, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      })

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
    })

    World.add(world, body)

    bodiesRef.push({
      body: body,
      ref: ref,
    })
  }

  if (mintRef.value) {
    const ref = mintRef.value,
      radius = makeSquare(ref) / 2,
      body = Bodies.polygon(wrapperCenterX, wrapperCenterY, 6, radius, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      })

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
    })

    World.add(world, body)

    bodiesRef.push({
      body: body,
      ref: ref,
    })
  }

  if (depositRef.value) {
    const ref = depositRef.value,
      radius = makeSquare(ref) / 2,
      body = Bodies.circle(wrapperCenterX, wrapperCenterY, radius, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      })

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
    })

    World.add(world, body)

    bodiesRef.push({
      body: body,
      ref: ref,
    })
  }

  if (rewardRef.value) {
    const ref = rewardRef.value,
      radius = makeSquare(ref) / 2,
      body = Bodies.polygon(wrapperCenterX, wrapperCenterY, 5, radius, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      })

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
    })

    World.add(world, body)

    bodiesRef.push({
      body: body,
      ref: ref,
    })
  }

  if (certificateRef.value) {
    const ref = certificateRef.value,
      size = makeSquare(ref),
      body = Bodies.rectangle(wrapperCenterX, wrapperCenterY, size, size, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      })

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
    })

    World.add(world, body)

    bodiesRef.push({
      body: body,
      ref: ref,
    })
  }

  if (metadataRef.value) {
    const ref = metadataRef.value,
      width = ref.offsetWidth,
      height = ref.offsetHeight,
      body = Bodies.trapezoid(wrapperCenterX, wrapperCenterY, width, height, 20 / width, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      }),
      bounds = body.bounds,
      adjY = ((bounds.min.y + bounds.max.y) / 2 - body.position.y) * 2

    for (const childEl of ref.children as unknown as HTMLElement[]) {
      childEl.style.marginTop = adjY + 'px'
    }

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
    })

    World.add(world, body)

    bodiesRef.push({
      body,
      ref,
    })
  }

  if (datumRef.value) {
    const ref = datumRef.value,
      width = ref.offsetWidth - 20,
      height = ref.offsetHeight,
      body = Bodies.trapezoid(wrapperCenterX, wrapperCenterY, width, height, -20 / width, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      }),
      bounds = body.bounds,
      adjY = ((bounds.min.y + bounds.max.y) / 2 - body.position.y) * 2

    for (const childEl of ref.children as unknown as HTMLElement[]) {
      childEl.style.marginTop = adjY + 'px'
    }

    Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
    })

    World.add(world, body)

    bodiesRef.push({
      body: body,
      ref: ref,
    })
  }

  for (let i = 0, stacked = addressValues.length > 5, l = stacked ? 1 : addressValues.length; i < l; i++) {
    const addressValue = stacked ? stackedAddressValues : addressValues[i],
      composite = []

    let r1 = 0,
      r2 = 0

    if (addressValue!.amount > 0) {
      const ref = amountRef.value![i]!

      r1 = makeSquare(ref) / 2

      const body = Bodies.circle(wrapperCenterX, wrapperCenterY, r1, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      })

      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
      })

      composite.push(body)

      bodiesRef.push({
        body: body,
        ref: ref,
      })
    }
    if (addressValue!.token > 0) {
      const ref = tokenRef.value![i]!

      r2 = makeSquare(ref) / 2

      const body = Bodies.polygon(wrapperCenterX, wrapperCenterY, 6, r2, {
        sleepThreshold: 4000,
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.001,
        render: {
          visible: false,
        },
      })

      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
      })

      composite.push(body)

      bodiesRef.push({
        body: body,
        ref: ref,
      })
    }

    if (composite.length > 1) {
      composite.push(
        Constraint.create({
          bodyA: composite[0],
          pointA: { x: 0, y: r1 - 7 },
          bodyB: composite[1],
          pointB: { x: 0, y: -r2 + 7 },
          stiffness: 0.001,
          damping: 0.05,
          length: 30,
          render: {
            // lineWidth: 2,
            strokeStyle: '#fff8',
            // anchors: false,
          },
        })
      )
    }

    World.add(world, composite)
  }

  /*
  const startX = 10,
    endX = wrapperWidth - 10,
    anchorY = 10,
    ropeLength = wrapperWidth * 1.1,
    segments = 30,
    spacing = ropeLength / segments

  const ropeComposite = Composites.stack(startX, anchorY, 35, 1, 0, 0, (x: number, y: number) => {
    return Bodies.rectangle(x, y, 20, 2, {
      sleepThreshold: 20,
      density: 0.1,
      frictionAir: 0.05,
      render: {
        fillStyle: '#fff',
      },
    })
  })

  Composites.chain(ropeComposite, 0.5, 0, -0.5, 0, {
    stiffness: 0.99,
    length: 0.0001,
    render: {
      visible: false,
    },
  })

  // ropeComposite.constraints.forEach((constraint) => {
  //   constraint.render.visible = false
  // })

  // Привязываем левый конец
  Composite.add(ropeComposite, [
    Constraint.create({
      pointA: { x: startX, y: 20 },
      bodyB: ropeComposite.bodies[0],
      pointB: { x: -10, y: 0 },
      stiffness: 0.9,
      length: 0, // Устанавливаем длину в 0 для точного прикрепления
    }),
    Constraint.create({
      pointA: { x: endX, y: 25 },
      bodyB: ropeComposite.bodies[ropeComposite.bodies.length - 1],
      pointB: { x: 10, y: 0 },
      stiffness: 0.9,
      length: 0, // Устанавливаем длину в 0 для точного прикрепления
    }),
  ])

  // Добавляем канат в мир
  World.add(world, ropeComposite)

  let prevNode
  for (let i = 0; i <= segments; i++) {
    const x = startX + (endX - startX) * (i / segments),
      staticNode = i == 0 || i == 11 || i == 20 || i == 30

    const node = staticNode
      ? Bodies.circle(x, i < 20 ? 20 : i == 20 ? 10 : 25, 7, {
          isStatic: true,
          collisionFilter: {
            category: 2,
            mask: 0,
          },
          render: {
            fillStyle: '#fff',
          },
        })
      : Bodies.circle(x, anchorY, (i > 5 && i < 10) || (i > 20 && i < 26) ? 1 : 0.5, {
          render: {
            fillStyle: '#fff0',
          },
        })
    World.add(world, node)

    if (prevNode) {
      const constraint = Constraint.create({
        bodyA: prevNode,
        bodyB: node,
        length: spacing,
        stiffness: 0.9,
        render: {
          lineWidth: 1,
          strokeStyle: '#fff',
          anchors: false,
        },
      })
      World.add(world, constraint)
    }

    prevNode = node
  }

  let yPosition = 0
  for (const tx of txs) {
    const ratio = getRatio(tx.size, 16384),
      color = getColorHSL(ratio),
      isCircle = true, //ratio > 0.05 || txs.length < 50,
      shapeArea = shapeMaxArea * ratio,
      shapeRadius = (isCircle ? Math.ceil(Math.sqrt(shapeArea / Math.PI)) : Math.ceil(Math.sqrt((2 * shapeArea) / 3 / Math.sqrt(3)))) + 1

    yPosition -= shapeRadius

    // const shape = Bodies.circle(wrapperCenterX, yPosition, shapeRadius, {
    //   sleepThreshold: 500,
    //   restitution: 0.7,
    //   friction: 0.1,
    //   collisionFilter: {
    //     mask: 1,
    //   },
    // })

    const shape = Body.create({
      parts: [
        isCircle
          ? Bodies.circle(wrapperCenterX, yPosition, shapeRadius, {
              render: {
                visible: false,
              },
            })
          : Bodies.polygon(wrapperCenterX, yPosition, 6, shapeRadius, {
              render: {
                visible: false,
              },
            }),
        isCircle
          ? Bodies.circle(wrapperCenterX, yPosition, shapeRadius - 2, {
              isSensor: true,
              render: {
                fillStyle: getColorHSL(ratio, 0.5),
                strokeStyle: color,
                lineWidth: 2,
              },
            })
          : Bodies.polygon(wrapperCenterX, yPosition, 6, shapeRadius - 2, {
              isSensor: true,
              render: {
                fillStyle: getColorHSL(ratio, 0.5),
                strokeStyle: color,
                lineWidth: 2,
              },
            }),
      ],
      collisionFilter: {
        mask: 1,
      },
      restitution: 0.7,
      friction: 0.1,
      sleepThreshold: Math.min(4000, 40000 / txs.length),
    })

    yPosition -= shapeRadius + 10

    shape.label = tx.hash.slice(0, 2) + '...'

    World.add(world, shape)
  }
*/
  Render.run(render)

  runner = Runner.create()
  Runner.run(runner, engine)

  Events.on(render, 'afterRender', () => {
    // const ctx = render.context

    for (const { body, ref } of bodiesRef) {
      ref.style.transform = `translate(${body.position.x - ref.offsetWidth / 2}px, ${body.position.y - ref.offsetHeight / 2}px) rotate(${body.angle}rad)`
    }

    /*
    if (mintData.body) {
      const vertices = mintData.body.parts[2].vertices
      // { x, y } = mintData.body.position,
      // vertices = mintData.body.vertices.map((vertex) => {
      //   const dx = x - vertex.x,
      //     dy = y - vertex.y,
      //     distance = Math.sqrt(dx * dx + dy * dy)

      //   return { x: vertex.x + dx / distance, y: vertex.y + dy / distance }
      // })

      ctx.beginPath()
      ctx.moveTo(vertices[0].x, vertices[0].y)
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y)
      }
      ctx.closePath()

      const gradient = ctx.createLinearGradient(vertices[2].x, vertices[2].y, vertices[5].x, vertices[5].y)
      gradient.addColorStop(0, mintData.posColor)
      gradient.addColorStop(0.5, '#0000')
      gradient.addColorStop(1, mintData.negColor)

      ctx.strokeStyle = gradient
      ctx.lineWidth = 2
      ctx.stroke()
    }

    if (depositData.body) {
      const { x, y } = depositData.body.position,
        { angle, circleRadius: radius } = depositData.body

      ctx.translate(x, y)
      ctx.rotate(angle)

      const gradient = ctx.createLinearGradient(-radius! / 2, -radius! / 2, radius! / 2, radius! / 2)
      gradient.addColorStop(0, depositData.negColor)
      gradient.addColorStop(0.5, '#0000')
      gradient.addColorStop(1, depositData.posColor)

      ctx.strokeStyle = gradient
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.arc(0, 0, radius! - 1, 0, 2 * Math.PI)
      ctx.stroke()

      ctx.rotate(-angle)
      ctx.translate(-x, -y)
    }
    */
  })

  World.add(
    world,
    MouseConstraint.create(engine, {
      mouse: Mouse.create(render.canvas),
      constraint: {
        stiffness: 0.001,
        damping: 0.001,
        length: 0,
        render: {
          strokeStyle: '#fff8',
        },
      },
    })
  )

  // render.mouse = mouse

  // Events.on(render, 'afterRender', function () {
  //   const context = render.context
  //   context.font = '10px Arial'
  //   context.textAlign = 'center'
  //   context.textBaseline = 'middle'
  //   context.fillStyle = 'white'

  //   Composite.allBodies(engine.world).forEach((body) => {
  //     if (body.label) {
  //       const { x, y } = body.position
  //       const angle = body.angle

  //       // Сохраняем текущее состояние контекста
  //       context.save()
  //       // Перемещаемся к центру фигуры
  //       context.translate(x, y)
  //       // Поворачиваем на угол фигуры
  //       context.rotate(angle)
  //       // Рисуем текст по центру фигуры
  //       context.fillText(body.label, 0, 0)
  //       // Восстанавливаем исходное состояние контекста
  //       context.restore()
  //     }
  //   })
  // })
}

const removeWorld = () => {
  Render.stop(render)
  World.clear(world, false)
  Engine.clear(engine)

  Events.off(render, 'afterRender')

  render.canvas.remove()
  render.canvas = null as unknown as HTMLCanvasElement
  render.context = null as unknown as CanvasRenderingContext2D
  render.textures = null
}

const resizeObserver = new ResizeObserver(() => {
  removeWorld()

  initWorld()
})

// watch(() => data, initWorld)

onMounted(() => {
  initWorld()

  resizeObserver.observe(wrapperRef.value!)
})

onUnmounted(() => {
  removeWorld()

  resizeObserver.disconnect()
})
</script>
