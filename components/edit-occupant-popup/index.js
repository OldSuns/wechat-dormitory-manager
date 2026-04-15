const { formatDate } = require('../../utils/excelValidator.js');

Component({
  properties: {
    visible: { type: Boolean, value: false },
    roomId: { type: String, value: '' },
    roomNumber: { type: String, value: '' },
    bedNo: { type: Number, value: 0 },
    occupant: { type: Object, value: null },
  },
  data: {
    formData: {
      name: '',
      type: '研究生',
      gender: '男',
      studentId: '',
      phone: '',
      checkInDate: '',
      expectedLeaveDate: '',
    },
    showCheckInPicker: false,
    showLeavePicker: false,
  },
  observers: {
    'visible, occupant': function (visible, occupant) {
      if (visible && occupant) {
        this.setData({
          formData: {
            name: occupant.name || '',
            type: occupant.type || '研究生',
            gender: occupant.gender || '男',
            studentId: occupant.studentId || '',
            phone: occupant.phone || '',
            checkInDate: occupant.checkInDate || '',
            expectedLeaveDate: occupant.expectedLeaveDate || '',
          },
        });
      }
    },
  },
  methods: {
    onClose() {
      this.triggerEvent('close');
    },
    onNameInput(e) {
      this.setData({ 'formData.name': e.detail.value });
    },
    onTypeChange(e) {
      this.setData({ 'formData.type': e.detail.value });
    },
    onGenderChange(e) {
      this.setData({ 'formData.gender': e.detail.value });
    },
    onStudentIdInput(e) {
      this.setData({ 'formData.studentId': e.detail.value });
    },
    onPhoneInput(e) {
      this.setData({ 'formData.phone': e.detail.value });
    },
    openCheckInPicker() {
      this.setData({ showCheckInPicker: true });
    },
    onCheckInDateConfirm(e) {
      this.setData({
        'formData.checkInDate': formatDate(new Date(e.detail.value)),
        showCheckInPicker: false,
      });
    },
    onCheckInDateCancel() {
      this.setData({ showCheckInPicker: false });
    },
    openLeavePicker() {
      this.setData({ showLeavePicker: true });
    },
    onLeaveDateConfirm(e) {
      this.setData({
        'formData.expectedLeaveDate': formatDate(new Date(e.detail.value)),
        showLeavePicker: false,
      });
    },
    onLeaveDateCancel() {
      this.setData({ showLeavePicker: false });
    },
    onSubmit() {
      const { name, type, gender, studentId } = this.data.formData;
      if (!name.trim()) {
        wx.showToast({ title: '请输入姓名', icon: 'none' });
        return;
      }
      if (!type) {
        wx.showToast({ title: '请选择人员类型', icon: 'none' });
        return;
      }
      if (!gender) {
        wx.showToast({ title: '请选择性别', icon: 'none' });
        return;
      }
      if (!studentId.trim()) {
        wx.showToast({ title: '请输入学号/工号', icon: 'none' });
        return;
      }
      this.triggerEvent('submit', {
        roomId: this.data.roomId,
        bedNo: this.data.bedNo,
        occupant: {
          name: name.trim(),
          type,
          gender,
          studentId: studentId.trim(),
          phone: (this.data.formData.phone || '').trim(),
          checkInDate: this.data.formData.checkInDate,
          expectedLeaveDate: this.data.formData.expectedLeaveDate,
        },
      });
    },
  },
});
