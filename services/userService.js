/**
 * userService.js - 用户身份服务（本地单机版）
 * 不依赖微信登录或后端，身份通过本地绑定学号/工号完成
 */

const storageService = require('./storageService');

let _app = null;
function app() {
  if (!_app) _app = getApp();
  return _app;
}
function _setApp(instance) {
  _app = instance;
}

/** 登录（本地身份绑定） */
function login(studentId) {
  const user = getUserByStudentId(studentId);
  if (!user) return { success: false, msg: '身份未注册' };
  app().globalData.currentUser = Object.assign({}, user);
  app().globalData.userRole = user.role;
  storageService.saveSession({ studentId: studentId });
  return { success: true, user: app().globalData.currentUser };
}

/** 从本地会话自动恢复登录（app.js onLaunch 可调用，也由 storageService.initGlobalData 完成） */
function restoreLogin(appInstance) {
  if (appInstance) _setApp(appInstance);
  var session = storageService.loadSession();
  if (!session || !session.studentId) return false;
  var user = getUserByStudentId(session.studentId);
  if (!user) {
    storageService.clearSession();
    return false;
  }
  app().globalData.currentUser = Object.assign({}, user);
  app().globalData.userRole = user.role;
  return true;
}

function getCurrentUser() {
  return app().globalData.currentUser;
}

function isLoggedIn() {
  return !!app().globalData.currentUser;
}

function getRole() {
  return app().globalData.userRole;
}

/** 退出登录：仅清会话，不清业务数据 */
function logout() {
  app().globalData.currentUser = null;
  app().globalData.userRole = null;
  storageService.clearSession();
}

/** 换绑：切换到新学号/工号 */
function rebind(newStudentId) {
  const user = getUserByStudentId(newStudentId);
  if (!user) return { success: false, msg: '身份未注册' };
  app().globalData.currentUser = Object.assign({}, user);
  app().globalData.userRole = user.role;
  storageService.saveSession({ studentId: newStudentId });
  return { success: true, user: app().globalData.currentUser };
}

/** 修改当前用户的资料并持久化 */
function updateProfile({ phone, type, avatarUrl, nickName }) {
  const cur = app().globalData.currentUser;
  if (!cur) return { success: false, msg: '未登录' };
  if (phone !== undefined) cur.phone = phone;
  if (type !== undefined) cur.type = type;
  if (avatarUrl !== undefined) cur.avatarUrl = avatarUrl;
  if (nickName !== undefined) cur.nickName = nickName;
  // 同步到 users 表
  const userInTable = app().globalData.users.find((u) => u.studentId === cur.studentId);
  if (userInTable) {
    if (phone !== undefined) userInTable.phone = phone;
    if (type !== undefined) userInTable.type = type;
    if (avatarUrl !== undefined) userInTable.avatarUrl = avatarUrl;
    if (nickName !== undefined) userInTable.nickName = nickName;
  }
  // 持久化
  storageService.persistFromGlobal();
  return { success: true };
}

/** 管理员修改指定学生的信息并持久化 */
function updateStudentInfo(targetStudentId, { name, gender, phone, type }) {
  const user = app().globalData.users.find((u) => u.studentId === targetStudentId);

  // 如果用户已注册,更新用户信息
  if (user) {
    if (name !== undefined) user.name = name;
    if (gender !== undefined) user.gender = gender;
    if (phone !== undefined) user.phone = phone;
    if (type !== undefined) user.type = type;
  }

  // 同步更新床位占用信息中的学生信息
  let foundInBed = false;
  const rooms = app().globalData.buildingData.rooms;
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    for (let j = 0; j < room.beds.length; j++) {
      const bed = room.beds[j];
      if (bed.status === 'occupied' && bed.occupant && bed.occupant.studentId === targetStudentId) {
        foundInBed = true;
        if (name !== undefined) bed.occupant.name = name;
        if (gender !== undefined) bed.occupant.gender = gender;
        if (phone !== undefined) bed.occupant.phone = phone;
        if (type !== undefined) bed.occupant.type = type;
      }
    }
  }

  // 如果学生既未注册也未入住,返回错误
  if (!user && !foundInBed) {
    return { success: false, msg: '学生不存在' };
  }

  // 持久化
  storageService.persistFromGlobal();
  return { success: true };
}

function getUserByStudentId(studentId) {
  return app().globalData.users.find((u) => u.studentId === studentId) || null;
}

function getAllUsers() {
  return app().globalData.users;
}

function getStudentBed(studentId) {
  const rooms = app().globalData.buildingData.rooms;
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    for (let j = 0; j < room.beds.length; j++) {
      const bed = room.beds[j];
      if (bed.status === 'occupied' && bed.occupant && bed.occupant.studentId === studentId) {
        return { room, bed };
      }
    }
  }
  return null;
}

/**
 * 修改用户的学号/工号
 * @param {string} oldStudentId - 原学号/工号
 * @param {string} newStudentId - 新学号/工号
 * @returns {Object} 操作结果
 */
function updateStudentId(oldStudentId, newStudentId) {
  // 1. 验证参数
  if (!oldStudentId || !newStudentId) {
    return { success: false, msg: '学号/工号不能为空' };
  }

  if (oldStudentId === newStudentId) {
    return { success: false, msg: '新旧学号/工号相同' };
  }

  // 2. 查找原用户
  const user = app().globalData.users.find((u) => u.studentId === oldStudentId);
  if (!user) {
    return { success: false, msg: '用户不存在' };
  }

  // 3. 检查新工号是否已被使用
  const existingUser = app().globalData.users.find((u) => u.studentId === newStudentId);
  if (existingUser) {
    return { success: false, msg: '该学号/工号已被使用' };
  }

  // 4. 更新 users 数组中的 studentId
  user.studentId = newStudentId;

  // 5. 如果是当前登录用户,更新 currentUser
  const cur = app().globalData.currentUser;
  if (cur && cur.studentId === oldStudentId) {
    cur.studentId = newStudentId;
  }

  // 6. 同步更新床位占用信息
  const rooms = app().globalData.buildingData.rooms;
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    for (let j = 0; j < room.beds.length; j++) {
      const bed = room.beds[j];
      if (bed.status === 'occupied' && bed.occupant && bed.occupant.studentId === oldStudentId) {
        bed.occupant.studentId = newStudentId;
      }
    }
  }

  // 7. 同步更新申请记录
  const applications = app().globalData.applications || [];
  for (let i = 0; i < applications.length; i++) {
    if (applications[i].applicantId === oldStudentId) {
      applications[i].applicantId = newStudentId;
    }
  }

  // 8. 更新会话
  storageService.saveSession({ studentId: newStudentId });

  // 9. 持久化
  storageService.persistFromGlobal();

  return { success: true };
}

module.exports = {
  login,
  restoreLogin,
  getCurrentUser,
  isLoggedIn,
  getRole,
  logout,
  rebind,
  updateProfile,
  updateStudentInfo,
  updateStudentId,
  getUserByStudentId,
  getAllUsers,
  getStudentBed,
};
