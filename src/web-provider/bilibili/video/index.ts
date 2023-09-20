import DocMiniPlayer from '@root/core/DocMiniPlayer'
import type MiniPlayer from '@root/core/miniPlayer'
import type { DanType } from '@root/danmaku'
import { DanmakuStack } from '@root/danmaku/bilibili/barrageDownload/converter/danmaku-stack'
import { DanmakuType } from '@root/danmaku/bilibili/barrageDownload/converter/danmaku-type'
import {
  JsonDanmaku,
  getTextByType,
  type DanmakuDownloadType,
} from '@root/danmaku/bilibili/barrageDownload/download/utils'
import { onMessage, sendMessage } from '@root/inject/contentSender'
import configStore from '@root/store/config'
import { dq1 } from '@root/utils'
import AssParser from '@root/utils/AssParser'
import { windowsOnceCall } from '@root/utils/decorator'
import type { OrPromise } from '@root/utils/typeUtils'
import WebProvider from '../../webProvider'
import { initSideActionAreaRender } from './sider'

export default class BilibiliVideoProvider extends WebProvider {
  videoEl: HTMLVideoElement
  constructor() {
    super()

    // b站的字体
    configStore.fontFamily =
      'SimHei, "Microsoft JhengHei", Arial, Helvetica, sans-serif'

    this.bindPIPActions()
    this.injectHistoryChange()
  }
  @windowsOnceCall('bili_PIPActions')
  bindPIPActions() {
    console.log('bindPIPActions')
    // 这个pip的action按钮在频繁关闭开启中（多数1次）会全部消失，即使是默认b站自己注册的setActionHandler到后面也只剩播放暂停，可能是浏览器问题
    navigator.mediaSession.setActionHandler('pause', (e) => {
      this.videoEl.pause()
      this.miniPlayer.canvasPlayerVideoEl.pause()
      // navigator.mediaSession.playbackState = 'paused'
    })
    navigator.mediaSession.setActionHandler('play', () => {
      this.videoEl.play()
      this.miniPlayer.canvasPlayerVideoEl.play()
      // navigator.mediaSession.playbackState = 'playing'
    })
  }
  @windowsOnceCall('bili_history')
  injectHistoryChange() {
    sendMessage('inject-api:run', {
      origin: 'history',
      keys: ['pushState', 'forward', 'replaceState'],
      onTriggerEvent: 'history',
    })
    onMessage('inject-api:onTrigger', (data) => {
      if (data.event != 'history') return null
      console.log('切换了路由 history')
      if (this.miniPlayer) this.initDans()
    })
    window.addEventListener('popstate', () => {
      console.log('切换了路由 popstate')
      if (this.miniPlayer) this.initDans()
    })
  }

  protected getVideoEl(): OrPromise<HTMLVideoElement> {
    return document.querySelector('video')
  }

  protected async initMiniPlayer(
    options?: Partial<{ videoEl: HTMLVideoElement }>
  ): Promise<MiniPlayer> {
    const miniPlayer = await super.initMiniPlayer(options)
    this.videoEl = this.miniPlayer.webPlayerVideoEl

    if (miniPlayer instanceof DocMiniPlayer) {
      initSideActionAreaRender(miniPlayer)
    }
    this.miniPlayer.on('PIPClose', () => {
      this.videoEl.pause()
    })
    this.initDans()
    miniPlayer.initBarrageSender({
      webTextInput: dq1('.bpx-player-dm-input'),
      webSendButton: dq1('.bpx-player-dm-btn-send'),
    })
    return miniPlayer
  }

  initDans() {
    this.getDans().then((dans) =>
      this.miniPlayer.danmakuController.initDans(dans)
    )
  }
  async getDamuContent(
    bid: string,
    pid = 1,
    type: DanmakuDownloadType = 'ass'
  ): Promise<string> {
    let res = (
      await fetch(
        `https://api.bilibili.com/x/web-interface/view?bvid=${bid}`
      ).then((res) => res.json())
    ).data
    let { aid, cid, pages } = res

    if (pid != 1) {
      try {
        cid = pages[pid - 1].cid
      } catch (error) {
        console.error('出现了pid/pages不存在的问题', res, pid)
      }
    }

    console.log('视频cid', cid)

    return await getTextByType(type, { aid, cid })
  }

  transAssContentToDans(assContent: string): DanType[] {
    let parser = new AssParser(assContent)
    return parser.dans
  }

  transJsonContentToDans(jsonContent: string): DanType[] {
    let jsonArr = JSON.parse(jsonContent) as JsonDanmaku['jsonDanmakus']
    return jsonArr.map((d) => {
      let type = DanmakuStack.danmakuType[d.mode as DanmakuType]

      return {
        color: '#' + d.color.toString(16),
        text: d.content,
        time: d.progress ? d.progress / 1000 : 0,
        type: type == 'top' ? 'top' : 'right',
      } as DanType
    })
  }

  async getDans(): Promise<DanType[]> {
    let bv = location.pathname
        .split('/')
        .find((p) => /b/i.test(p[0]) && /v/i.test(p[1]))
        .replace(/bv/i, ''),
      pid = +new URLSearchParams(location.search).get('p') || 1
    console.log('视频bv+ pid', bv, pid)
    // TODO 先不要开启json模式，ass模式有过滤最大弹幕不知道怎么实现的
    let danmuContent = await this.getDamuContent(
      bv,
      pid,
      configStore.biliVideoPakkuFilter ? 'ass' : 'originJson'
    )

    if (configStore.biliVideoPakkuFilter) {
      return this.transAssContentToDans(danmuContent)
    } else {
      return this.transJsonContentToDans(danmuContent)
    }
  }
}
