/**
 * storageService.js - 本地持久化服务
 * 负责数据集和会话的初始化、读写、恢复
 */

const mockData = require('../data/mockData');

const DATASET_KEY = 'dormitory_dataset';
const SESSION_KEY = 'dormitory_session';

// --- 数据集 ---

/** 从 mockData 生成初始数据集 */
function _buildDefaultDataset() {
  return {
    users: JSON.parse(JSON.stringify(mockData.users)),
    buildings: JSON.parse(JSON.stringify(mockData.buildings)),
    buildingData: JSON.parse(JSON.stringify(mockData.buildingData)),
    applications: [],
    nextApplicationId: 1,
  };
}

/** 读取本地数据集，失败或不存在则返回 null */
function loadDataset() {
  try {
    const data = wx.getStorageSync(DATASET_KEY);
    if (data && data.users && data.buildingData) return data;
    return null;
  } catch (e) {
    return null;
  }
}

/** 保存数据集到本地 */
function saveDataset(dataset) {
  try {
    wx.setStorageSync(DATASET_KEY, dataset);
    return true;
  } catch (e) {
    wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
    return false;
  }
}

/** 从 globalData 收集当前数据集并保存 */
function persistFromGlobal() {
  var app = getApp();
  var dataset = {
    users: app.globalData.users,
    buildings: app.globalData.buildings,
    buildingData: app.globalData.buildingData,
    applications: app.globalData.applications,
    nextApplicationId: app.globalData.nextApplicationId,
  };
  return saveDataset(dataset);
}

// --- 会话 ---

/** 读取当前会话 */
function loadSession() {
  try {
    return wx.getStorageSync(SESSION_KEY) || null;
  } catch (e) {
    return null;
  }
}

/** 保存当前会话 */
function saveSession(session) {
  try {
    wx.setStorageSync(SESSION_KEY, session);
  } catch (e) { /* ignore */ }
}

/** 清理当前会话 */
function clearSession() {
  try {
    wx.removeStorageSync(SESSION_KEY);
  } catch (e) { /* ignore */ }
}

// --- 初始化 ---

/**
 * 初始化 App.globalData
 * 1. 尝试从本地读取数据集
 * 2. 不存在则用 mockData 生成并写入本地
 * 3. 将数据集挂到 globalData
 * 4. 恢复会话（如果有效）
 * 返回 { sessionRestored: boolean, currentUser: object|null }
 */
function initGlobalData(appInstance) {
  var dataset = loadDataset();
  if (!dataset) {
    dataset = _buildDefaultDataset();
    saveDataset(dataset);
  }

  appInstance.globalData.users = dataset.users;
  appInstance.globalData.buildings = dataset.buildings || [];
  appInstance.globalData.buildingData = dataset.buildingData;
  appInstance.globalData.applications = dataset.applications || [];
  appInstance.globalData.nextApplicationId = dataset.nextApplicationId || 1;

  // 恢复会话
  var session = loadSession();
  if (session && session.studentId) {
    var user = dataset.users.find(function (u) { return u.studentId === session.studentId; });
    if (user) {
      appInstance.globalData.currentUser = Object.assign({}, user);
      appInstance.globalData.userRole = user.role;
      return { sessionRestored: true, currentUser: appInstance.globalData.currentUser };
    }
    // 会话无效，清除
    clearSession();
  }

  appInstance.globalData.currentUser = null;
  appInstance.globalData.userRole = null;
  return { sessionRestored: false, currentUser: null };
}

// --- 迁移旧存储键（可选） ---
function migrateOldKeys() {
  try {
    var oldLogin = wx.getStorageSync('dormitory_login');
    if (oldLogin && oldLogin.studentId && !loadSession()) {
      saveSession({ studentId: oldLogin.studentId });
    }
    wx.removeStorageSync('dormitory_login');
    wx.removeStorageSync('dormitory_openid');
  } catch (e) { /* ignore */ }
}

module.exports = {
  loadDataset: loadDataset,
  saveDataset: saveDataset,
  persistFromGlobal: persistFromGlobal,
  loadSession: loadSession,
  saveSession: saveSession,
  clearSession: clearSession,
  initGlobalData: initGlobalData,
  migrateOldKeys: migrateOldKeys,
};
