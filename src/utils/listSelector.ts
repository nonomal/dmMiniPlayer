import { throttle } from '.'
import { getTopParentsWithSameRect } from './dom'

export function listSelector() {
  return new Promise<any>((res) => {
    const handleMousemove = throttle((e: MouseEvent) => {
      const target = e.target as HTMLElement
      const topElement = getTopParentsWithSameRect(target)
    }, 1000)

    window.addEventListener('mousemove', handleMousemove)

    const handleClick = (e: MouseEvent) => {
      window.removeEventListener('click', handleClick, false)
      window.removeEventListener('mousemove', handleMousemove)
      // TODO 返回parent + child[]
      res(1)
    }
    window.addEventListener('click', handleClick, false)
  })
}
