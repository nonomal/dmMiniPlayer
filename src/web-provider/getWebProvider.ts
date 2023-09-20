import AgemysProvider from './agemys'
import BilibiliLiveProvider from './bilibili/live'
import BilibiliVideoProvider from './bilibili/video'
import CCLiveProvider from './cc'
import CommonProvider from './common'
import DdrkProvider from './ddrk'
import DouyuLiveProvider from './douyu'
import WebProvider from './webProvider'

const providerList = [
  {
    reg: /https:\/\/www.bilibili.com\/video\/.*/,
    provider: BilibiliVideoProvider,
  },
  {
    reg: /https:\/\/live.bilibili.com\/.*/,
    provider: BilibiliLiveProvider,
  },
  {
    reg: /https:\/\/www\.douyu\.com\/.*/,
    provider: DouyuLiveProvider,
  },
  {
    reg: /https:\/\/cc\.163\.com\/.*/,
    provider: CCLiveProvider,
  },
  {
    reg: /https:\/\/ddys\.(art|pro)\/.*/,
    provider: DdrkProvider,
  },
  {
    reg: /https:\/\/www\.(agemys\.org)|(age\.tv)|(agefans\.com)\/.*/,
    provider: AgemysProvider,
  },
  {
    reg: /.*/,
    provider: CommonProvider,
  },
]

export default function getWebProvider<T extends WebProvider>(): T {
  let provider = providerList.find(({ provider, reg }) => {
    if (reg.test(location.href)) return provider
  })

  if (provider) return new provider.provider() as any
  return null
}
