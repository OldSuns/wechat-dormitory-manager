const roomService = require('../../services/roomService');
const userService = require('../../services/userService');
const applicationService = require('../../services/applicationService');

Page({
  data: {
    currentTab: 0,
    currentUser: null,
    // Tab1: 我的床位
    myBedInfo: null,
    // Tab2: 浏览楼层
    buildings: [],
    currentBuilding: null,
    currentBuildingName: '',
    floors: [],
    currentFloor: null,
    floorSummary: {},
    rooms: [],
    roomSummaries: {},
    // Tab3: 我的申请
    myApplications: [],
    // 退宿确认
    showCheckoutDialog: false,
    // Tab4: 设置
    showLogoutDialog: false,
    showEditPhoneDialog: false,
    editPhone: '',
    showEditTypeDialog: false,
    editType: '',
  },

  onLoad() {
    if (!userService.isLoggedIn() || userService.getRole() !== 'student') {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ currentUser: userService.getCurrentUser() });
  },

  onShow() {
    this.setData({ currentUser: userService.getCurrentUser() });
    this._loadTab(this.data.currentTab);
  },

  onTabChange(e) {
    const tab = e.detail.value;
    this.setData({ currentTab: tab });
    this._loadTab(tab);
  },

  _loadTab(tab) {
    if (tab === 0) this._loadMyBed();
    else if (tab === 1) this._loadFloors();
    else if (tab === 2) this._loadMyApplications();
  },

  // === Tab 1: 我的床位 ===
  _loadMyBed() {
    const currentUser = userService.getCurrentUser();
    const info = userService.getStudentBed(currentUser.studentId);
    this.setData({ myBedInfo: info });
  },

  onApplyCheckout() {
    this.setData({ showCheckoutDialog: true });
  },

  onCheckoutConfirm() {
    const { myBedInfo, currentUser } = this.data;
    this.setData({ showCheckoutDialog: false });
    if (!myBedInfo) return;
    const result = applicationService.submitApplication({
      type: 'checkout',
      applicantId: currentUser.studentId,
      applicantName: currentUser.name,
      roomId: myBedInfo.room.roomId,
      bedNo: myBedInfo.bed.bedNo,
    });
    if (result.success) {
      wx.showToast({ title: '退宿申请已提交', icon: 'success' });
      this._loadMyApplications();
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  onCheckoutCancel() {
    this.setData({ showCheckoutDialog: false });
  },

  // === Tab 2: 浏览楼层 ===
  _loadFloors() {
    const buildings = roomService.getBuildings();
    if (buildings.length === 0) {
      this.setData({ buildings: [], floors: [], rooms: [], floorSummary: {}, roomSummaries: {} });
      return;
    }

    const currentBuilding = this.data.currentBuilding || buildings[0].id;
    const currentBuildingName = buildings.find(b => b.id === currentBuilding)?.name || '';
    const floors = roomService.getFloorsByBuilding(currentBuilding);

    if (floors.length === 0) {
      this.setData({ buildings, currentBuilding, currentBuildingName, floors: [], rooms: [], floorSummary: {}, roomSummaries: {} });
      return;
    }

    const currentFloor = floors.includes(this.data.currentFloor) ? this.data.currentFloor : floors[0];
    this.setData({ buildings, currentBuilding, currentBuildingName, floors, currentFloor });
    this._loadFloorData(currentBuilding, currentFloor);
  },

  _loadFloorData(buildingId, floor) {
    const buildings = this.data.buildings;
    const currentBuildingName = buildings.find(b => b.id === buildingId)?.name || '';
    const rooms = roomService.getRoomsByFloor(buildingId, floor);
    const floorSummary = roomService.getFloorSummary(buildingId, floor);
    const roomSummaries = {};
    rooms.forEach((room) => {
      roomSummaries[room.roomId] = roomService.getRoomSummary(room.roomId);
    });
    this.setData({ currentBuilding: buildingId, currentBuildingName, currentFloor: floor, floorSummary, rooms, roomSummaries });
  },

  onBuildingChange(e) {
    const index = parseInt(e.detail.value);
    const buildingId = this.data.buildings[index].id;
    const floors = roomService.getFloorsByBuilding(buildingId);
    const currentFloor = floors.length > 0 ? floors[0] : null;
    if (currentFloor) {
      this._loadFloorData(buildingId, currentFloor);
      this.setData({ floors });
    } else {
      const currentBuildingName = this.data.buildings[index].name;
      this.setData({ currentBuilding: buildingId, currentBuildingName, floors: [], currentFloor: null, rooms: [], floorSummary: {}, roomSummaries: {} });
    }
  },

  onFloorChange(e) {
    const index = parseInt(e.detail.value);
    const floor = this.data.floors[index];
    this._loadFloorData(this.data.currentBuilding, floor);
  },

  onRoomTap(e) {
    wx.navigateTo({ url: `/pages/room-detail/room-detail?roomId=${e.detail.roomId}` });
  },

  // === Tab 3: 我的申请 ===
  _loadMyApplications() {
    const currentUser = userService.getCurrentUser();
    const myApplications = applicationService
      .getApplications({ applicantId: currentUser.studentId })
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    this.setData({ myApplications });
  },

  // === Tab 4: 设置 ===
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;
    userService.updateProfile({ avatarUrl });
    this.setData({ currentUser: userService.getCurrentUser() });
    wx.showToast({ title: '头像已更新', icon: 'success' });
  },

  onNicknameBlur(e) {
    const nickName = (e.detail.value || '').trim();
    if (!nickName || nickName === this.data.currentUser.nickName) return;
    userService.updateProfile({ nickName });
    this.setData({ currentUser: userService.getCurrentUser() });
    wx.showToast({ title: '昵称已更新', icon: 'success' });
  },

  onNicknameConfirm(e) {
    const nickName = (e.detail.value || '').trim();
    if (!nickName || nickName === this.data.currentUser.nickName) return;
    userService.updateProfile({ nickName });
    this.setData({ currentUser: userService.getCurrentUser() });
    wx.showToast({ title: '昵称已更新', icon: 'success' });
  },

  onEditPhone() {
    this.setData({ showEditPhoneDialog: true, editPhone: this.data.currentUser.phone || '' });
  },

  onEditPhoneInput(e) {
    this.setData({ editPhone: e.detail.value });
  },

  onEditPhoneConfirm() {
    userService.updateProfile({ phone: this.data.editPhone.trim() });
    this.setData({ showEditPhoneDialog: false, currentUser: userService.getCurrentUser() });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  onEditPhoneCancel() {
    this.setData({ showEditPhoneDialog: false });
  },

  onEditType() {
    this.setData({ showEditTypeDialog: true, editType: this.data.currentUser.type || '研究生' });
  },

  onEditTypeChange(e) {
    this.setData({ editType: e.detail.value });
  },

  onEditTypeConfirm() {
    userService.updateProfile({ type: this.data.editType });
    this.setData({ showEditTypeDialog: false, currentUser: userService.getCurrentUser() });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  onEditTypeCancel() {
    this.setData({ showEditTypeDialog: false });
  },

  onShowLogout() {
    this.setData({ showLogoutDialog: true });
  },

  onLogoutConfirm() {
    this.setData({ showLogoutDialog: false });
    userService.logout();
    wx.reLaunch({ url: '/pages/login/login' });
  },

  onLogoutCancel() {
    this.setData({ showLogoutDialog: false });
  },
});
