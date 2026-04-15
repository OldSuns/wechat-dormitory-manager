const roomService = require('../../services/roomService');
const userService = require('../../services/userService');
const applicationService = require('../../services/applicationService');
const excelService = require('../../services/excelService');

Page({
  data: {
    currentTab: 0,
    currentUser: null,
    // Tab1: 楼层概览
    floors: [],
    currentFloor: 1,
    floorSummary: {},
    rooms: [],
    roomSummaries: {},
    // Tab2: 房间管理
    allRooms: [],
    showAddDialog: false,
    addFloor: 1,
    addRoomNumber: '',
    addBedCount: 4,
    showFloorPicker: false,
    floorPickerOptions: [],
    floorPickerValue: [],
    // Tab3: 学生总览
    students: [],
    studentSummary: {
      totalStudents: 0,
      occupiedBeds: 0,
      unassigned: 0
    },
    showStudentDetailDialog: false,
    viewingStudent: null,
    viewingStudentRoom: null,
    showEditStudentDialog: false,
    editingStudent: null,
    editStudentForm: {
      name: '',
      gender: '男',
      phone: '',
      type: '研究生',
      hasRoom: false,
      roomId: null,
      bedNo: null,
      checkInDate: '',
      expectedLeaveDate: ''
    },
    showCheckInPicker: false,
    showLeavePicker: false,
    // Tab4: 申请审批
    pendingCount: 0,
    pendingApps: [],
    // Tab4: 设置
    showLogoutDialog: false,
    showEditPhoneDialog: false,
    editPhone: '',
    showEditStudentIdDialog: false,
    editStudentId: '',
    // 数据管理
    showImportDialog: false,
    showClearDataDialog: false,
    importMode: 'merge',
    isExporting: false,
    isImporting: false,
  },

  onLoad() {
    if (!userService.isLoggedIn() || userService.getRole() !== 'admin') {
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
    if (tab === 0) this._loadFloorOverview();
    else if (tab === 1) this._loadRoomManagement();
    else if (tab === 2) this._loadStudentOverview();
    else if (tab === 4) this._loadApplications();
  },

  // === 数据管理功能 ===
  onShowImportDialog() {
    this.setData({ showImportDialog: true });
  },

  onImportDialogClose() {
    this.setData({ showImportDialog: false });
  },

  onImportModeChange(e) {
    this.setData({ importMode: e.detail.value });
  },

  onShowClearDataDialog() {
    this.setData({ showClearDataDialog: true });
  },

  onClearDataCancel() {
    this.setData({ showClearDataDialog: false });
  },

  onClearDataConfirm() {
    this.setData({ showClearDataDialog: false });

    wx.showLoading({ title: '清空中...', mask: true });

    try {
      const app = getApp();
      const currentUser = userService.getCurrentUser();

      // 清空房间数据
      app.globalData.buildingData.rooms = [];
      app.globalData.buildingData.floors = [];

      // 清空申请记录
      app.globalData.applications = [];

      // 清空用户数据(保留当前管理员账号)
      app.globalData.users = app.globalData.users.filter(
        user => user.studentId === currentUser.studentId
      );

      // 持久化
      const storageService = require('../../services/storageService');
      storageService.persistFromGlobal(app);

      wx.hideLoading();
      wx.showToast({
        title: '清空成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          // 刷新所有标签页数据
          setTimeout(() => {
            this._loadFloorOverview();
            this._loadRoomManagement();
            this._loadApplications();
          }, 500);
        }
      });
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: '清空失败',
        content: error.message || String(error),
        showCancel: false
      });
      console.error('清空数据失败:', error);
    }
  },

  onExportAll() {
    if (this.data.isExporting) return;

    this.setData({ isExporting: true });
    wx.showLoading({ title: '导出中...', mask: true });

    excelService.exportAll(getApp())
      .then(filePath => {
        wx.hideLoading();
        this.setData({ isExporting: false });

        wx.showModal({
          title: '导出成功',
          content: '数据已导出,是否打开文件?',
          success: (res) => {
            if (res.confirm) {
              wx.openDocument({
                filePath: filePath,
                fileType: 'xlsx',
                success: () => {
                  console.log('打开文档成功');
                },
                fail: (err) => {
                  wx.showToast({ title: '打开文件失败', icon: 'none' });
                  console.error('打开文档失败:', err);
                }
              });
            }
          }
        });
      })
      .catch(error => {
        wx.hideLoading();
        this.setData({ isExporting: false });
        wx.showModal({
          title: '导出失败',
          content: error.message || String(error),
          showCancel: false
        });
        console.error('导出失败:', error);
      });
  },

  onDownloadTemplate() {
    wx.showLoading({ title: '生成模板中...', mask: true });

    excelService.generateTemplate()
      .then(filePath => {
        wx.hideLoading();

        wx.showModal({
          title: '模板生成成功',
          content: '模板已生成,是否打开查看?\n\n说明:\n- (必填)字段必须填写\n- (可选)字段可留空\n- 预计退宿日期留空表示不限期',
          success: (res) => {
            if (res.confirm) {
              wx.openDocument({
                filePath: filePath,
                fileType: 'xlsx',
                success: () => {
                  console.log('打开模板成功');
                },
                fail: (err) => {
                  wx.showToast({ title: '打开文件失败', icon: 'none' });
                  console.error('打开模板失败:', err);
                }
              });
            }
          }
        });
      })
      .catch(error => {
        wx.hideLoading();
        wx.showModal({
          title: '生成模板失败',
          content: error.message || String(error),
          showCancel: false
        });
        console.error('生成模板失败:', error);
      });
  },

  onChooseImportFile() {
    if (this.data.isImporting) return;

    // 关闭对话框
    this.setData({ showImportDialog: false });

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (res) => {
        const file = res.tempFiles[0];

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
          wx.showToast({ title: '请选择Excel文件', icon: 'none' });
          return;
        }

        // 显示确认对话框
        const mode = this.data.importMode;
        const modeText = mode === 'merge' ? '合并模式' : '替换模式';
        const warningText = mode === 'replace'
          ? '\n\n警告: 替换模式将清空现有数据!'
          : '';

        wx.showModal({
          title: '确认导入',
          content: `导入模式: ${modeText}${warningText}\n\n确认导入文件"${file.name}"?`,
          confirmText: '确认导入',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this._performImport(file.path, mode);
            }
          }
        });
      },
      fail: (err) => {
        console.error('选择文件失败:', err);
        wx.showToast({ title: '选择文件失败', icon: 'none' });
      }
    });
  },

  _performImport(filePath, mode) {
    this.setData({ isImporting: true });
    wx.showLoading({ title: '导入中...', mask: true });

    excelService.importExcel(getApp(), filePath, mode)
      .then(result => {
        wx.hideLoading();
        this.setData({ isImporting: false });

        if (result.success) {
          const summary = [
            `房间: 新增${result.rooms.addedCount}个, 更新${result.rooms.updatedCount}个`,
            `入住: 新增${result.occupants.addedCount}个, 更新${result.occupants.updatedCount}个`,
            `用户: 新增${result.users.addedCount}个, 更新${result.users.updatedCount}个`
          ].join('\n');

          wx.showModal({
            title: '导入成功',
            content: summary,
            showCancel: false,
            success: () => {
              // 刷新所有标签页数据
              this._loadFloorOverview();
              this._loadRoomManagement();
              this._loadApplications();
            }
          });
        } else {
          wx.showModal({
            title: result.error || '导入失败',
            content: result.details || '请检查文件格式是否正确',
            showCancel: false
          });
        }
      })
      .catch(error => {
        wx.hideLoading();
        this.setData({ isImporting: false });
        wx.showModal({
          title: '导入失败',
          content: error.message || String(error),
          showCancel: false
        });
        console.error('导入失败:', error);
      });
  },

  // === Tab 1: 楼层概览 ===
  _loadFloorOverview() {
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

  // === Tab 2: 房间管理 ===
  _loadRoomManagement() {
    const allRooms = roomService.getAllRooms().slice().sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.roomNumber.localeCompare(b.roomNumber);
    });
    this.setData({ allRooms });
  },

  onShowAddDialog() {
    this.setData({
      showAddDialog: true,
      addFloor: 1,
      addRoomNumber: '',
      addBedCount: 4,
    });
  },

  onAddDialogClose() {
    this.setData({ showAddDialog: false });
  },

  onAddRoomNumberInput(e) {
    this.setData({ addRoomNumber: e.detail.value });
  },

  onAddBedCountChange(e) {
    this.setData({ addBedCount: e.detail.value });
  },

  onAddFloorInput(e) {
    this.setData({ addFloor: parseInt(e.detail.value) || 1 });
  },

  onConfirmAddRoom() {
    const { addFloor, addRoomNumber, addBedCount } = this.data;
    if (!addFloor || addFloor < 1 || !Number.isInteger(addFloor)) {
      wx.showToast({ title: '请输入有效的楼层号（正整数）', icon: 'none' });
      return;
    }
    if (!addRoomNumber.trim()) {
      wx.showToast({ title: '请输入房间号', icon: 'none' });
      return;
    }
    const result = roomService.addRoom({
      floor: addFloor,
      roomNumber: addRoomNumber.trim(),
      bedCount: addBedCount,
    });
    if (result.success) {
      wx.showToast({ title: '添加成功', icon: 'success' });
      this.setData({ showAddDialog: false });
      this._loadRoomManagement();
      this._loadFloorOverview();
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  onDeleteRoom(e) {
    const roomId = e.currentTarget.dataset.roomid;
    const result = roomService.deleteRoom(roomId);
    if (result.success) {
      wx.showToast({ title: '删除成功', icon: 'success' });
      this._loadRoomManagement();
      this._loadFloorOverview();
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  onBedCountChange(e) {
    const index = e.mark && e.mark.index;
    const room = this.data.allRooms[index];
    if (!room) return;
    const newCount = e.detail.value;
    const result = roomService.modifyBedCount(room.roomId, newCount);
    if (!result.success) {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
    this._loadRoomManagement();
  },

  // === Tab 3: 学生总览 ===
  _loadStudentOverview() {
    const allUsers = userService.getAllUsers();
    const students = [];
    let occupiedCount = 0;

    allUsers.forEach(user => {
      if (user.role === 'admin') return; // Skip admin users

      const bedInfo = userService.getStudentBed(user.studentId);
      let roomInfo = null;
      let floor = null;
      let roomNumber = null;
      let bedNo = null;
      let gender = null;

      if (bedInfo && bedInfo.room && bedInfo.bed) {
        floor = bedInfo.room.floor;
        roomNumber = bedInfo.room.roomNumber;
        bedNo = bedInfo.bed.bedNo;
        roomInfo = `${floor}F-${roomNumber}号-${bedNo}床`;
        gender = bedInfo.bed.occupant.gender || user.gender;
        occupiedCount++;
      } else {
        gender = user.gender;
      }

      students.push({
        studentId: user.studentId,
        name: user.name || user.nickName || '未命名',
        gender: gender || '未知',
        roomInfo: roomInfo,
        floor: floor,
        roomNumber: roomNumber,
        bedNo: bedNo
      });
    });

    // Sort by floor -> room number -> bed number, unassigned students at the end
    students.sort((a, b) => {
      // Unassigned students go to the end
      if (a.roomInfo && !b.roomInfo) return -1;
      if (!a.roomInfo && b.roomInfo) return 1;
      if (!a.roomInfo && !b.roomInfo) return a.name.localeCompare(b.name, 'zh-CN');

      // Sort by floor
      if (a.floor !== b.floor) return a.floor - b.floor;

      // Sort by room number (string comparison)
      const roomCompare = a.roomNumber.localeCompare(b.roomNumber, 'zh-CN', { numeric: true });
      if (roomCompare !== 0) return roomCompare;

      // Sort by bed number
      return a.bedNo - b.bedNo;
    });

    this.setData({
      students,
      studentSummary: {
        totalStudents: students.length,
        occupiedBeds: occupiedCount,
        unassigned: students.length - occupiedCount
      }
    });
  },

  onStudentTap(e) {
    const studentId = e.currentTarget.dataset.studentid;
    const user = userService.getUserByStudentId(studentId);
    if (!user) return;

    const bedInfo = userService.getStudentBed(studentId);
    let roomInfo = null;
    if (bedInfo && bedInfo.room && bedInfo.bed) {
      roomInfo = {
        roomId: bedInfo.room.roomId,
        floor: bedInfo.room.floor,
        roomNumber: bedInfo.room.roomNumber,
        bedNo: bedInfo.bed.bedNo,
        checkInDate: bedInfo.bed.occupant.checkInDate,
        expectedLeaveDate: bedInfo.bed.occupant.expectedLeaveDate
      };
    }

    this.setData({
      showStudentDetailDialog: true,
      viewingStudent: user,
      viewingStudentRoom: roomInfo
    });
  },

  onStudentDetailDialogClose() {
    this.setData({ showStudentDetailDialog: false });
  },

  onShowEditStudent() {
    const user = this.data.viewingStudent;
    const roomInfo = this.data.viewingStudentRoom;

    if (!user) {
      wx.showToast({ title: '学生信息不存在', icon: 'none' });
      return;
    }

    const formData = {
      name: user.name || '',
      gender: user.gender || '男',
      phone: user.phone || '',
      type: user.type || '研究生',
      hasRoom: !!roomInfo,
      roomId: roomInfo ? roomInfo.roomId : null,
      bedNo: roomInfo ? roomInfo.bedNo : null,
      checkInDate: roomInfo ? (roomInfo.checkInDate || '') : '',
      expectedLeaveDate: roomInfo ? (roomInfo.expectedLeaveDate || '') : ''
    };

    // 先关闭详情对话框
    this.setData({
      showStudentDetailDialog: false
    });

    // 延迟打开编辑弹窗，确保详情对话框完全关闭
    setTimeout(() => {
      this.setData({
        showEditStudentDialog: true,
        editingStudent: user,
        editStudentForm: formData
      });
    }, 300);
  },

  onEditStudentDialogClose() {
    this.setData({ showEditStudentDialog: false });
  },

  onEditStudentPopupChange(e) {
    if (e.detail.visible === false && this.data.showEditStudentDialog === true) {
      this.setData({ showEditStudentDialog: false });
    }
  },

  onEditStudentNameInput(e) {
    this.setData({ 'editStudentForm.name': e.detail.value });
  },

  onEditStudentGenderChange(e) {
    this.setData({ 'editStudentForm.gender': e.detail.value });
  },

  onEditStudentPhoneInput(e) {
    this.setData({ 'editStudentForm.phone': e.detail.value });
  },

  onEditStudentTypeChange(e) {
    this.setData({ 'editStudentForm.type': e.detail.value });
  },

  onOpenCheckInPicker() {
    this.setData({ showCheckInPicker: true });
  },

  onCheckInDateConfirm(e) {
    const date = new Date(e.detail.value);
    const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.setData({
      'editStudentForm.checkInDate': formatted,
      showCheckInPicker: false
    });
  },

  onCheckInDateCancel() {
    this.setData({ showCheckInPicker: false });
  },

  onOpenLeavePicker() {
    this.setData({ showLeavePicker: true });
  },

  onLeaveDateConfirm(e) {
    const date = new Date(e.detail.value);
    const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.setData({
      'editStudentForm.expectedLeaveDate': formatted,
      showLeavePicker: false
    });
  },

  onLeaveDateCancel() {
    this.setData({ showLeavePicker: false });
  },

  onEditStudentConfirm() {
    const { name, gender, phone, type, hasRoom, roomId, bedNo, checkInDate, expectedLeaveDate } = this.data.editStudentForm;
    const studentId = this.data.editingStudent.studentId;

    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    // 更新用户基本信息
    const userResult = userService.updateStudentInfo(studentId, {
      name: name.trim(),
      gender,
      phone: phone.trim(),
      type
    });

    if (!userResult.success) {
      wx.showToast({ title: userResult.msg || '修改失败', icon: 'none' });
      return;
    }

    // 如果有住宿信息，更新床位占用信息
    if (hasRoom && roomId && bedNo) {
      const roomService = require('../../services/roomService');
      const occupantResult = roomService.updateOccupant({
        roomId: roomId,
        bedNo: bedNo,
        occupant: {
          name: name.trim(),
          gender,
          phone: phone.trim(),
          type,
          studentId: studentId,
          checkInDate: checkInDate,
          expectedLeaveDate: expectedLeaveDate
        }
      });

      if (!occupantResult.success) {
        wx.showToast({ title: '住宿信息更新失败: ' + occupantResult.msg, icon: 'none' });
        return;
      }
    }

    wx.showToast({ title: '修改成功', icon: 'success' });
    this.setData({
      showEditStudentDialog: false,
      showStudentDetailDialog: false
    });
    this._loadStudentOverview();
  },

  // === Tab 4: 申请审批 ===
  _loadApplications() {
    const pendingApps = applicationService.getApplications({ status: 'pending' });
    const pendingCount = pendingApps.length;
    this.setData({ pendingApps, pendingCount });
  },

  onApprove(e) {
    const { applicationId } = e.detail;
    const currentUser = userService.getCurrentUser();
    const result = applicationService.approveApplication(applicationId, currentUser.studentId);
    if (result.success) {
      wx.showToast({ title: '已通过', icon: 'success' });
      this._loadApplications();
      this._loadFloorOverview();
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  onReject(e) {
    const { applicationId } = e.detail;
    const currentUser = userService.getCurrentUser();
    const result = applicationService.rejectApplication(applicationId, currentUser.studentId);
    if (result.success) {
      wx.showToast({ title: '已拒绝', icon: 'success' });
      this._loadApplications();
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  // === Tab 5: 设置 ===
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

  onEditStudentId() {
    this.setData({ showEditStudentIdDialog: true, editStudentId: this.data.currentUser.studentId || '' });
  },

  onEditStudentIdInput(e) {
    this.setData({ editStudentId: e.detail.value });
  },

  onEditStudentIdConfirm() {
    const newStudentId = this.data.editStudentId.trim();
    if (!newStudentId) {
      wx.showToast({ title: '工号不能为空', icon: 'none' });
      return;
    }

    const oldStudentId = this.data.currentUser.studentId;

    // 检查新工号是否已被其他用户使用
    const app = getApp();
    const existingUser = app.globalData.users.find(u => u.studentId === newStudentId && u.studentId !== oldStudentId);
    if (existingUser) {
      wx.showToast({ title: '该工号已被使用', icon: 'none' });
      return;
    }

    // 更新用户的工号
    userService.updateProfile({ studentId: newStudentId });

    // 更新本地存储的会话信息
    const storageService = require('../../services/storageService');
    storageService.saveSession({ studentId: newStudentId });

    this.setData({ showEditStudentIdDialog: false, currentUser: userService.getCurrentUser() });
    wx.showToast({ title: '工号已更新', icon: 'success' });
  },

  onEditStudentIdCancel() {
    this.setData({ showEditStudentIdDialog: false });
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
