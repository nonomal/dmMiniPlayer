import Events2 from '@root/utils/Events2'
import { DanmakuInitData, DanmakuManagerEvents, DanmakuMoveType } from './types'
import { addEventListener, createElement } from '@root/utils'
import style from './index.less?inline'
import Danmaku from './Danmaku'

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
  tunnelsMap: { [key in DanmakuMoveType]: boolean[] }
  maxTunnel = 100

  style = createElement('style', {
    innerHTML: style,
  })

  speed = 40
  fontSize = 14
  fontFamily = 'Segoe UI Emoji, SimHei, "microsoft yahei", sans-serif'
  fontWeight = 600
  unmovingDanmakuSaveTime = 5
  gap = 4

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
        this.container.classList.add('paused')
      })
      el.addEventListener('seeked', () => {
        this.resetDanmakuState()
      })
      el.addEventListener('timeupdate', () => {
        const ctime = el.currentTime
        while (this.nowPos < this.danmakus.length) {
          const danmaku = this.danmakus[this.nowPos]
          const startTime = danmaku.time
          if (startTime >= ctime) {
            break
          }
          this.runningDanmakus.push(danmaku)
          ++this.nowPos
        }
        const disableKeys: number[] = []
        for (const key in this.runningDanmakus) {
          const danmaku = this.runningDanmakus[key]
          danmaku.init({ speed: 20 })
          if (danmaku.initd) {
            disableKeys.unshift(+key)
          }
        }
        disableKeys.forEach((key) => {
          this.runningDanmakus.splice(key, 1)
        })
      })
    })

    this.unbindEvent = () => {
      mediaUnbind()
    }
  }

  addDanmakus(danmakus: DanmakuInitData[]) {
    this.danmakus.push(
      ...danmakus.map((dan) => {
        return new Danmaku({
          ...dan,
          container: this.container,
          danmakuManager: this,
        })
      })
    )
  }

  reset() {
    this.danmakus.length = 0
    this.resetDanmakuState()
    this.unbindEvent()
  }

  resetDanmakuState() {
    this.tunnelsMap = {
      bottom: [],
      right: [],
      top: [],
    }
  }

  getTunnel(type: DanmakuMoveType) {
    const find = this.tunnelsMap[type].findIndex((v) => v)
    if (find != -1) {
      this.tunnelsMap[type][find] = false
      return find > this.maxTunnel ? -1 : find
    }
    this.tunnelsMap[type].push(false)
    const tunnel = this.tunnelsMap[type].length - 1
    return tunnel > this.maxTunnel ? -1 : tunnel
  }
  pushTunnel(type: DanmakuMoveType) {
    const find = this.tunnelsMap[type].findIndex((v) => v)
    if (find != -1) {
      this.tunnelsMap[type][find] = false
      return
    }
    this.tunnelsMap[type].push(false)
  }
  popTunnel(type: DanmakuMoveType, tunnel: number) {
    this.tunnelsMap[type][tunnel] = true
  }
}
