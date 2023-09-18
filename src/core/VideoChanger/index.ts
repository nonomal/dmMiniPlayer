import { createElement } from '@root/utils'

export default class VideoChanger {
  iframe = createElement<HTMLIFrameElement>('iframe', {
    style: 'position:fixed;opacity: 0;bottom:0;right:0;pointer-events: none;',
    width: '100%',
    height: '100%',
  })

  constructor() {
    document.body.appendChild(this.iframe)
  }

  openUrl(url: string) {
    return new Promise<void>((res) => {
      this.iframe.src = url

      const handleOnLoad = () => {
        res()
        this.iframe.removeEventListener('load', handleOnLoad)
      }
      this.iframe.addEventListener('load', handleOnLoad)
    })
  }
}
