import { createElement, noop } from '@root/utils'
import { DanmakuManager } from '../'
import Danmaku from './CanvasDanmaku'
import { DanmakuManagerInitProps } from '../DanmakuManager'
import { onceCallGet } from '@root/utils/decorator'
import { autorun } from 'mobx'
import CanvasDanmakuVideo from './CanvasDanmakuVideo'

export default class CanvasDanmakuManager extends DanmakuManager {
  Danmaku = Danmaku
  declare danmakus: Danmaku[]
  declare runningDanmakus: Danmaku[]

  canvasDanmakuVideo: CanvasDanmakuVideo
  get canvas() {
    return this.canvasDanmakuVideo.canvas
  }
  get renderFPS() {
    return this.canvasDanmakuVideo.fps
  }
  get withoutLimitAnimaFPS() {
    return this.canvasDanmakuVideo.withoutLimitAnimaFPS
  }
  get ctx() {
    return this.canvasDanmakuVideo.ctx
  }

  onInit(props: DanmakuManagerInitProps): void {
    this.canvasDanmakuVideo = new CanvasDanmakuVideo({
      danmakuManager: this,
      videoEl: props.media as HTMLVideoElement,
      fps: 60,
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    })

    this.container.appendChild(this.canvas)
  }
  onUnload(): void {}

  bindEvent() {}

  private nowPos = 0
  // 绘制弹幕文本
  draw() {
    const videoCTime = this.media.currentTime

    while (this.nowPos < this.danmakus.length) {
      const barrage = this.danmakus[this.nowPos]
      const startTime = barrage.startTime
      if (startTime >= videoCTime) {
        break
      }
      this.runningDanmakus.push(barrage)
      ++this.nowPos
    }
    const disableKeys: number[] = []
    for (const key in this.runningDanmakus) {
      const barrage = this.runningDanmakus[key]
      barrage.init({})
      barrage.draw(videoCTime)
      if (barrage.disabled) {
        disableKeys.unshift(+key)
      }
    }
    disableKeys.forEach((key) => {
      this.runningDanmakus.splice(key, 1)
    })
  }
  // 绘制第一帧的弹幕，在时间变动时需要用的
  drawInSeek() {
    console.log('drawInSeek')
    const offsetStartTime = 10

    const videoCTime = this.media.currentTime
    const dansToDraw: Danmaku[] = []
    const rightDans: Danmaku[] = []
    const topDans: Danmaku[] = []
    // 在这个now ~ now - 30s范围前面的弹幕全部disabled
    // 现在把barrage.draw里的init没有传入time了，导致了seek后没有正确的moveX
    const beforeOffsetTimeDans: Danmaku[] = []
    for (const barrage of this.danmakus) {
      if (barrage.startTime > videoCTime) break
      if (barrage.startTime > videoCTime - offsetStartTime) {
        if (barrage.type === 'right') rightDans.push(barrage)
        if (barrage.type === 'top') topDans.push(barrage)
        dansToDraw.push(barrage)
      } else {
        beforeOffsetTimeDans.push(barrage)
      }
    }
    dansToDraw.forEach((b) => {
      b.init({ initTime: videoCTime })
    })
    rightDans.forEach((b) => {
      b.disabled = false
    })
    beforeOffsetTimeDans.forEach((b) => {
      b.disabled = true
    })

    this.tunnelManager.resetTunnelsMap()
    // 这里只计算type:right的弹幕位置
    const rightDanOccupyWidthMap: Record<number, number> = {}
    for (const danmaku of rightDans) {
      const startX = this.container.clientWidth - danmaku.moveX,
        occupyRight = startX + danmaku.width
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
      // 这里是渲染时就在屏幕外，就站一个tunnel通道
      if (occupyRight >= this.container.clientWidth) {
        this.tunnelManager.tunnelsMap.right[toTunnel] = danmaku
      }
      danmaku.tunnel = toTunnel
      danmaku.y =
        (danmaku.tunnel + 1) * this.fontSize + danmaku.tunnel * this.gap
      danmaku.draw(videoCTime)
    }
    let topTunnel = 0
    const top: Danmaku[] = []
    for (const danmaku of topDans) {
      if (
        danmaku.endTime &&
        (videoCTime < danmaku.startTime || videoCTime > danmaku.endTime)
      ) {
        danmaku.disabled = true
        continue
      }
      if (danmaku.disabled) continue
      top[topTunnel] = danmaku
      danmaku.tunnel = topTunnel
      danmaku.y =
        (danmaku.tunnel + 1) * this.fontSize + danmaku.tunnel * this.gap
      danmaku.draw(videoCTime)
      topTunnel++
    }
    this.tunnelManager.tunnelsMap.top = top
  }
}
