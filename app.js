const storageService = require('./services/storageService');

App({
  globalData: {
    userRole: null,
    currentUser: null,
    nextApplicationId: 1,
    applications: [],
    users: [],
    buildings: [],
    buildingData: { floors: [], rooms: [] },
  },
  onLaunch() {
    // 迁移旧存储键（兼容一次）
    storageService.migrateOldKeys();
    // 从本地存储初始化全局数据并恢复会话
    storageService.initGlobalData(this);
  },
});
