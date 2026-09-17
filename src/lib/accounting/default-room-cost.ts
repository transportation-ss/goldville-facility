export function defaultCostForRoom(roomName: string) {
  return roomName.endsWith('01') ? 28000 : 15000
}
