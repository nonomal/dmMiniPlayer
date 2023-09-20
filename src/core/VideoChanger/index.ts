import { createElement } from '@root/utils'
import type WebProvider from '@root/web-provider/webProvider'

export default class VideoChanger {
  iframe = createElement<HTMLIFrameElement>('iframe', {
    style: `position:fixed;width:${window.innerWidth}px;height:${window.innerHeight}px;top:0;left:0;visibility: hidden;`,
  })
  webProvider: WebProvider

  constructor(webProvider: WebProvider) {
    document.body.appendChild(this.iframe)
    this.webProvider = webProvider
  }

  protected openUrl(url: string) {
    return new Promise<void>((res) => {
      this.iframe.src = url

      const handleOnLoad = () => {
        res()
        this.iframe.removeEventListener('load', handleOnLoad)
      }
      this.iframe.addEventListener('load', handleOnLoad)
    })
  }

  async changeVideo(url: string) {
    await this.openUrl(url)
    const newWebVideoEl = await this.webProvider.getVideoEl(
      this.iframe.contentDocument
    )

    this.webProvider.miniPlayer.updateWebVideoPlayerEl(newWebVideoEl)
  }
}
