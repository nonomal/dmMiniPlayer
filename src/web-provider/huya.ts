import { Barrage } from '@root/danmaku'
import HuyaLiveBarrageClient from '@root/danmaku/huya'
import { sendMessage } from '@root/inject/contentSender'
import { dq, dq1 } from '@root/utils'
import WebProvider from './webProvider'

export default class HuyaLiveProvider extends WebProvider {
  observer: MutationObserver
  barrageClient: HuyaLiveBarrageClient

  constructor() {
    super()
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

    this.miniPlayer.initBarrageSender({
      webSendButton: dq1('#msg_send_bt'),
      webTextInput: dq1('#pub_msg_input') as HTMLInputElement,
    })

    return miniPlayer
  }

  private fn: (data: { color: string; text: string }) => void = () => 1

  getRoomId() {
    let locationId = location.pathname.split('/').pop()
    if (+locationId + '' == locationId) return locationId
  }
  startObserverWs() {
    this.barrageClient = new HuyaLiveBarrageClient(this.getRoomId())

    this.fn = (data: { color: string; text: string }) => {
      this.miniPlayer.danmakuController.barrages.push(
        new Barrage({
          player: this.miniPlayer,
          config: {
            color: data.color,
            text: data.text,
            time: this.miniPlayer.webPlayerVideoEl.currentTime,
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
