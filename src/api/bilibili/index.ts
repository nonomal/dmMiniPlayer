import { MomentType, type BiliLiteItem } from './type'

const API_bilibili = {
  async getMomentsVideos(
    /**用户的id */
    uid: string,
    /**传入视频的dynamic_id_str*/
    offset?: string
  ): Promise<BiliLiteItem> {
    const url = offset
      ? 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_history'
      : 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/dynamic_new'
    const queryMap = new URLSearchParams()
    queryMap.set('uid', uid)
    queryMap.set('type_list', [MomentType.Video, MomentType.Bangumi].toString())
    if (offset) {
      queryMap.set('offset_dynamic_id', offset)
    }

    const res = await fetch(url + '?' + queryMap.toString(), {
      credentials: 'include',
    }).then((res) => res.json())

    return res.data.cards.map((card: any) => {
      const cardInfo = JSON.parse(card.card)
      return {
        offset_dynamic_id: card.desc.dynamic_id,
        bid: card.desc.bvid,
        cover: cardInfo.pic,
        title: cardInfo.title,
      } as BiliLiteItem
    })
  },
}

export default API_bilibili
