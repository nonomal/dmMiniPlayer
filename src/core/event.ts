export type WebPlayerEvent = {
  // [k in `wp:${keyof HTMLVideoElementEventMap}`]: void
}
export type CanvasPlayerEvent = {
  // [k in `cp:${keyof HTMLVideoElementEventMap}`]: void
}

export type VideoPlayerEvent = {
  [k in `vp:${keyof HTMLVideoElementEventMap}`]: void
}
export type NativeCustomEvent = {
  /**关闭PIP窗口时 */
  PIPClose: { time: number }
  PIPOpen: void
  play: void
  pause: void
  seek: void
}

export type PlayerEvents = NativeCustomEvent & VideoPlayerEvent
