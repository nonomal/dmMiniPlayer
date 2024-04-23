import configStore, { videoBorderType } from '@root/store/config'
import SubtitleManager from '../SubtitleManager'
import VideoChanger from '../VideoChanger'
import DanmakuManager from '../danmaku/DanmakuManager'
// import DocWebProvider from './DocWebProvider'
import CanvasWebProvider from './CanvasWebProvider'
import MiniPlayer from '../MiniPlayer/MiniPlayer'
import { dq } from '@root/utils'
import { createElement } from '@root/utils'
import DocMiniPlayer from '../MiniPlayer/DocMiniPlayer'
import { getPIPWindowConfig } from '@root/utils/storage'
// import { DocWebProvider } from '.'

export default abstract class WebProvider {
  videoChanger: VideoChanger
  subtitleManager: SubtitleManager
  danmakuManager: DanmakuManager

  webVideo: HTMLVideoElement
  protected abstract miniPlayer: MiniPlayer

  constructor() {
    if (
      [DocWebProvider /* , CanvasWebProvider */].find((v) => this instanceof v)
    )
      return this

    const provider = (() => {
      if (configStore.useDocPIP) {
        return new DocWebProvider()
      } /*  else {
        return new CanvasWebProvider()
      } */
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
  /**打开画中画播放器 */
  openPIPPlayer(props?: { videoEl?: HTMLVideoElement }) {
    const initData = this.onInit()
    if (initData) {
      Object.assign(this, initData)
    }
    this.webVideo = props?.videoEl ?? this.getVideoEl()

    this.onOpenPIPPlayer()
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

  onOpenPIPPlayer(): Promise<void> | void {}
}

// ! 放单独文件有循环引用的问题，暂时放一起了
class DocWebProvider extends WebProvider {
  onInit(): Partial<{
    videoChanger: VideoChanger
    subtitleManager: SubtitleManager
    danmakuManager: DanmakuManager
  }> {
    throw new Error('Method not implemented.')
  }

  protected miniPlayer: DocMiniPlayer

  pipWindow: Window

  openPIPPlayer(): void {
    super.openPIPPlayer()
    this.miniPlayer = new DocMiniPlayer({
      webVideoEl: this.webVideo,
      danmakuManager: this.danmakuManager,
      subtitleManager: this.subtitleManager,
      videoChanger: this.videoChanger,
    })
  }

  async onOpenPIPPlayer() {
    // 获取应该有的docPIP宽高
    const pipWindowConfig = await getPIPWindowConfig()
    let width = pipWindowConfig?.width ?? this.webVideo.clientWidth,
      height = pipWindowConfig?.height ?? this.webVideo.clientHeight

    console.log('pipWindowConfig', pipWindowConfig)
    // cw / ch = vw / vh
    const vw = this.webVideo.videoWidth,
      vh = this.webVideo.videoHeight

    switch (configStore.videoNoBorder) {
      // cw = vw / vh * ch
      case videoBorderType.height: {
        width = (vw / vh) * height
        break
      }
      // ch = vh / vw * cw
      case videoBorderType.width: {
        height = (vh / vw) * width
        break
      }
    }

    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width,
      height,
    })
    this.pipWindow = pipWindow
    // docPIP特有的关闭时间
    pipWindow.addEventListener('pagehide', () => {
      this.miniPlayer.emit('PIPClose')
    })

    const playerEl = await this.miniPlayer.getPlayerEl()
    pipWindow.document.body.appendChild(playerEl)

    // 弹幕器相关
    const danmakuContainer = createElement('div', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      },
    })
    playerEl.appendChild(danmakuContainer)
    this.danmakuManager.init({
      media: this.webVideo,
      container: danmakuContainer,
    })
  }
}
