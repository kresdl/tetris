/* eslint-disable semi */

import { State } from './types.js'
import { a, b, c, d, e, f, g } from './pieces.js'

const SCALE = 20
const WIDTH = 16
const HEIGHT = 32
const POINTS = [100, 250, 500, 1000]
const INTERVAL = 200

const pieces = [a, b, c, d, e, f, g]

let bitmaps: ImageBitmap[]

const game = document.getElementById('game') as HTMLCanvasElement
game.width = WIDTH * SCALE
game.height = HEIGHT * SCALE

const prev = document.getElementById('preview') as HTMLCanvasElement
prev.width = 4 * SCALE
prev.height = 4 * SCALE

const gfx = game.getContext('2d') as CanvasRenderingContext2D
const pgfx = prev.getContext('2d') as CanvasRenderingContext2D

const scoreEm = document.getElementById('score') as HTMLParagraphElement
scoreEm.innerText = '0'

const heap = new Uint8Array(WIDTH * HEIGHT);

const vec = (size: number, ori: number): number[] => {
  const rgt = size - 1
  const btm = size * (size - 1)

  return [
    [0, 1, size],
    [btm, -size, 1],
    [rgt + btm, -1, -size],
    [rgt, size, -1]
  ][ori]
}

const generatePiece = (): State => {
  const id = ~~(Math.random() * pieces.length)
  const size = pieces[id][0]

  return {
    x: ~~(Math.random() * (WIDTH - size + 1)),
    y: -2, ori: 0, id
  }
}

const scan = (top: number): number => {
  const cols = [...Array(WIDTH)].map((_, i) => i)
  const rows = [...Array(HEIGHT - top)].map((_, i) => i + top)

  const full = rows.find(row =>
    cols.every(col => heap[col + WIDTH * row])
  )

  if (!full) return 0
  heap.copyWithin(top * WIDTH, (top - 1) * WIDTH, full * WIDTH)

  const snap = gfx.getImageData(0, SCALE * (top - 1), SCALE * WIDTH, SCALE * (full - top + 1))
  gfx.putImageData(snap, 0, SCALE * top)

  return scan(top + 1) + 1
}

const insertPiece = (piece: State, top?: number | null): number | boolean => {
  const [size, pattern] = pieces[piece.id]
  const m = vec(size, piece.ori)

  for (let y = 0; y < size; y++) {
    const yc = piece.y + y

    for (let x = 0; x < size; x++) {
      const xc = piece.x + x,
        xy = xc + WIDTH * yc,
        uv = m[0] + x * m[1] + y * m[2],
        src = pattern[uv],
        outside = yc >= HEIGHT || xc < 0 || xc >= WIDTH

      if (top) {
        if (src && !outside && yc >= 0) {
          heap[xy] = 1
          top = Math.min(top, yc)
        }
      } else if (src && (outside || heap[xy])) {
        return false
      }
    }
  }
  return typeof top !== 'number'
    ? true : top
}

const bottom = (piece: State): State => {
  let d = 0
  while (insertPiece({ ...piece, y: piece.y + d + 1 })) d++
  return { ...piece, y: piece.y + d }
}

const drawPiece = (piece: State, alpha: number = 1, rule: string = 'source-over') => {
  const { id, x, y, ori } = piece
  const img = bitmaps[id]
  const hs = img.width / 2
  gfx.globalCompositeOperation = rule
  gfx.globalAlpha = alpha
  gfx.setTransform(1, 0, 0, 1, SCALE * x + hs, SCALE * y + hs)
  gfx.rotate(ori * 0.25 * 2.0 * Math.PI)
  gfx.translate(-hs, -hs)
  gfx.drawImage(img, 0, 0)
}

const drawPreview = (piece: State) => {
  pgfx.clearRect(0, 0, 4 * SCALE, 4 * SCALE)
  pgfx.drawImage(bitmaps[piece.id], 0, 0)
}

const main = async () => {
  bitmaps = await Promise.all(
    pieces.map(([size, array, color]) => {
      const data = [...array].flatMap(p =>
        p ? [...color, 255] : [0, 0, 0, 0]
      )

      const bin = new Uint8ClampedArray(data)
      const img = new ImageData(bin, size, size)
      const scaled = SCALE * size

      return createImageBitmap(img, {
        resizeWidth: scaled,
        resizeHeight: scaled,
        resizeQuality: 'pixelated'
      })
    })
  )

  let tile = generatePiece()
  let guideTile = bottom(tile)
  let next = generatePiece()
  let top = HEIGHT
  let score = 0

  const move = (piece: State) => {
    if (insertPiece(piece)) {
      drawPiece(tile, 1, 'xor')
      drawPiece(guideTile, 1, 'destination-out')
      guideTile = bottom(piece)
      drawPiece(guideTile, 0.25)
      drawPiece(piece)
      tile = piece
    }
  }

  const down = () => {
    const dst = { ...tile, y: tile.y + 1 }

    if (insertPiece(dst)) {
      drawPiece(tile, 1, 'xor')
      drawPiece(dst)
      tile = dst

    } else {
      attach()
    }
  }

  const toBottom = () => {
    const dst = bottom(tile)
    drawPiece(tile, 1, 'xor')
    drawPiece(dst)
    tile = dst
    attach()
  }

  const attach = () => {
    top = insertPiece(tile, top) as number

    if (!top) {
      clearInterval(interval)

    } else {
      const count = scan(top)
      if (count) {
        score += POINTS[count - 1]
        scoreEm.innerText = score.toString()
        top += count
      }
      tile = next
      guideTile = bottom(tile)
      next = generatePiece()
      drawPiece(guideTile, 0.25)
      drawPreview(next)
    }
  }

  drawPiece(guideTile, 0.25)
  drawPreview(next)

  const interval = setInterval(down, INTERVAL)

  window.addEventListener('keydown', evt => {
    switch (evt.code) {
      case 'KeyQ': {
        move({ ...tile, ori: (4 + tile.ori - 1) % 4 })
        break
      }
      case 'KeyW': {
        move({ ...tile, ori: (tile.ori + 1) % 4 })
        break
      }
      case 'ArrowLeft': {
        move({ ...tile, x: tile.x - 1 })
        break
      }
      case 'ArrowRight': {
        move({ ...tile, x: tile.x + 1 })
        break
      }
      case 'ArrowDown': {
        down()
        break
      }
      case 'Space': {
        toBottom()
        break
      }
      default:
    }
  })
}

main()
