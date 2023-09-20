import { sendMessage, onMessage } from '@root/inject/contentSender'
import { windowsOnceCall } from '@root/utils/decorator'
import WebProvider from './webProvider'
import { dq, dq1, wait } from '@root/utils'
import DocMiniPlayer from '@root/core/DocMiniPlayer'
import VideoChanger from '@root/core/VideoChanger'
import classNames from 'classnames'
import { useState, useRef } from 'react'

export default class DdrkProvider extends WebProvider {
  inPIPPlayMode = false
  constructor() {
    super()
    this.injectHistoryChange()
  }
  protected async initMiniPlayer(
    options?: Partial<{ videoEl: HTMLVideoElement }>
  ) {
    const miniPlayer = await super.initMiniPlayer(options)

    this.miniPlayer = miniPlayer
    miniPlayer.on('PIPOpen', () => {
      this.inPIPPlayMode = true
    })
    miniPlayer.on('PIPClose', () => {
      this.inPIPPlayMode = false
      this.miniPlayer.webPlayerVideoEl.pause()
    })

    if (miniPlayer instanceof DocMiniPlayer) {
      this.initSideActionAreaRender(miniPlayer)
    }

    return miniPlayer
  }

  @windowsOnceCall('ddrk_history')
  injectHistoryChange() {
    sendMessage('inject-api:run', {
      origin: 'history',
      keys: ['pushState', 'forward', 'replaceState'],
      onTriggerEvent: 'history',
    })
    onMessage('inject-api:onTrigger', (data) => {
      if (data.event != 'history') return null
      console.log('切换了路由 history')
      if (this.inPIPPlayMode) {
        this.clickButtonToAppendSrcInVideoTag()
      }
    })
    window.addEventListener('popstate', () => {
      console.log('切换了路由 popstate')
      if (this.inPIPPlayMode) {
        this.clickButtonToAppendSrcInVideoTag()
      }
    })
  }

  clickButtonToAppendSrcInVideoTag() {
    wait(500).then(() => {
      const btn = dq1('.vjs-big-play-button')
      if (!btn) throw new Error('没有找到按钮')
      btn?.click?.()
    })
  }

  initSideActionAreaRender(miniPlayer: DocMiniPlayer) {
    // const videoChanger = new VideoChanger(this)

    function Side() {
      const videoPElList = dq('.wp-playlist-item')
      let [active, setActive] = useState(
        videoPElList.findIndex((el) =>
          el.classList.contains('wp-playlist-playing')
        )
      )
      const scrollContainerRef = useRef<HTMLDivElement>(),
        activeElRef = useRef<HTMLLIElement>()

      return (
        <div className="side-outer-container">
          {/* TODO 侧边栏提示 */}
          <div ref={scrollContainerRef} className="side-inner-container">
            {videoPElList.length ? (
              <>
                <h3>视频分P</h3>
                <ul className="select-list">
                  {videoPElList.map((el, i) => (
                    <li
                      className={classNames('select', active == i && 'active')}
                      key={i}
                      onClick={() => {
                        el.click()
                        // data.link
                        setActive(i)
                      }}
                      ref={active == i ? activeElRef : undefined}
                    >
                      {el.textContent}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <h3>没有视频列表呢</h3>
            )}
          </div>
        </div>
      )
    }

    miniPlayer.renderSideActionArea = () => <Side />
  }
}
