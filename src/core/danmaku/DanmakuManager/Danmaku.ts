import { addEventListener, createElement, getTextWidth } from '@root/utils'
import { DanmakuInitData, DanmakuMoveType } from './types'
import { v1 as uuid } from 'uuid'
import DanmakuManager from '.'
import { logFn } from '@root/utils/decorator'

type InitProps = {}
export default class Danmaku implements DanmakuInitData {
  id: string
  color: string
  text: string
  time: number
  type: DanmakuMoveType
  width: number
  tunnel: number

  initd = false
  outTunnel = false

  disabled = false

  container: HTMLElement
  el = createElement('div', {
    className: 'danmaku-item',
  })
  calcEl = createElement('div', {
    className: 'danmaku-calc-item',
  })

  danmakuManager: DanmakuManager

  constructor(
    props: DanmakuInitData & {
      container: HTMLElement
      danmakuManager: DanmakuManager
    }
  ) {
    props.id = props.id || uuid()
    Object.assign(this, props)

    this.el.innerText = props.text
    this.el.classList.add(this.type)
    this.calcEl.innerText = props.text
  }

  init(props: InitProps) {
    if (this.initd) return
    this.tunnel = this.danmakuManager.getTunnel(this.type)
    this.container = this.danmakuManager.container

    this.updateState()
    this.container.appendChild(this.el)
    this.container.appendChild(this.calcEl)

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
        const unbind2 = addEventListener(this.calcEl, (el) => {
          el.addEventListener('animationend', () => {
            this.outTunnel = true
            // console.log('outTunnel', this)
            this.danmakuManager.emit('danmaku-leaveTunnel', this)
            this.danmakuManager.popTunnel(this.type, this.tunnel)
          })
        })

        this.unbindEvent = () => {
          unbind1()
          unbind2()
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
            this.danmakuManager.popTunnel(this.type, this.tunnel)
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
      fontSize: this.danmakuManager.fontSize,
      fontFamily: this.danmakuManager.fontFamily,
      fontWeight: this.danmakuManager.fontWeight,
    })
    this.width = w

    const cw = this.container.clientWidth
    console.log('this.tunnel', this.tunnel)
    this.el.style.setProperty('--tunnel', this.tunnel + '')
    this.el.style.setProperty('--color', this.color)
    switch (this.type) {
      case 'right': {
        const t = (cw + w) / this.danmakuManager.speed
        const calcT = w / this.danmakuManager.speed

        this.el.style.setProperty('--nwidth', -1 * w + 'px')
        this.el.style.setProperty('--duration', t + 's')
        this.calcEl.style.setProperty('--width', w + 'px')
        this.calcEl.style.setProperty('--duration', calcT + 's')
        break
      }
      case 'bottom':
      case 'top': {
        this.el.style.setProperty(
          '--duration',
          this.danmakuManager.unmovingDanmakuSaveTime + 's'
        )
        break
      }
    }
  }

  onLeave() {
    this.danmakuManager.emit('danmaku-leave', this)
    this.resetState()
  }
  resetState() {
    this.initd = false
    this.outTunnel = false
    this.disabled = false
    this.unbindEvent()

    this.container.removeChild(this.el)
    this.container.removeChild(this.calcEl)
  }
}
