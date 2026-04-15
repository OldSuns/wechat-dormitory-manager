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
    floors: [],
    currentFloor: 1,
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
    const floors = roomService.getFloors();
    this.setData({ floors });
    this._loadFloorData(this.data.currentFloor || floors[0]);
  },

  _loadFloorData(floor) {
    const rooms = roomService.getRoomsByFloor(floor);
    const floorSummary = roomService.getFloorSummary(floor);
    const roomSummaries = {};
    rooms.forEach((room) => {
      roomSummaries[room.roomId] = roomService.getRoomSummary(room.roomId);
    });
    this.setData({ currentFloor: floor, floorSummary, rooms, roomSummaries });
  },

  onFloorTabChange(e) {
    const floor = this.data.floors[e.detail.value];
    this._loadFloorData(floor);
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
