import configStore, { videoBorderType } from '@root/store/config'
import SubtitleManager from '../SubtitleManager'
import VideoChanger from '../VideoChanger'
import DanmakuManager from '../danmaku/DanmakuManager'
import MiniPlayer from '../MiniPlayer/MiniPlayer'
import { dq } from '@root/utils'
import { CanvasWebProvider, DocWebProvider } from '.'
import { PlayerEvent } from '../event'
import { MaxTunnelType } from '@root/store/config/danmaku'
import videoRender from '@root/store/videoRender'
import { autorun } from 'mobx'

export default abstract class WebProvider {
  videoChanger: VideoChanger
  subtitleManager: SubtitleManager
  danmakuManager: DanmakuManager

  webVideo: HTMLVideoElement
  protected abstract miniPlayer: MiniPlayer

  constructor() {
    if ([DocWebProvider, CanvasWebProvider].find((v) => this instanceof v))
      return this

    const provider = (() => {
      if (configStore.useDocPIP) {
        return new DocWebProvider()
      } else {
        return new CanvasWebProvider()
      }
    })()

    Object.setPrototypeOf(Object.getPrototypeOf(this), provider)
    console.log('this', this)
    return this
  }

  onInit(): Partial<{
    videoChanger: VideoChanger
    subtitleManager: SubtitleManager
    danmakuManager: DanmakuManager
  }> | null {
    return null
  }

  private initd?: boolean
  /**打开播放器 */
  async openPlayer(props?: { videoEl?: HTMLVideoElement }) {
    const initData = this.onInit()
    if (initData) {
      Object.assign(this, initData)
    }
    this.webVideo = props?.videoEl ?? this.getVideoEl()

    await this.onOpenPlayer()
  }

  /**获取视频 */
  getVideoEl(document = window.document): HTMLVideoElement {
    const videos = [
      ...dq('video', document),
      ...dq('iframe', document)
        .map((iframe) => {
          try {
            return Array.from(
              iframe.contentWindow?.document.querySelectorAll('video')
            )
          } catch (error) {
            return null
          }
        })
        .filter((v) => !!v)
        .flat(),
    ]

    if (!videos.length)
      throw Error('页面中不存在video，或者video在不支持的非同源iframe中')
    const targetVideo = videos.reduce((tar, now) => {
      if (tar.clientHeight < now.clientHeight) return now
      return tar
    }, videos[0])

    return targetVideo
  }

  onOpenPlayer(): Promise<void> | void {}
}
