import { addEventListener, createElement, getTextWidth } from '@root/utils'
import { DanmakuInitData, DanmakuMoveType } from './types'
import { v1 as uuid } from 'uuid'
import DanmakuManager from '.'
import classNames from 'classnames'

IntersectionObserver
type InitProps = {
  initTime?: number
}
export default class Danmaku implements DanmakuInitData {
  id: string
  color: string
  text: string
  time: number
  type: DanmakuMoveType
  width: number
  tunnel: number
  /**实际init的time，用来video seek用的 */
  initTime: number

  initd = false
  outTunnel = false

  disabled = false

  get speed() {
    return this.danmakuManager.speed
  }

  get container() {
    return this.danmakuManager.container
  }
  // 弹幕el: text_<s></s>
  // 通过用IntersectionObserver监听<s>是否enter或leave，占领/释放弹幕tunnel
  // TODO 还需要解决缩放后一个tunnel还有2个以上变化到leave，第一个enter并leave，那第二个会跟新danmakus冲突的情况
  el: HTMLElement
  /**给tunnelManager监听 */
  outTunnelObserveEl: HTMLSpanElement

  danmakuManager: DanmakuManager

  constructor(
    props: DanmakuInitData & {
      danmakuManager: DanmakuManager
    }
  ) {
    props.id = props.id || uuid()
    Object.assign(this, props)

    this.outTunnelObserveEl = createElement('span')
    this.el = createElement('div', {
      className: `danmaku-item ${this.type}`,
      innerText: props.text,
      children: [this.outTunnelObserveEl],
    })
  }

  init(props: InitProps) {
    if (this.initd) return

    this.initTime = props.initTime || this.time

    this.tunnel = this.danmakuManager.tunnelManager.getTunnel(this)
    if (this.tunnel == -1) {
      this.disabled = true
      return
    }

    this.updateState()
    this.container.appendChild(this.el)

    this.danmakuManager.emit('danmaku-enter', this)
    this.bindEvent()
    this.initd = true
  }

  private unbindEvent = () => {}
  private bindEvent() {
    switch (this.type) {
      case 'right': {
        const unbind1 = addEventListener(this.el, (el) => {
          el.addEventListener('animationend', () => {
            this.danmakuManager.emit('danmaku-leave', this)
            this.onLeave()
          })
        })

        this.unbindEvent = () => {
          unbind1()
        }
        break
      }
      case 'bottom':
      case 'top': {
        // 只需要监听el的动画结束就行了
        const unbind1 = addEventListener(this.el, (el) => {
          el.addEventListener('animationend', () => {
            this.outTunnel = true
            // console.log('outTunnel', this)
            this.danmakuManager.emit('danmaku-leaveTunnel', this)
            this.danmakuManager.tunnelManager.popTunnel(this)
            this.danmakuManager.emit('danmaku-leave', this)
            this.onLeave()
          })
        })
        this.unbindEvent = () => {
          unbind1()
        }
      }
    }
  }

  updateState() {
    const w = getTextWidth(this.text, {
      fontSize: this.danmakuManager.fontSize + 'px',
      fontFamily: this.danmakuManager.fontFamily,
      fontWeight: this.danmakuManager.fontWeight,
    })
    this.width = w

    const cw = this.container.clientWidth
    const initTimeOffset = this.initTime - this.time

    let duration = this.danmakuManager.unmovingDanmakuSaveTime - initTimeOffset,
      offset = cw - initTimeOffset * this.speed,
      translateX = 0
    if (this.type == 'right') {
      duration = (offset + w) / this.speed
      translateX = (offset + w) * -1
    }

    // 设置el的property
    const propertyData = {
      color: this.color,
      // 对应的css var
      offset: offset + 'px',
      width: this.width + 'px',
      translateX: translateX + 'px',
      tunnel: this.tunnel,
      duration: duration + 's',
      fontSize: this.danmakuManager.fontSize + 'px',
      // offsetY:
      //   this.tunnel * this.danmakuManager.fontSize +
      //   this.tunnel * this.danmakuManager.gap,
    }
    Object.entries(propertyData).forEach(([key, val]) => {
      this.el.style.setProperty(`--${key}`, val + '')
    })
  }

  onLeave() {
    this.danmakuManager.emit('danmaku-leave', this)
    this.reset()
  }
  reset() {
    if (!this.initd) return
    this.initd = false
    this.outTunnel = false
    this.disabled = false
    this.unbindEvent()

    this.container.removeChild(this.el)
  }
}
