import { WebProvider } from '.'
import SubtitleManager from '../SubtitleManager'
import VideoChanger from '../VideoChanger'
import DanmakuManager from '../danmaku/DanmakuManager'
import DocMiniPlayer from '../MiniPlayer/DocMiniPlayer'
import { getPIPWindowConfig } from '@root/utils/storage'
import configStore, { videoBorderType } from '@root/store/config'
import { createElement } from '@root/utils'

export default class DocWebProvider extends WebProvider {
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
