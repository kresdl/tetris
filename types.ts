export type State = {
  x: number,
  y: number, 
  ori: number,
  id: number
}

export type RGB = [number, number, number]

export type Piece = [number, Uint8Array, RGB]
