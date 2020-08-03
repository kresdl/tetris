import { Piece } from './types.js'

export const a: Piece = [
  4,
  new Uint8Array([
    0, 0, 0, 0,
    1, 1, 1, 1,
    0, 0, 0, 0,
    0, 0, 0, 0
  ]),
  [255, 255, 255]
]

export const b: Piece = [
  3,
  new Uint8Array([
    0, 1, 0,
    1, 1, 1,
    0, 0, 0,
  ]),
  [240, 235, 10]
]

export const c: Piece = [
  3,
  new Uint8Array([
    1, 0, 0,
    1, 1, 1,
    0, 0, 0,
  ]),
  [0, 100, 200]
]

export const d: Piece = [
  3,
  new Uint8Array([
    0, 0, 1,
    1, 1, 1,
    0, 0, 0,
  ]),
  [20, 180, 230]
]

export const e: Piece = [
  3,
  new Uint8Array([
    1, 1, 0,
    0, 1, 1,
    0, 0, 0,
  ]),
  [255, 140, 10]
]

export const f: Piece = [
  3,
  new Uint8Array([
    0, 1, 1,
    1, 1, 0,
    0, 0, 0,
  ]),
  [210, 50, 20]
]

export const g: Piece = [
  2,
  new Uint8Array([
    1, 1,
    1, 1,
  ]),
  [30, 230, 30]
]