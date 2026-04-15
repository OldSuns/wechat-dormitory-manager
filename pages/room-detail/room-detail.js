const roomService = require('../../services/roomService');
const userService = require('../../services/userService');
const applicationService = require('../../services/applicationService');

Page({
  data: {
    roomId: '',
    room: null,
    summary: null,
    leavingSoonMap: {},
    userRole: 'admin',
    currentStudentId: '',
    // ActionSheet
    showActionSheet: false,
    actionSheetItems: [],
    selectedBedNo: 0,
    selectedBedStatus: '',
    // 入住弹层
    showCheckinPopup: false,
    checkinBedNo: 0,
    // 退宿确认
    showCheckoutDialog: false,
    checkoutBedNo: 0,
    // 修改信息弹层
    showEditPopup: false,
    editBedNo: 0,
    editOccupant: null,
  },

  onLoad(options) {
    if (!userService.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const currentUser = userService.getCurrentUser();
    this.setData({
      roomId: options.roomId,
      userRole: userService.getRole() || 'admin',
      currentStudentId: currentUser ? currentUser.studentId : '',
    });
  },

  onShow() {
    this.loadRoom();
  },

  loadRoom() {
    const { roomId } = this.data;
    const room = roomService.getRoomById(roomId);
    const summary = roomService.getRoomSummary(roomId);
    const leavingSoonMap = {};
    if (room) {
      room.beds.forEach((bed) => {
        leavingSoonMap[bed.bedNo] =
          bed.status === 'occupied' &&
          !!bed.occupant &&
          roomService.isLeavingSoon(bed.occupant.expectedLeaveDate);
      });
    }
    this.setData({ room, summary, leavingSoonMap });
  },

  // 床位点击
  onBedTap(e) {
    const { bedNo, status } = e.detail;
    const { userRole, currentStudentId, room } = this.data;
    let items = [];

    if (userRole === 'admin') {
      if (status === 'empty') {
        items = [{ label: '办理入住', value: 'checkin' }];
      } else {
        items = [
          { label: '修改信息', value: 'edit' },
          { label: '办理退宿', value: 'checkout' },
          { label: '调换床位', value: 'swap' },
        ];
      }
    } else {
      // student
      if (status === 'empty') {
        items = [{ label: '申请入住', value: 'apply-checkin' }];
      } else {
        const bed = room.beds.find((b) => b.bedNo === bedNo);
        if (bed && bed.occupant && bed.occupant.studentId === currentStudentId) {
          items = [{ label: '申请退宿', value: 'apply-checkout' }];
        } else {
          wx.showToast({ title: '该床位已有人入住', icon: 'none' });
          return;
        }
      }
    }

    this.setData({
      showActionSheet: true,
      actionSheetItems: items,
      selectedBedNo: bedNo,
      selectedBedStatus: status,
    });
  },

  onActionSheetSelected(e) {
    const value = e.detail.selected.value;
    const bedNo = this.data.selectedBedNo;
    this.setData({ showActionSheet: false });

    if (value === 'checkin') {
      this.setData({ showCheckinPopup: true, checkinBedNo: bedNo });
    } else if (value === 'edit') {
      const bed = this.data.room.beds.find((b) => b.bedNo === bedNo);
      this.setData({ showEditPopup: true, editBedNo: bedNo, editOccupant: bed ? bed.occupant : null });
    } else if (value === 'checkout') {
      this.setData({ showCheckoutDialog: true, checkoutBedNo: bedNo });
    } else if (value === 'swap') {
      wx.showToast({ title: '调换床位功能开发中', icon: 'none' });
    } else if (value === 'apply-checkin') {
      this._submitApplication('checkin', bedNo);
    } else if (value === 'apply-checkout') {
      this._submitApplication('checkout', bedNo);
    }
  },

  _submitApplication(type, bedNo) {
    const currentUser = userService.getCurrentUser();
    const result = applicationService.submitApplication({
      type,
      applicantId: currentUser.studentId,
      applicantName: currentUser.name,
      roomId: this.data.roomId,
      bedNo,
    });
    if (result.success) {
      wx.showToast({ title: '申请已提交，等待审批', icon: 'success' });
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  onActionSheetCancel() {
    this.setData({ showActionSheet: false });
  },

  // 入住 (admin only)
  onCheckinClose() {
    this.setData({ showCheckinPopup: false });
  },

  onCheckinSubmit(e) {
    const { roomId, bedNo, occupant } = e.detail;
    const result = roomService.checkInBed({ roomId, bedNo, occupant });
    if (result.success) {
      wx.showToast({ title: '入住成功', icon: 'success' });
      this.setData({ showCheckinPopup: false });
      this.loadRoom();
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  // 退宿 (admin only)
  onCheckoutConfirm() {
    const result = roomService.checkOutBed({
      roomId: this.data.roomId,
      bedNo: this.data.checkoutBedNo,
    });
    this.setData({ showCheckoutDialog: false });
    if (result.success) {
      wx.showToast({ title: '退宿成功', icon: 'success' });
      this.loadRoom();
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  onCheckoutCancel() {
    this.setData({ showCheckoutDialog: false });
  },

  // 修改信息 (admin only)
  onEditClose() {
    this.setData({ showEditPopup: false });
  },

  onEditSubmit(e) {
    const { roomId, bedNo, occupant } = e.detail;
    const result = roomService.updateOccupant({ roomId, bedNo, occupant });
    if (result.success) {
      wx.showToast({ title: '修改成功', icon: 'success' });
      this.setData({ showEditPopup: false });
      this.loadRoom();
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },
});
