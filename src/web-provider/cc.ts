import { Barrage } from '@root/danmaku'
import configStore from '@root/store/config'
import { dq1, onWindowLoad } from '@root/utils'
import WebProvider from './webProvider'
import CCLiveBarrageClient from '@root/danmaku/cc/liveBarrageClient'
import { getMiniPlayer } from '@root/core'
import type { OrPromise } from '@root/utils/typeUtils'

window.CCLiveBarrageClient = CCLiveBarrageClient
export default class CCLiveProvider extends WebProvider {
  observer: MutationObserver
  barrageClient: CCLiveBarrageClient

  constructor() {
    super()

    // TODO cc的弹幕字体
    // // 斗鱼的字体
    configStore.fontFamily =
      'PingFang SC,-apple-system,Microsoft YaHei,宋体,Arial,Verdana'
    configStore.fontWeight = 700
  }

  protected async initMiniPlayer(
    options?: Partial<{ videoEl: HTMLVideoElement }>
  ) {
    const miniPlayer = await super.initMiniPlayer(options)

    // 弹幕相关
    this.miniPlayer.on('PIPClose', () => {
      this.stopObserveWs()
    })
    this.startObserverWs()

    return miniPlayer
  }

  private fn: (data: { color: string; text: string }) => void = () => 1
  startObserverWs() {
    const pathArr = location.pathname.split('/')
    pathArr.pop()
    this.barrageClient = new CCLiveBarrageClient(+pathArr.pop())

    this.fn = (data: { color: string; text: string }) => {
      this.miniPlayer.danmakuController.barrages.push(
        new Barrage({
          player: this.miniPlayer,
          config: {
            // TODO
            color: data.color,
            text: data.text,
            time: this.miniPlayer.webPlayerVideoEl.currentTime,
            // TODO
            type: 'right',
          },
        })
      )
    }
    this.barrageClient.addEventListener('danmu', this.fn)
  }
  stopObserveWs() {
    this.barrageClient.removeListener('danmu', this.fn)
    this.barrageClient.close()
  }
}
