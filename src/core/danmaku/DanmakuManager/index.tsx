import Events2 from '@root/utils/Events2'
import { DanmakuInitData, DanmakuManagerEvents } from './types'
import { addEventListener, createElement, noop } from '@root/utils'
import style from './index.less?inline'
import Danmaku from './Danmaku'
import TunnelManager from './TunnelManager'
import { autorun } from 'mobx'
import { makeKeysObservable } from '@root/utils/mobx'
import { PlayerComponent } from '@root/core/types'

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
  implements DanmakuConfig, PlayerComponent
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
  opacity = 1
  fontShadow = true

  // seek + 第一次进入视频时确定startIndex位置
  hasSeek = true
  offsetStartTime = 10

  constructor() {
    super()
    this.reset()

    makeKeysObservable(this, [
      'speed',
      'fontSize',
      'fontFamily',
      'fontWeight',
      'unmovingDanmakuSaveTime',
      'gap',
      'opacity',
      'fontShadow',
    ])
  }

  onInit(
    props: {
      container?: HTMLElement
      media: HTMLMediaElement
    } & Partial<DanmakuConfig>
  ) {}
  onUnload() {
    this.reset()
    this.unlistens.forEach((unlisten) => unlisten())
  }
  unload() {
    this.onUnload()
  }
  init(
    props: {
      container?: HTMLElement
      media: HTMLMediaElement
    } & Partial<DanmakuConfig>
  ) {
    this.onInit(props)
    this.reset()
    Object.assign(this, props)
    this.container.classList.add('danmaku-container')
    this.container.appendChild(this.style)

    const confUnlisten = autorun(() => {
      this.updateState()
    })
    this.bindEvent()

    this.unlistens = [confUnlisten]
  }

  private unlistens: noop[] = []

  updateState() {
    this.container.style.setProperty('--font-size', this.fontSize + 'px')
    this.container.style.setProperty('--gap', this.gap + 'px')
    this.container.style.setProperty('--font-weight', this.fontWeight + '')
    this.container.style.setProperty('--font-family', this.fontFamily)
    this.container.style.setProperty('--opacity', this.opacity + '')
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
        // 这里只计算type:right的弹幕位置
        const rightDanOccupyWidthMap: Record<number, number> = {}

        for (const key in toRunDanmakus) {
          const danmaku = toRunDanmakus[key]
          danmaku.init({ initTime: this.hasSeek ? ctime : null })
          if (danmaku.initd) {
            disableKeys.unshift(+key)
          } else {
            continue
          }

          // hasSeek下不需要处理非right的弹幕
          if (this.hasSeek && danmaku.type != 'right') {
            this.tunnelManager.observeMovingDanmakuOutTunnel(danmaku)
            continue
          }

          // 处理seek的弹幕
          // 根据长度判断是否要监听退出tunnel事件
          if (this.hasSeek) {
            // 不要tunnelManager的tunnel，自己计算一套tunnel再占领tunnelsMap位置
            this.tunnelManager.popTunnel(danmaku)

            const { width } = danmaku,
              offsetTime = ctime - danmaku.time,
              speed = this.speed

            const movedX = speed * offsetTime

            const startX = this.container.clientWidth - movedX,
              occupyRight = startX + width

            let toTunnel = 0
            while (true) {
              if (!rightDanOccupyWidthMap[toTunnel]) {
                rightDanOccupyWidthMap[toTunnel] = occupyRight
                break
              }
              if (rightDanOccupyWidthMap[toTunnel] < startX) {
                rightDanOccupyWidthMap[toTunnel] = occupyRight
                break
              }
              toTunnel++
            }
            if (toTunnel > this.tunnelManager.maxTunnel) {
              danmaku.reset()
              continue
            }

            // 这里是渲染时就在屏幕外，就占用一个tunnel通道
            if (occupyRight >= this.container.clientWidth) {
              this.tunnelManager.tunnelsMap.right[toTunnel] = danmaku
              this.tunnelManager.observeMovingDanmakuOutTunnel(danmaku)
            }
            danmaku.tunnel = toTunnel
            danmaku.updateState()
          } else {
            this.tunnelManager.observeMovingDanmakuOutTunnel(danmaku)
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
