import SubtitleManager from '@root/core/SubtitleManager'
import VideoChanger from '@root/core/VideoChanger'
import { WebProvider } from '@root/core/WebProvider'
import DanmakuManager from '@root/core/danmaku/DanmakuManager'
import BilibiliSubtitleManager from './SubtitleManager'
import { getBiliBiliVideoDanmu } from '@root/danmaku/bilibili/videoBarrageClient/bilibili-api'
import { getBv, getPid, getVideoInfo } from '../utils'
import MiniPlayer from '@root/core/MiniPlayer/MiniPlayer'

export default class NewBilibiliVideoProvider extends WebProvider {
  protected miniPlayer: MiniPlayer

  onInit(): Partial<{
    videoChanger: VideoChanger
    subtitleManager: SubtitleManager
    danmakuManager: DanmakuManager
  }> {
    const danmakuManager = new DanmakuManager()

    ;(async () => {
      const { aid, cid } = await getVideoInfo(getBv(), getPid())
      const danmakus = await getBiliBiliVideoDanmu(cid)
      danmakuManager.addDanmakus(danmakus)
    })()

    return {
      danmakuManager,
      subtitleManager: new BilibiliSubtitleManager(),
    }
  }
}
