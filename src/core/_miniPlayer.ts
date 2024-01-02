import type DanmakuController from '@root/core/danmaku/DanmakuController'
import videoRender from '@root/store/videoRender'
import { createElement, throttle } from '@root/utils'
import Events2 from '@root/utils/Events2'
import { checkIsLive } from '@root/utils/video'
import { autorun } from 'mobx'
import configStore from '../store/config'
import type { Props as BarrageSenderProps } from './danmaku/BarrageSender'
import { type PlayerEvents } from './event'

export type MiniPlayerSetupProps = {
  videoEl: HTMLVideoElement
}

export default class MiniPlayer {
  // 网页的video播放器
  webPlayerVideoEl: HTMLVideoElement

  /**
   * canvas的播放器
   *
   * canvas的captureStream放在这里播放 */
  canvasPlayerVideoEl: HTMLVideoElement

  // 弹幕器
  danmakuController: DanmakuController

  // canvas相关
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  animationFrameSignal: number

  /**canvas的captureStream */
  // @onceCallGet
  get canvasVideoStream() {
    return this.canvas.captureStream()
  }

  private eventHandler = new Events2<PlayerEvents>()

  get isPause() {
    return this.webPlayerVideoEl.paused
  }
  isLive = false
  get vpCurrentTime() {
    return this.webPlayerVideoEl.currentTime
  }

  private fpsInterval = 0
  constructor() {
    autorun(() => {
      this.fpsInterval = 1000 / configStore.renderFPS
    })
  }

  /**必须初始化调用，也可以用来更新新的videoEl */
  setup(props: MiniPlayerSetupProps) {
    if (this.webPlayerVideoEl) {
      this.offAllVideoPlayerEvents()
    }
    this.webPlayerVideoEl = props.videoEl
    if (!this.canvasPlayerVideoEl) {
      this.canvasPlayerVideoEl = createElement('video')
      this.canvas = createElement('canvas')
      this.ctx = this.canvas.getContext('2d')
    }
    this.updateCanvasSize()
    this.on('vp:seeked', () => {
      this.danmakuController.reset()
      this.hasSeek = true
    })
    this.on('vp:loadedmetadata', () => {
      this.updateCanvasSize()
    })
  }
  openPlayer() {
    this.emit('PIPOpen')
    this.startRenderAsCanvas()
    this.startPIPPlay()
    this.once('PIPClose', () => {
      this.stopRenderAsCanvas()
      if (configStore.pauseInClose_video) {
        const video = this.webPlayerVideoEl
        const isLive = checkIsLive(video)
        if (configStore.pauseInClose_live || !isLive) {
          this.webPlayerVideoEl.pause()
        }
      }
    })
  }

  appendToEl(el: HTMLElement) {
    this.startRenderAsCanvas()
    el.appendChild(this.canvasPlayerVideoEl)
  }
  removeFromEl(el: HTMLElement) {
    this.stopRenderAsCanvas()
    el.removeChild(this.canvasPlayerVideoEl)
  }

  updateCanvasSize(force?: { width: number; height: number }) {
    videoRender.updateSize(this.webPlayerVideoEl, force)
    this.canvas.width = videoRender.containerWidth
    this.canvas.height = videoRender.containerHeight
  }

  // 在挂载在DOM时使用，减少性能消耗
  startRenderAsCanvas() {
    try {
      this.animationFrameSignal = requestAnimationFrame(() =>
        this.canvasUpdate()
      )
      return true
    } catch (error) {
      console.error('启动startRenderAsCanvas错误', error)
      return false
    }
  }

  // 在从DOM卸载时使用，减少性能消耗
  stopRenderAsCanvas() {
    cancelAnimationFrame(this.animationFrameSignal)
    this.animationFrameSignal = null
  }

  protected withoutLimitLastUpdateTime = Date.now()
  withoutLimitAnimaFPS = 0
  // 进入pip时渲染第一帧画面
  protected hansDraw = false
  canvasUpdate(force = false) {
    if (force || (configStore.renderFPS != 0 ? this.checkFPSLimit() : true)) {
      const videoEl = this.webPlayerVideoEl

      if (force || !this.isPause || !this.hansDraw) {
        this.hansDraw = true
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.drawImage(
          videoEl,
          videoRender.x,
          videoRender.y,
          videoRender.videoWidth,
          videoRender.videoHeight
        )
        this.detectFPS()
        this.renderDanmu()
        if (configStore.performanceInfo) {
          this.renderPerformanceInfo()
        }
      }
    }
    if (force) return

    const now = Date.now()
    this.performanceInfoLimit(() => {
      const offset = now - this.withoutLimitLastUpdateTime
      this.withoutLimitAnimaFPS = ~~(1000 / offset)
    })
    this.withoutLimitLastUpdateTime = now

    this.inUpdateFrame = false
    this.animationFrameSignal = requestAnimationFrame(() => this.canvasUpdate())

    this.renderVideoProgress()
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  hasSeek = true
  renderDanmu() {
    if (this.hasSeek) {
      this.danmakuController.drawInSeek(this.vpCurrentTime)
      this.hasSeek = false
      return
    }
    this.danmakuController.draw(this.vpCurrentTime)
  }

  protected startPIPPlay() {
    if (!this.canvasPlayerVideoEl.srcObject) {
      this.canvasPlayerVideoEl.srcObject = this.canvasVideoStream

      this.canvasPlayerVideoEl.addEventListener('loadedmetadata', () => {
        this.canvasPlayerVideoEl.play()
        this.requestPIP()
        this.canvasPlayerVideoEl.addEventListener(
          'leavepictureinpicture',
          () => {
            this.emit('PIPClose')
            this.emit('PIPOpen')
          }
        )
      })
    } else {
      this.requestPIP()
    }
  }

  protected requestPIP() {
    this.canvasPlayerVideoEl.requestPictureInPicture().then((pipWindow) => {
      let onResize = () => {
        this.updateCanvasSize({
          width: pipWindow.width,
          height: pipWindow.height,
        })
      }
      onResize()
      pipWindow.addEventListener('resize', throttle(onResize, 500))
    })
  }

  // FIXME 限制的FPS跟实际显示FPS对不上
  private lastUpdateTime = Date.now()
  /**设置FPS限制canvasUpdate的requestAnimationFrame下的draw update触发间隔 */
  animaFPS = 0
  checkFPSLimit() {
    const now = Date.now()
    const offset = now - this.lastUpdateTime
    if (offset > this.fpsInterval) {
      this.performanceInfoLimit(() => {
        this.animaFPS = ~~(1000 / offset)
      })

      if (configStore.FPS_limitOffsetAccurate) {
        this.lastUpdateTime = now
      } else {
        this.lastUpdateTime = now - (offset % this.fpsInterval) /* now */
      }
      return true
    }
    return false
  }

  // TODO 检测视频FPS
  // TODO video seek时lastTime = 0
  private lastTime = 0
  private lastVideo = ''
  /**video的渲染间隔时间计算出的FPS */
  animaVideoFPS = 0

  detectFPS() {
    let nowTime = this.webPlayerVideoEl.currentTime

    this.performanceInfoLimit(() => {
      if (this.lastTime) this.animaVideoFPS = ~~(1 / (nowTime - this.lastTime))
    })

    // const quality = 0.1
    // this.canvas.toDataURL('image/png', quality)

    this.lastTime = nowTime
  }

  updateFrame = 0
  inUpdateFrame = false
  performanceInfoLimit(cb: () => void) {
    if (
      this.updateFrame++ >= configStore.performanceUpdateFrame &&
      !this.inUpdateFrame
    ) {
      this.inUpdateFrame = true
    }

    if (this.inUpdateFrame) {
      cb()
      this.updateFrame = 0
    }
  }

  renderPerformanceInfo() {
    const padding = 4,
      fontSize = 14
    let renderStartY = videoRender.containerHeight + fontSize

    let getY = () => {
      renderStartY = renderStartY - padding - fontSize
      return renderStartY
    }
    let ctx = this.ctx
    ctx.fillStyle = '#fff'
    ctx.font = `600 ${fontSize}px ${configStore.fontFamily}`
    ctx.fillText(`浏览器最大FPS:${this.withoutLimitAnimaFPS}`, padding, getY())
    // ctx.fillText(`animaVideoFPS:${this.animaVideoFPS}`, padding, getY())
    ctx.fillText(`运行中FPS:${this.animaFPS}`, padding, getY())
  }

  renderVideoProgress() {
    if (
      !(
        configStore.videoProgress_show &&
        this.webPlayerVideoEl.duration &&
        checkIsLive(this.webPlayerVideoEl)
      )
    )
      return
    let ctx = this.ctx
    let video = this.webPlayerVideoEl
    const height = configStore.videoProgress_height,
      width = (video.currentTime / video.duration) * videoRender.containerWidth
    ctx.fillStyle = configStore.videoProgress_color
    ctx.fillRect(0, videoRender.containerHeight - height, width, height)
  }

  private webVpEvents: Record<string, () => void> = {}
  /**
   * on('vp:event')用来挂载视频事件，必须用这个挂载事件
   */
  on: typeof this.eventHandler.on = (key, handle) => {
    // 顺便在webVideo上挂载事件
    if (key.startsWith('vp:') && !this.webVpEvents[key]) {
      this.webVpEvents[key] = () => this.emit(key)
      this.webPlayerVideoEl.addEventListener(
        key.replace('vp:', ''),
        this.webVpEvents[key]
      )
    }
    return this.eventHandler.on(key, handle)
  }
  once: typeof this.eventHandler.once = (key, handle) => {
    // 顺便在webVideo上挂载事件
    if (key.startsWith('vp:') && !this.webVpEvents[key]) {
      this.webVpEvents[key] = () => this.emit(key)
      this.webPlayerVideoEl.addEventListener(
        key.replace('vp:', ''),
        this.webVpEvents[key]
      )
    }
    return this.eventHandler.once(key, handle)
  }
  off = this.eventHandler.off
  emit = this.eventHandler.emit
  get eventAll() {
    return this.eventHandler.eventNames()
  }
  /**清除webVideo的所有在这里挂载的事件 */
  offAllVideoPlayerEvents() {
    ;[...this.eventAll].forEach((key) => {
      if (!key.startsWith('vp:')) return
      this.off(key)
      this.webPlayerVideoEl.removeEventListener(
        key.replace('vp:', ''),
        this.webVpEvents[key]
      )
    })
    this.webVpEvents = {}
  }

  initBarrageSender(props: Omit<BarrageSenderProps, 'textInput'>) {}
}
