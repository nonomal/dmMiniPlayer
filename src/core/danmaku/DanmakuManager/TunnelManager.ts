import DanmakuManager from '.'
import Danmaku from './Danmaku'
import { DanmakuMoveType } from './types'

export default class TunnelManager {
  tunnelsMap: { [key in DanmakuMoveType]: Danmaku[] }
  maxTunnel = 100
  observerMap = new Map<HTMLSpanElement, Danmaku>()
  observer = new IntersectionObserver((entries) => {
    // 监听danmaku后面那个span进入页面，然后触发onDanmakuOutTunnel
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const target = entry.target as HTMLSpanElement
      const danmaku = this.observerMap.get(target)
      if (danmaku) {
        this.onMovingDanmakuOutTunnel(danmaku)
      } else {
        console.error('发现不存在observerMap但在监听的danmaku', target)
      }
    })
  })

  constructor(public danmakuManager: DanmakuManager) {}

  observeMovingDanmakuOutTunnel(danmaku: Danmaku) {
    // 只监听会动的弹幕，其他不需要
    if (danmaku.type != 'right') return
    this.observerMap.set(danmaku.outTunnelObserveEl, danmaku)
    this.observer.observe(danmaku.outTunnelObserveEl)
  }
  onMovingDanmakuOutTunnel(danmaku: Danmaku) {
    this.observer.unobserve(danmaku.outTunnelObserveEl)
    this.observerMap.delete(danmaku.outTunnelObserveEl)
    danmaku.outTunnel = true
    if (this.popTunnel(danmaku)) {
      // ? 这里要不要从穿个参数表示是旧的observer的
      danmaku.danmakuManager.emit('danmaku-leaveTunnel', danmaku)
    }
  }

  private _getTunnel(danmaku: Danmaku) {
    const type = danmaku.type
    // 先找有没有空位
    const emptyIndex = this.tunnelsMap[type].findIndex((v) => !v)
    if (emptyIndex != -1) {
      this.tunnelsMap[type][emptyIndex] = danmaku
      return emptyIndex > this.maxTunnel ? -1 : emptyIndex
    }
    // 检查是否到最大限制
    if (this.tunnelsMap[type].length > this.maxTunnel) {
      return -1
    }
    // 没有空位就创建一个新的位置
    this.tunnelsMap[type].push(danmaku)
    return this.tunnelsMap[type].length - 1
  }
  getTunnel(danmaku: Danmaku) {
    const type = danmaku.type
    const rsTunnel = this._getTunnel(danmaku)
    if (rsTunnel != -1) {
      this.observeMovingDanmakuOutTunnel(danmaku)
    }
    return rsTunnel
  }
  /**@deprecated */
  pushTunnel(danmaku: Danmaku) {
    const type = danmaku.type
    const emptyIndex = this.tunnelsMap[type].findIndex((v) => !v)
    if (emptyIndex != -1) {
      this.tunnelsMap[type][emptyIndex] = danmaku
      return
    }
    this.tunnelsMap[type].push(danmaku)
  }
  popTunnel(danmaku: Danmaku) {
    const { type, tunnel } = danmaku
    // 解决resize时的问题
    // ! 可能容易出问题这里
    // if (danmaku != this.tunnelsMap[type][tunnel]) return false
    this.tunnelsMap[type][tunnel] = null
    return true
  }

  resetTunnelsMap() {
    this.tunnelsMap = {
      bottom: [],
      right: [],
      top: [],
    }
  }

  unload() {
    this.observer.disconnect()
    this.observerMap.clear()
    this.resetTunnelsMap()
  }
}
