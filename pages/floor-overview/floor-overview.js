const roomService = require('../../services/roomService');
const userService = require('../../services/userService');

Page({
  data: {
    floors: [],
    currentFloor: 1,
    floorSummary: {},
    rooms: [],
    roomSummaries: {},
  },

  onLoad() {
    if (!userService.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const floors = roomService.getFloors();
    this.setData({ floors });
    this.loadFloorData(floors[0]);
  },

  onShow() {
    this.loadFloorData(this.data.currentFloor);
  },

  onTabChange(e) {
    const floor = this.data.floors[e.detail.value];
    this.loadFloorData(floor);
  },

  loadFloorData(floor) {
    const rooms = roomService.getRoomsByFloor(floor);
    const floorSummary = roomService.getFloorSummary(floor);
    const roomSummaries = {};
    rooms.forEach((room) => {
      roomSummaries[room.roomId] = roomService.getRoomSummary(room.roomId);
    });
    this.setData({
      currentFloor: floor,
      floorSummary,
      rooms,
      roomSummaries,
    });
  },

  onRoomTap(e) {
    const { roomId } = e.detail;
    wx.navigateTo({
      url: `/pages/room-detail/room-detail?roomId=${roomId}`,
    });
  },
});
