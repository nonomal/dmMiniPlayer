import BarrageClient from '@root/core/danmaku/BarrageClient'
import Client from './entry'

type ClientMsg = {
  room_id: string
  timestamp: string
  uid: string
  nickName: string
  txt: string
  color: string
}

export default class HuyaLiveBarrageClient extends BarrageClient {
  client: any
  constructor(public id: string | number) {
    super()
    // TODO ? 断线重连
    this.client = new Client({
      roomid: id,
      onChat: (msg: ClientMsg) => {
        console.log('[onChat msg]', msg)
        this.emit('danmu', {
          color: msg.color || '#fff',
          text: msg.txt,
        })
      },
    })
    this.client.start()
  }
  close(): void {
    this.client._client.close()
  }
}
