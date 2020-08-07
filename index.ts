/* eslint-disable semi */

import { SCALE, WIDTH, HEIGHT, POINTS, START_INTERVAL, SCORE_THRESHOLD, INTERVAL_DECR_STEP } from './constants.js'
import { State } from './types.js'
import { a, b, c, d, e, f, g } from './pieces.js'

const pieces = [a, b, c, d, e, f, g],
  game = document.getElementById('game') as HTMLCanvasElement,
  prev = document.getElementById('preview') as HTMLCanvasElement,
  gfx = game.getContext('2d') as CanvasRenderingContext2D,
  pgfx = prev.getContext('2d') as CanvasRenderingContext2D,
  scoreEm = document.getElementById('score') as HTMLParagraphElement,
  pile = new Uint8Array(WIDTH * HEIGHT)

game.width = WIDTH * SCALE
game.height = HEIGHT * SCALE
prev.width = 4 * SCALE
prev.height = 4 * SCALE

let bitmaps: ImageBitmap[]

// Get sample model for array-like square grid with specific orientation as 
// [offset, delta with respect to game x, delta with respect to game y]
const offsetAndDeltas = (size: number, ori: number): number[] => {
  const rgt = size - 1
  const btm = size * (size - 1)

  return [
    [0, 1, size],
    [btm, -size, 1],
    [rgt + btm, -1, -size],
    [rgt, size, -1]
  ][ori]
}

// Randomize piece and x position
const generatePiece = (): State => {
  const id = ~~(Math.random() * pieces.length)
  const size = pieces[id][0]

  return {
    x: ~~(Math.random() * (WIDTH - size + 1)),
    y: -2, ori: 0, id
  }
}

// Recursively check for full row and sink pile accordingly. Return cleared row count
const scanAndClearRows = (top: number): number => {
  const cols = [...Array(WIDTH)].map((_, i) => i)
  const rows = [...Array(HEIGHT - top)].map((_, i) => i + top)

  const full = rows.find(row =>
    cols.every(col => pile[col + WIDTH * row])
  )

  if (!full) return 0

  // Update data model
  pile.copyWithin(top * WIDTH, (top - 1) * WIDTH, full * WIDTH)

  // Update viewport
  const snap = gfx.getImageData(0, SCALE * (top - 1), SCALE * WIDTH, SCALE * (full - top + 1))
  gfx.putImageData(snap, 0, SCALE * top)

  return scanAndClearRows(top + 1) + 1
}

// Merge piece with pile or check for fit
const insertIntoDataModel = (piece: State, dryrun?: boolean): number | boolean => {
  const [size, pattern] = pieces[piece.id]
  const m = offsetAndDeltas(size, piece.ori)
  let minY = HEIGHT

  for (let y = 0; y < size; y++) {
    const yc = piece.y + y

    for (let x = 0; x < size; x++) {
      const xc = piece.x + x,
        xy = xc + WIDTH * yc,
        uv = m[0] + x * m[1] + y * m[2],
        src = pattern[uv],
        outside = yc >= HEIGHT || xc < 0 || xc >= WIDTH

      if (dryrun) {
        if (src && (outside || pile[xy])) {
          return false
        }
      } else if (src && !outside && yc >= 0) {
        pile[xy] = 1
        minY = Math.min(minY, yc)
      }
    }
  }

  return dryrun || minY
}

// Get merge y
const bottom = (piece: State): number => {
  let d = 0
  while (insertIntoDataModel({ ...piece, y: piece.y + d + 1 }, true)) d++
  return piece.y + d
}

// Erase piece
const erasePiece = (piece: State) =>
  drawPiece(piece, 1, 'destination-out')

// Render piece
const drawPiece = (piece: State, alpha: number = 1, rule: string = 'source-over') => {
  const { id, x, y, ori } = piece,
    img = bitmaps[id],
    hs = img.width / 2

  gfx.globalCompositeOperation = rule
  gfx.globalAlpha = alpha
  gfx.setTransform(1, 0, 0, 1, SCALE * x + hs, SCALE * y + hs)
  gfx.rotate(ori * 0.25 * 2.0 * Math.PI)
  gfx.translate(-hs, -hs)
  gfx.drawImage(img, 0, 0)
}

// Render preview piece
const drawPreview = (id: number) => {
  pgfx.clearRect(0, 0, 4 * SCALE, 4 * SCALE)
  pgfx.drawImage(bitmaps[id], 0, 0)
}

const updateScore = (score: number): number => {
  scoreEm.innerText = score.toString()
  return score
}

// Control scope
const main = async () => {

  // Move sideway or rotate
  const move = (piece: State) => {
    if (insertIntoDataModel(piece, true)) {
      erasePiece(tile)
      erasePiece(guideTile)
      guideTile = { ...piece, y: bottom(piece) }
      drawPiece(guideTile, 0.25)
      tile = piece
      drawPiece(tile)
    }
  }

  // Move downward
  const down = () => {
    const dst = { ...tile, y: tile.y + 1 }

    if (insertIntoDataModel(dst, true)) {
      erasePiece(tile)
      tile = dst
      drawPiece(tile)

    } else {
      mergePiece()
    }
  }

  // Drop to bottom
  const drop = () => {
    erasePiece(tile)
    tile = guideTile
    drawPiece(tile)
    mergePiece()
  }

  // Merge piece. Called by down() and drop() 
  const mergePiece = () => {
    const minY = insertIntoDataModel(tile) as number

    // All piled up?
    if (!minY) {
      clearInterval(task)
    } else {
      top = Math.min(top, minY)
      const count = scanAndClearRows(top)

      // Cleared rows?
      if (count) {
        score = updateScore(score + POINTS[count - 1])
        clearInterval(task)
        const interval = START_INTERVAL - INTERVAL_DECR_STEP * ~~(score / SCORE_THRESHOLD)
        task = setInterval(down, interval)
        top += count
      }

      tile = next
      guideTile = { ...tile, y: bottom(tile) }
      next = generatePiece()
      drawPiece(guideTile, 0.25)
      drawPreview(next.id)
    }
  }

  // Prepare textures
  bitmaps = await Promise.all(
    pieces.map(([size, array, color]) => {
      const data = [...array].flatMap(p =>
        p ? [...color, 255] : [0, 0, 0, 0]
      ),

        bin = new Uint8ClampedArray(data),
        img = new ImageData(bin, size, size),
        scaled = SCALE * size

      return createImageBitmap(img, {
        resizeWidth: scaled,
        resizeHeight: scaled,
        resizeQuality: 'pixelated'
      })
    })
  )

  let tile = generatePiece(),
    guideTile = { ...tile, y: bottom(tile) },
    next = generatePiece(),
    top = HEIGHT,
    task = setInterval(down, START_INTERVAL),
    score = updateScore(0)

  drawPiece(guideTile, 0.25)
  drawPreview(next.id)

  window.addEventListener('keydown', evt => {
    switch (evt.code) {
      case 'KeyQ':
        move({ ...tile, ori: (4 + tile.ori - 1) % 4 })
        break
      case 'KeyW':
        move({ ...tile, ori: (tile.ori + 1) % 4 })
        break
      case 'ArrowLeft':
        move({ ...tile, x: tile.x - 1 })
        break
      case 'ArrowRight':
        move({ ...tile, x: tile.x + 1 })
        break
      case 'ArrowDown':
        down()
        break
      case 'Space':
        drop()
        break
      default:
    }
  })
}

main()
