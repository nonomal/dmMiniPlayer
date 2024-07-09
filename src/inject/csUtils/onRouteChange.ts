import { wait } from '@root/utils'
import { onMessage, sendMessage } from '../contentSender'

sendMessage('inject-api:run', {
  origin: 'history',
  keys: ['pushState', 'forward', 'replaceState'],
  onTriggerEvent: 'history',
})
onMessage('inject-api:onTrigger', async (data) => {
  if (!data) return
  if (data.event != 'history') return null
  console.log('切换了路由 history')
  await wait()
  callbacks.forEach((cb) => cb())
})
window.addEventListener('popstate', async () => {
  console.log('切换了路由 popstate')
  await wait()
  callbacks.forEach((cb) => cb())
})

const callbacks: (() => void)[] = []
export default function onRouteChange(callback: () => void) {
  callbacks.push(callback)
  const unListen = () =>
    callbacks.slice(callbacks.findIndex((c) => c == callback))

  return unListen
}
