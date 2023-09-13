import { createElement } from '.'
import { getTopParentsWithSameRect } from './dom'
import { throttle } from 'lodash-es'

export function listSelector() {
  return new Promise<any>((res) => {
    const styleEl = createElement('style', {
      innerText: `.list-h-select{ background-color: red; }`,
    })
    let lastEl: HTMLElement
    const handleMousemove = throttle((e: MouseEvent) => {
      const target = e.target as HTMLElement
      const topElements = getTopParentsWithSameRect(target)
      const topEl = topElements[topElements.length - 1] || target
      console.log('topEl', topEl)
      lastEl && lastEl.classList.remove('list-h-select')
      topEl.classList.add('list-h-select')
      lastEl = topEl
    }, 1000)
    document.body.appendChild(styleEl)

    window.addEventListener('mousemove', handleMousemove)

    const handleClick = (e: MouseEvent) => {
      window.removeEventListener('click', handleClick, false)
      window.removeEventListener('mousemove', handleMousemove)
      document.removeChild(styleEl)
      // TODO 返回parent + child[]
      res(1)
    }
    window.addEventListener('click', handleClick, false)
  })
}
