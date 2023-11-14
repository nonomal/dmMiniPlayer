import { runCodeInTopWindow } from '@root/inject/contentSender'
import events from 'events'
import HUYA from './lib/HUYA'
import Taf from './lib/Taf'
import TafMx from './lib/TafMx'
const ws = WebSocket

class HuyaDanmu extends events {
  constructor(config) {
    super()
    this.config = {
      roomid: '',
      subsid: '',
      topsid: '',
      yyuid: '',
      sHuYaUA: 'webh5&2106011457&websocket',
      wsApi: 'wss://cdnws.api.huya.com',
      heartbeatTime: 60,
      timeout: 60,
      cookies: '',
      ...config,
    }
    this._info = {
      presenterUid: '',
      lChannelId: '',
      lSubChannelId: '',
      yyuid: '',
      sGuid: '',
    }
    this.heartbeatTimer = null
    this._client = null
    this._gift_info = {}

    config.onChat && this.on('onChat', config.onChat)
    config.onGift && this.on('onGift', config.onGift)
    config.onError && this.on('onError', config.onError)
  }

  _get_user_id() {
    var user = new HUYA.UserId()
    user.sHuYaUA = this.config.sHuYaUA
    user.lUid = this._info.presenterUid
    user.sCookie = this.config.cookies
    user.sGuid = this._info.sGuid
    user.sToken = ''
    return user
  }

  async _get_room_info() {
    const info = await runCodeInTopWindow(function () {
      let info = {}
      try {
        info.presenterUid = +hyPlayerConfig.stream.data[0].gameLiveInfo.uid
        info.lChannelId =
          +hyPlayerConfig.stream.data[0].gameStreamInfoList[0].lChannelId
        info.lSubChannelId =
          +hyPlayerConfig.stream.data[0].gameStreamInfoList[0].lSubChannelId
        info.yyuid = +hyPlayerConfig.stream.data[0].gameLiveInfo.yyid
        info.sGuid = ''
      } catch (error) {
        return null
      }
      return info
    })
    console.log('!!! info', info)
    if (info) {
      return info
    } else {
      this.emit('onError', {
        type: 0,
        error: `获取房间${this.config.roomid}信息失败`,
      })
      return
    }
  }

  /** 获取礼物清单 */
  _get_gift() {
    let prop_req = new HUYA.GetPropsListReq()
    prop_req.tUserId = this._get_user_id()
    prop_req.iTemplateType = HUYA.EClientTemplateType.TPL_MIRROR
    this._send_wup('PropsUIServer', 'getPropsList', prop_req)
  }

  /** 注册弹幕 */
  _get_chat() {
    let req = new HUYA.WSRegisterGroupReq()
    req.vGroupId.value.push('live:' + this._info.presenterUid)
    req.vGroupId.value.push('chat:' + this._info.presenterUid)
    let stream = new Taf.JceOutputStream()
    req.writeTo(stream)
    let webCommand = new HUYA.WebSocketCommand()
    webCommand.iCmdType = HUYA.EWebSocketCommandType.EWSCmdC2S_RegisterGroupReq
    webCommand.vData = stream.getBinBuffer()
    stream = new Taf.JceOutputStream()
    webCommand.writeTo(stream)
    this._sendMsg(stream.getBuffer())
  }

  /** 心跳 */
  _heartbeat() {
    let heart_beat_req = new HUYA.UserHeartBeatReq()
    heart_beat_req.tId = this._get_user_id()
    heart_beat_req.lTid = this._info.lChannelId
    heart_beat_req.lSid = this._info.lSubChannelId
    heart_beat_req.lPid = this._info.yyuid
    heart_beat_req.eLineType = 1
    heart_beat_req.lShortTid = 0
    heart_beat_req.bWatchVideo = true
    heart_beat_req.eLineType = HUYA.EStreamLineType.STREAM_LINE_AL
    heart_beat_req.iFps = 0
    heart_beat_req.iAttendee = 0
    heart_beat_req.iLastHeartElapseTime = 0
    this._send_wup('onlineui', 'OnUserHeartBeat', heart_beat_req)
  }

  _send_wup(servant, func, req) {
    try {
      var wup = new Taf.Wup()
      wup.setServant(servant)
      wup.setFunc(func)
      wup.writeStruct('tReq', req)
      var webCommand = new HUYA.WebSocketCommand()
      webCommand.iCmdType = HUYA.EWebSocketCommandType.EWSCmd_WupReq
      webCommand.vData = wup.encode()
      var jceStream = new Taf.JceOutputStream()
      webCommand.writeTo(jceStream)
      this._sendMsg(jceStream.getBuffer())
    } catch (err) {
      this.emit('onError', {
        type: 2,
        error: err,
      })
    }
  }

  _sendMsg(message) {
    this._client.send(message)
  }

  _on_message(message) {
    try {
      var buffer = new Uint8Array(message).buffer
      var from = new Taf.JceInputStream(buffer)
      var webSocketCOmmand = new HUYA.WebSocketCommand()
      webSocketCOmmand.readFrom(from)
      switch (webSocketCOmmand.iCmdType) {
        case HUYA.EWebSocketCommandType.EWSCmd_WupRsp: // 回调
          try {
            let wup = new Taf.Wup()
            wup.decode(webSocketCOmmand.vData.buffer)
            let map = new TafMx.WupMapping[wup.sFuncName]()
            wup.readStruct('tRsp', map, TafMx.WupMapping[wup.sFuncName])
            this.emit(wup.sFuncName, map)
          } catch (e) {
            console.log(e)
          }
          break
        case HUYA.EWebSocketCommandType.EWSCmdS2C_MsgPushReq: // 系统下发
          from = new Taf.JceInputStream(webSocketCOmmand.vData.buffer)
          var pushMessage = new HUYA.WSPushMessage()
          pushMessage.readFrom(from)
          var mcs = pushMessage.iUri
          from = new Taf.JceInputStream(pushMessage.sMsg.buffer)
          var uriMapping = TafMx.UriMapping[pushMessage.iUri]
          if (uriMapping) {
            var msg = new uriMapping()
            msg.readFrom(from)
            console.log('msg', msg)
            if (mcs == 1400) {
              const color = msg.tBulletFormat.iFontColor
              // 弹幕
              this.emit('onChat', {
                room_id: this.config.roomid,
                timestamp: new Date().getTime() + '',
                uid: msg.tUserInfo.lUid + '',
                nickName: msg.tUserInfo.sNickName,
                txt: msg.sContent,
                color: color == -1 ? '#fff' : '#' + color.toString(16),
              })
            }
            if (mcs == 6501 || mcs == 6502 || mcs == 6507) {
              let gift = this._gift_info[msg.iItemType + ''] || { price: 0 }
              this.emit('onGift', {
                room_id: this.config.roomid,
                timestamp: new Date().getTime() + '',
                uid: msg.lSenderUid + '',
                nickName: msg.sSenderNick,
                type: mcs,
                gfid: msg.iItemType,
                gfcnt: msg.iItemCount,
                gift_name: gift.name,
                gift_icon: gift.icon,
                price_big: gift.price,
                price_total: msg.iItemCount * gift.price,
              })
            }
          }
          break
        default:
          break
      }
    } catch (e) {
      this.emit('onError', {
        type: 1,
        error: e,
      })
    }
  }

  _start_ws() {
    this._client = new ws(this.config.wsApi)

    this._client.addEventListener('open', () => {
      console.log('[ws open]')
      this._get_gift()
      this._get_chat()
      this._heartbeat()
      this.heartbeatTimer = setInterval(
        this._heartbeat.bind(this),
        this.config.heartbeatTime * 1000
      )
    })

    this._client.addEventListener('message', this._on_message.bind(this))
    this._client.addEventListener('close', () => {
      this.emit('onError', {
        type: 1,
        error: this.config.roomid + 'websocket断开',
      })
    })

    this.on('getPropsList', (msg) => {
      msg.vPropsItemList.value.forEach((item) => {
        let name = item.sPropsName,
          icon = ''
        try {
          name = item.vPropView.value[0].name
          icon = item.vPropsIdentity.value[0].sPropsWeb.split('&')[0]
          this._gift_info[item.iPropsId + ''] = {
            name: item.vPropView.value[0].name,
            price: item.iPropsYb / 100,
            icon,
          }
        } catch (e) {
          //
        }
      })
    })
  }

  async start() {
    this._info = await this._get_room_info()
    this._start_ws()
  }
}

export default HuyaDanmu
