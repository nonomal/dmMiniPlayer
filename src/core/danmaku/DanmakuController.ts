import type MiniPlayer from '../_miniPlayer'

export type DanmakuControllerProps = {
  miniPlayer: MiniPlayer
}
export default abstract class DanmakuController {
  miniPlayer: MiniPlayer

  constructor(props: DanmakuControllerProps) {
    Object.assign(this, props)
  }
  abstract draw(time: number): void
  abstract drawInSeek(time: number): void
  abstract reset(): void
}
