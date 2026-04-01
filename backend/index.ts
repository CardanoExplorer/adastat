import { start } from '@/app.ts'
import logger from '@/logger.ts'
import cluster from 'node:cluster'

if (cluster.isPrimary) {
  logger.info('App start')

  let workerNum = 0,
    activeWorkerId = 0,
    crashCount = 0,
    lastCrashTime = 0

  const fork = () => {
    const worker = cluster.fork({
      WORKER_NUM: workerNum++,
    })

    activeWorkerId = worker.id

    worker.on('message', (msg) => {
      if (msg === 'ready') {
        for (const clusterWorker of Object.values(cluster.workers || {})) {
          if (clusterWorker?.id !== activeWorkerId && clusterWorker?.id !== worker.id) {
            clusterWorker?.kill('SIGTERM')
          }
        }
      }
    })

    worker.on('exit', (code, signal) => {
      if ((signal || code !== 0) && Object.keys(cluster.workers || {}).length === 0) {
        const now = Date.now()
        if (now - lastCrashTime < 10000) {
          crashCount++
        } else {
          crashCount = 1
        }
        lastCrashTime = now

        if (crashCount > 4) {
          logger.error('Too many crashes, stopping')
          process.exit(1)
        }

        logger.warn('Crashed, restarting')

        setTimeout(fork, 1000 * crashCount)
      }
    })
  }

  process.on('SIGUSR2', () => {
    // kill -USR2 <master_pid> starts new Worker
    logger.info('SIGUSR2 received')

    fork()
  })

  process.on('SIGTERM', () => {
    for (const clusterWorker of Object.values(cluster.workers || {})) {
      clusterWorker?.kill('SIGTERM')
    }

    process.exit(0)
  })

  if (process.env.NODE_ENV !== 'production') {
    process.stdin.on('data', (data) => {
      if (data.toString().trim().toLowerCase() === 'r') {
        fork()
      }
    })
  }

  fork()
} else {
  void start()
}
