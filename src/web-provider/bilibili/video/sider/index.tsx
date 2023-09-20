import type DocMiniPlayer from '@root/core/DocMiniPlayer'
import { onMessage, offMessage } from '@root/inject/contentSender'
import { dq } from '@root/utils'
import classNames from 'classnames'
import { useState, useRef, useEffect } from 'react'

export function initSideActionAreaRender(miniPlayer: DocMiniPlayer) {
  const videoPElList = dq('.video-episode-card')
  function Side() {
    console.log('render')
    let [active, setActive] = useState(
      videoPElList.findIndex((el) =>
        el.querySelector('.video-episode-card__info-playing')
      )
    )
    const scrollContainerRef = useRef<HTMLDivElement>(),
      activeElRef = useRef<HTMLLIElement>()

    useEffect(() => {
      const handleLocationChange = (data: any): any => {
        if (data?.event != 'history') return null
        setActive(
          videoPElList.findIndex((el) =>
            el.querySelector('.video-episode-card__info-playing')
          )
        )
      }

      onMessage('inject-api:onTrigger', handleLocationChange)
      window.addEventListener('popstate', handleLocationChange)

      return () => {
        offMessage('inject-api:onTrigger', handleLocationChange)
        window.removeEventListener('popstate', handleLocationChange)
      }
    }, [])

    // useEffect(() => {
    //   if (!activeElRef.current) return
    //   // TODO 可能是被style影响到了，进来时scrollContainerRef.current.clientHeight = 0，没法赋值scrollTop
    //   setTimeout(() => {
    //     scrollContainerRef.current.scrollTop = activeElRef.current.offsetTop
    //     console.log(
    //       'activeElRef.current',
    //       activeElRef.current,
    //       activeElRef.current.offsetTop,
    //       scrollContainerRef.current,
    //       scrollContainerRef.current.scrollTop,
    //       scrollContainerRef.current.clientHeight
    //     )
    //   }, 0)
    // }, [activeElRef.current])

    return (
      <div className="side-outer-container">
        {/* TODO 侧边栏提示 */}
        <div ref={scrollContainerRef} className="side-inner-container">
          {videoPElList.length && (
            <>
              <h3>视频分P</h3>
              <ul className="select-list">
                {videoPElList.map((el: HTMLElement, i) => (
                  <li
                    className={classNames('select', active == i && 'active')}
                    key={i}
                    onClick={() => {
                      el.click()
                      setActive(i)
                    }}
                    ref={active == i ? activeElRef : undefined}
                  >
                    {el.querySelector('.video-episode-card__info-title')
                      ?.textContent ?? el.textContent}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>其他视频</h3>
        </div>
      </div>
    )
  }

  miniPlayer.renderSideActionArea = () => <Side />
}
