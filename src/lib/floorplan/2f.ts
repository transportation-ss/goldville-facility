// 2F 平面圖房間熱區座標（百分比，相對於 public/2F.png 原圖）
// 對齊圖片時請用瀏覽器實測微調，這份是手動估測的初版

export type RoomHotspot = {
  room: string   // 對應 butler_residents.room
  label: string  // 圖上顯示的房號
  x: number      // 左上角 x（%）
  y: number      // 左上角 y（%）
  w: number      // 寬（%）
  h: number      // 高（%）
}

export const FLOOR_2F_IMAGE = '/2F.png'

export const FLOOR_2F_ROOMS: RoomHotspot[] = [
  // 中段走廊（左到右：11,10,9,8,7,6,5）
  { room: '211', label: '11', x: 30.6, y: 50.8, w: 7.0, h: 23.7 },
  { room: '210', label: '10', x: 37.6, y: 50.8, w: 7.0, h: 23.7 },
  { room: '209', label: '9',  x: 44.6, y: 50.8, w: 5.7, h: 23.7 },
  { room: '208', label: '8',  x: 50.3, y: 50.8, w: 6.8, h: 23.7 },
  { room: '207', label: '7',  x: 57.1, y: 50.8, w: 6.5, h: 23.7 },
  { room: '206', label: '6',  x: 63.6, y: 50.8, w: 6.6, h: 23.7 },
  { room: '205', label: '5',  x: 70.2, y: 50.8, w: 6.4, h: 23.7 },

  // 右側
  { room: '203', label: '3',  x: 76.6, y: 51.5, w: 7.1, h: 19.1 },
  { room: '202', label: '2',  x: 83.7, y: 52.8, w: 6.2, h: 19.1 },
  { room: '201', label: '1',  x: 85.5, y: 25.7, w: 11.9, h: 24.4 },

  // 左下段（左到右：16,15,13,12）
  { room: '216', label: '16', x: 4.0,  y: 73.9, w: 6.8, h: 20.4 },
  { room: '215', label: '15', x: 10.8, y: 73.9, w: 6.9, h: 20.4 },
  { room: '213', label: '13', x: 17.7, y: 73.9, w: 6.8, h: 20.4 },
  { room: '212', label: '12', x: 24.5, y: 73.9, w: 6.9, h: 20.4 },
]
