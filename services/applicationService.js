let _app = null;
function app() {
  if (!_app) _app = getApp();
  return _app;
}
const roomService = require('./roomService');
const userService = require('./userService');
const storageService = require('./storageService');

function _genId() {
  const id = app().globalData.nextApplicationId;
  app().globalData.nextApplicationId = id + 1;
  return 'APP' + String(id).padStart(3, '0');
}

function _now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function hasExistingApplication(applicantId, roomId, bedNo, type) {
  return app().globalData.applications.some(
    (a) =>
      a.applicantId === applicantId &&
      a.roomId === roomId &&
      a.bedNo === bedNo &&
      a.type === type &&
      a.status === 'pending',
  );
}

function submitApplication({ type, applicantId, applicantName, roomId, bedNo }) {
  if (hasExistingApplication(applicantId, roomId, bedNo, type)) {
    return { success: false, msg: '您已提交过相同申请，请勿重复提交' };
  }

  if (type === 'checkin') {
    const room = roomService.getRoomById(roomId);
    if (!room) return { success: false, msg: '房间不存在' };
    const bed = room.beds.find((b) => b.bedNo === bedNo);
    if (!bed || bed.status !== 'empty') return { success: false, msg: '该床位不可申请' };
    // 检查学生是否已有床位
    const existing = userService.getStudentBed(applicantId);
    if (existing) return { success: false, msg: '您已有床位，不可重复申请入住' };
  }

  if (type === 'checkout') {
    const room = roomService.getRoomById(roomId);
    if (!room) return { success: false, msg: '房间不存在' };
    const bed = room.beds.find((b) => b.bedNo === bedNo);
    if (!bed || bed.status !== 'occupied' || !bed.occupant || bed.occupant.studentId !== applicantId) {
      return { success: false, msg: '该床位不属于您' };
    }
  }

  const applicationId = _genId();
  app().globalData.applications.push({
    applicationId,
    type,
    status: 'pending',
    applicantId,
    applicantName,
    roomId,
    bedNo,
    createdAt: _now(),
    reviewedAt: null,
    reviewedBy: null,
  });
  storageService.persistFromGlobal();
  return { success: true, applicationId };
}

function getApplications(filter) {
  let list = app().globalData.applications;
  if (!filter) return list.slice();
  if (filter.status) list = list.filter((a) => a.status === filter.status);
  if (filter.type) list = list.filter((a) => a.type === filter.type);
  if (filter.applicantId) list = list.filter((a) => a.applicantId === filter.applicantId);
  return list.slice();
}

function getApplicationById(applicationId) {
  return app().globalData.applications.find((a) => a.applicationId === applicationId) || null;
}

function approveApplication(applicationId, reviewerStudentId) {
  const application = getApplicationById(applicationId);
  if (!application) return { success: false, msg: '申请不存在' };
  if (application.status !== 'pending') return { success: false, msg: '该申请已处理' };

  if (application.type === 'checkin') {
    const room = roomService.getRoomById(application.roomId);
    if (!room) return { success: false, msg: '房间不存在' };
    const bed = room.beds.find((b) => b.bedNo === application.bedNo);
    if (!bed || bed.status !== 'empty') return { success: false, msg: '该床位已被占用，申请无法通过' };

    const user = userService.getUserByStudentId(application.applicantId);
    const now = new Date();
    const leave = new Date();
    leave.setMonth(leave.getMonth() + 3);
    const pad = (n) => String(n).padStart(2, '0');
    const checkInDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const expectedLeaveDate = `${leave.getFullYear()}-${pad(leave.getMonth() + 1)}-${pad(leave.getDate())}`;

    roomService.checkInBed({
      roomId: application.roomId,
      bedNo: application.bedNo,
      occupant: {
        name: user ? user.name : application.applicantName,
        type: user ? user.type : '研究生',
        studentId: application.applicantId,
        phone: user ? user.phone : '',
        checkInDate,
        expectedLeaveDate,
      },
    });
  } else if (application.type === 'checkout') {
    roomService.checkOutBed({
      roomId: application.roomId,
      bedNo: application.bedNo,
    });
  }

  application.status = 'approved';
  application.reviewedAt = _now();
  application.reviewedBy = reviewerStudentId;
  storageService.persistFromGlobal();
  return { success: true };
}

function rejectApplication(applicationId, reviewerStudentId) {
  const application = getApplicationById(applicationId);
  if (!application) return { success: false, msg: '申请不存在' };
  if (application.status !== 'pending') return { success: false, msg: '该申请已处理' };

  application.status = 'rejected';
  application.reviewedAt = _now();
  application.reviewedBy = reviewerStudentId;
  storageService.persistFromGlobal();
  return { success: true };
}

function getPendingCount() {
  return app().globalData.applications.filter((a) => a.status === 'pending').length;
}

module.exports = {
  submitApplication,
  getApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  getPendingCount,
  hasExistingApplication,
};
