import pinoPretty from 'pino-pretty'

const pad = (n: number, len = 2) => String(n).padStart(len, '0')

export default (): pinoPretty.PrettyStream =>
  pinoPretty({
    ignore: 'pid,hostname,time,level',
    messageFormat: (log, messageKey, levelLabel, { colors }) => {
      let pidStr = colors.black(`[${log.pid}]`)
      switch (process.env.WORKER_NUM ? Number(process.env.WORKER_NUM) % 3 : -1) {
        case 0:
          pidStr = colors.bgGreen(pidStr)
          break
        case 1:
          pidStr = colors.bgYellow(pidStr)
          break
        case 2:
          pidStr = colors.bgCyan(pidStr)
          break
        default:
          pidStr = colors.bgMagenta(pidStr)
          break
      }

      const d = new Date(log.time as number),
        timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`

      let levelColorized
      switch (log.level as number) {
        case 60:
          levelColorized = colors.bgRed(colors.white('FATAL'))
          break
        case 50:
          levelColorized = colors.red('ERROR')
          break
        case 40:
          levelColorized = colors.yellow('WARN')
          break
        case 30:
          levelColorized = colors.green('INFO')
          break
        case 20:
          levelColorized = colors.blueBright('DEBUG')
          break
        default:
          levelColorized = colors.gray('TRACE')
      }

      const msg = log[messageKey] ? colors.white(log[messageKey] as string) : ''

      return `${pidStr} ${colors.gray(timeStr)} ${levelColorized}: ${msg}`
    },
  })
