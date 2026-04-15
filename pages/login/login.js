const userService = require('../../services/userService');

Page({
  data: {
    studentId: '',
    errorMsg: '',
  },

  onLoad() {
    // 已有本地会话则直接跳转
    if (userService.isLoggedIn()) {
      this._routeByRole(userService.getRole());
      return;
    }
  },

  onStudentIdInput(e) {
    this.setData({ studentId: e.detail.value, errorMsg: '' });
  },

  onBind() {
    const { studentId } = this.data;
    if (!studentId.trim()) {
      this.setData({ errorMsg: '请输入学号/工号' });
      return;
    }
    const result = userService.login(studentId.trim());
    if (!result.success) {
      this.setData({ errorMsg: result.msg });
      return;
    }
    this._routeByRole(result.user.role);
  },

  _routeByRole(role) {
    if (role === 'admin') {
      wx.reLaunch({ url: '/pages/admin/admin' });
    } else {
      wx.reLaunch({ url: '/pages/student/student' });
    }
  },
});
