import Events2 from '@root/utils/Events2'
import { DanmakuInitData, DanmakuManagerEvents, DanmakuMoveType } from './types'
import { addEventListener, createElement } from '@root/utils'
import style from './index.less?inline'
import Danmaku from './Danmaku'
import TunnelManager from './TunnelManager'

type DanmakuConfig = {
  speed: number
  fontSize: number
  fontFamily: string
  fontWeight: number
  unmovingDanmakuSaveTime: number
  gap: number
}
export default class DanmakuManager
  extends Events2<DanmakuManagerEvents>
  implements DanmakuConfig
{
  danmakus: Danmaku[] = []

  media: HTMLMediaElement
  container: HTMLElement = createElement('div', {
    className: 'danmaku-container',
  })
  tunnelManager = new TunnelManager(this)

  style = createElement('style', {
    innerHTML: style,
  })

  speed = 40
  fontSize = 14
  fontFamily = 'Segoe UI Emoji, SimHei, "microsoft yahei", sans-serif'
  fontWeight = 600
  unmovingDanmakuSaveTime = 5
  gap = 4

  // seek + 第一次进入视频时确定startIndex位置
  hasSeek = true
  offsetStartTime = 10

  constructor() {
    super()
    this.reset()
  }
  init(
    props: {
      container?: HTMLElement
      media: HTMLMediaElement
    } & Partial<DanmakuConfig>
  ) {
    this.reset()
    Object.assign(this, props)
    this.container.classList.add('danmaku-container')
    this.container.appendChild(this.style)

    this.updateState()
    this.bindEvent()
  }

  updateState() {
    this.container.style.setProperty('--font-size', this.fontSize + 'px')
    this.container.style.setProperty('--gap', this.gap + 'px')
    this.container.style.setProperty('--font-weight', this.fontWeight + '')
    this.container.style.setProperty('--font-family', this.fontFamily)
  }

  private runningDanmakus: Danmaku[] = []
  private nowPos = 0
  private unbindEvent = () => {}
  private bindEvent() {
    const mediaUnbind = addEventListener(this.media, (el) => {
      el.addEventListener('play', () => {
        this.container.classList.remove('paused')
      })
      el.addEventListener('pause', () => {
        console.log('video pause', this.container)
        this.container.classList.add('paused')
      })
      el.addEventListener('seeking', () => {
        console.log('video seeked')
        this.danmakus.forEach((d) => d.reset())
        this.tunnelManager.resetTunnelsMap()
        this.hasSeek = true
        this.nowPos = 0
      })
      el.addEventListener('timeupdate', () => {
        if (!this.danmakus.length) return
        // 重制nowPos位置
        const ctime = el.currentTime
        const toRunDanmakus: Danmaku[] = []
        while (this.nowPos < this.danmakus.length) {
          const danmaku = this.danmakus[this.nowPos]
          const startTime = danmaku.time
          if (startTime > ctime) {
            break
          }
          if (startTime > ctime - this.offsetStartTime) {
            toRunDanmakus.push(danmaku)
          }
          ++this.nowPos
        }
        const disableKeys: number[] = []
        for (const key in toRunDanmakus) {
          const danmaku = toRunDanmakus[key]
          danmaku.init({
            initTime: this.hasSeek ? ctime : null,
          })
          if (danmaku.initd) {
            disableKeys.unshift(+key)
          }
        }
        this.runningDanmakus = toRunDanmakus.filter((d) => d.initd)

        this.hasSeek = false
      })
    })

    this.unbindEvent = () => {
      console.log('unbindEvent')
      mediaUnbind()
    }
  }

  addDanmakus(danmakus: DanmakuInitData[]) {
    this.danmakus.push(
      ...danmakus.map((dan) => {
        return new Danmaku({
          ...dan,
          danmakuManager: this,
        })
      })
    )
  }

  resetState() {
    this.tunnelManager.resetTunnelsMap()
  }
  reset() {
    this.resetState()
    this.danmakus.length = 0
    this.unbindEvent()
  }
}
