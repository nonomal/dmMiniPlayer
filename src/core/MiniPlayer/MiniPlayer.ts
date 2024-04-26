import { createElement } from '@root/utils'
import SubtitleManager from '../SubtitleManager'
import VideoChanger from '../VideoChanger'
import DanmakuManager from '../danmaku/DanmakuManager'
import Events2 from '@root/utils/Events2'
import { PlayerEvents } from '../event'
import configStore from '@root/store/config'
import { MaxTunnelType } from '@root/store/config/danmaku'
import videoRender from '@root/store/videoRender'
import { autorun } from 'mobx'

export type ExtendComponent = {
  videoChanger: VideoChanger
  subtitleManager: SubtitleManager
  danmakuManager: DanmakuManager
}
export type BaseComponent = {
  /**网站的video dom */
  webVideoEl: HTMLVideoElement
}

export type MiniPlayerProps = Partial<ExtendComponent> & BaseComponent

export default abstract class MiniPlayer
  extends Events2<PlayerEvents>
  implements BaseComponent, ExtendComponent
{
  webVideoEl: HTMLVideoElement
  videoChanger: VideoChanger
  subtitleManager: SubtitleManager
  danmakuManager: DanmakuManager
  height: number
  width: number

  constructor(props: MiniPlayerProps) {
    super()
    Object.assign(this, props)
    this.onInit()

    // 设置maxTunnel
    // autorun(() => {
    //   const { maxTunnel, gap, fontSize } = configStore
    //   const { containerHeight: renderHeight } = videoRender

    //   const tunnel = (() => {
    //     switch (maxTunnel) {
    //       case MaxTunnelType['1/2']:
    //         return renderHeight / 2 / (+fontSize + +gap)
    //       case MaxTunnelType['1/4']:
    //         return renderHeight / 4 / (+fontSize + +gap)
    //       case MaxTunnelType['full']:
    //         return 100
    //     }
    //   })()

    //   this.danmakuManager.tunnelManager.maxTunnel = tunnel
    // })

    autorun(() => {
      this.danmakuManager.fontSize = configStore.fontSize
      this.danmakuManager.fontFamily = configStore.fontFamily
      this.danmakuManager.fontWeight = configStore.fontWeight
      this.danmakuManager.gap = configStore.gap
    })
  }

  onInit() {}
  abstract getPlayerEl(): Promise<HTMLElement>
  abstract getMediaStream(): Promise<MediaStream>
}
