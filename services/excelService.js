/**
 * Excel导入导出服务
 */

const XLSX = require('../libs/xlsx.mini.min.js');
const validator = require('../utils/excelValidator.js');
const storageService = require('./storageService.js');

/**
 * 导出房间信息
 * @param {Object} app - 应用实例
 * @returns {Object} workbook
 */
function exportRooms(app) {
  const rooms = app.globalData.buildingData.rooms || [];
  const buildings = app.globalData.buildings || [];

  const data = rooms.map(room => {
    const building = buildings.find(b => b.id === room.buildingId);
    return {
      '楼栋': building ? building.name : room.buildingId,
      '楼层': room.floor,
      '房间号': room.roomNumber,
      '床位数': room.beds.length
    };
  });

  return XLSX.utils.json_to_sheet(data);
}

/**
 * 导出入住信息
 * @param {Object} app - 应用实例
 * @returns {Object} workbook
 */
function exportOccupants(app) {
  const rooms = app.globalData.buildingData.rooms || [];
  const buildings = app.globalData.buildings || [];
  const data = [];

  rooms.forEach(room => {
    const building = buildings.find(b => b.id === room.buildingId);
    const buildingName = building ? building.name : room.buildingId;
    room.beds.forEach(bed => {
      if (bed.status === 'occupied' && bed.occupant) {
        data.push({
          '楼栋': buildingName,
          '房间号': room.roomNumber,
          '床位号': bed.bedNo,
          '姓名': bed.occupant.name,
          '学号/工号': bed.occupant.studentId,
          '类型': bed.occupant.type,
          '性别': bed.occupant.gender || '',
          '手机号': bed.occupant.phone || '',
          '入住日期': bed.occupant.checkInDate,
          '预计退宿日期': bed.occupant.expectedLeaveDate
        });
      }
    });
  });

  return XLSX.utils.json_to_sheet(data);
}

/**
 * 导出用户信息
 * @param {Object} app - 应用实例
 * @returns {Object} workbook
 */
function exportUsers(app) {
  const users = app.globalData.users || [];

  const data = users.map(user => ({
    '学号/工号': user.studentId,
    '姓名': user.name,
    '角色': user.role,
    '手机号': user.phone || '',
    '类型': user.type || '',
    '性别': user.gender || ''
  }));

  return XLSX.utils.json_to_sheet(data);
}

/**
 * 导出所有数据到Excel文件
 * @param {Object} app - 应用实例
 * @returns {Promise<string>} 文件路径
 */
function exportAll(app) {
  return new Promise((resolve, reject) => {
    try {
      // 创建工作簿
      const wb = XLSX.utils.book_new();

      // 添加房间信息表
      const roomSheet = exportRooms(app);
      XLSX.utils.book_append_sheet(wb, roomSheet, '房间信息');

      // 添加入住信息表
      const occupantSheet = exportOccupants(app);
      XLSX.utils.book_append_sheet(wb, occupantSheet, '入住信息');

      // 添加用户信息表
      const userSheet = exportUsers(app);
      XLSX.utils.book_append_sheet(wb, userSheet, '用户信息');

      // 生成文件
      const wbout = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'base64'
      });

      // 生成文件名
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const fileName = `宿舍数据_${dateStr}.xlsx`;

      // 保存到临时文件
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

      fs.writeFile({
        filePath: filePath,
        data: wbout,
        encoding: 'base64',
        success: () => {
          resolve(filePath);
        },
        fail: (err) => {
          reject(err);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 解析Excel文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} 解析结果
 */
function parseExcelFile(filePath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();

    fs.readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (res) => {
        try {
          const wb = XLSX.read(res.data, { type: 'base64' });

          const result = {
            rooms: [],
            occupants: [],
            users: []
          };

          // 解析房间信息
          if (wb.SheetNames.includes('房间信息')) {
            const sheet = wb.Sheets['房间信息'];
            result.rooms = XLSX.utils.sheet_to_json(sheet);
          }

          // 解析入住信息
          if (wb.SheetNames.includes('入住信息')) {
            const sheet = wb.Sheets['入住信息'];
            result.occupants = XLSX.utils.sheet_to_json(sheet);
          }

          // 解析用户信息
          if (wb.SheetNames.includes('用户信息')) {
            const sheet = wb.Sheets['用户信息'];
            result.users = XLSX.utils.sheet_to_json(sheet);
          }

          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 导入房间数据
 * @param {Object} app - 应用实例
 * @param {Array} data - 房间数据
 * @param {string} mode - 导入模式 ('merge' | 'replace')
 * @returns {Object} 导入结果
 */
function importRooms(app, data, mode = 'merge') {
  const buildingData = app.globalData.buildingData;
  const roomService = require('./roomService.js');

  if (mode === 'replace') {
    // 修复：替换模式清空现有房间和楼栋
    buildingData.rooms = [];
    buildingData.floors = [];
    app.globalData.buildings = []; // 新增：清空楼栋数据
  }

  const existingRoomMap = new Map();
  buildingData.rooms.forEach(room => {
    existingRoomMap.set(`${room.buildingId}-${room.roomNumber}`, room);
  });

  let addedCount = 0;
  let updatedCount = 0;

  data.forEach(item => {
    // 自动创建楼栋（如果不存在）
    const buildingName = item['楼栋'];
    let buildingId = null;

    const buildings = app.globalData.buildings || [];
    let building = buildings.find(b => b.name === buildingName);

    if (!building) {
      // 生成楼栋ID：使用时间戳+随机数确保唯一性
      buildingId = `building_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      roomService.addBuilding(buildingId, buildingName);
    } else {
      buildingId = building.id;
    }

    const roomKey = `${buildingId}-${item['房间号']}`;
    const existingRoom = existingRoomMap.get(roomKey);

    if (existingRoom) {
      // 更新现有房间
      existingRoom.buildingId = buildingId;
      existingRoom.floor = item['楼层'];

      // 调整床位数
      const currentBedCount = existingRoom.beds.length;
      const newBedCount = item['床位数'];

      if (newBedCount > currentBedCount) {
        // 增加床位
        for (let i = currentBedCount + 1; i <= newBedCount; i++) {
          existingRoom.beds.push({
            bedNo: i,
            status: 'empty',
            occupant: null
          });
        }
      } else if (newBedCount < currentBedCount) {
        // 修复：减少床位时严格检查
        // 检查是否有超出范围的占用床位
        const outOfRangeBeds = existingRoom.beds.filter(bed =>
          bed.bedNo > newBedCount && bed.status === 'occupied'
        );

        if (outOfRangeBeds.length > 0) {
          // 跳过此房间，记录错误（需要在外层处理）
          console.warn(`房间 ${buildingName}-${item['房间号']} 的 ${outOfRangeBeds.map(b => b.bedNo).join(',')} 号床有人入住，无法缩减到 ${newBedCount} 个床位`);
          return; // 跳过此房间的更新
        }

        // 只保留床位号在范围内的床位
        existingRoom.beds = existingRoom.beds.filter(bed => bed.bedNo <= newBedCount);
      }

      updatedCount++;
    } else {
      // 添加新房间
      const beds = [];
      for (let i = 1; i <= item['床位数']; i++) {
        beds.push({
          bedNo: i,
          status: 'empty',
          occupant: null
        });
      }

      const newRoom = {
        roomId: `${buildingId}-${item['房间号']}`,
        buildingId: buildingId,
        floor: item['楼层'],
        roomNumber: item['房间号'],
        beds: beds
      };

      buildingData.rooms.push(newRoom);
      addedCount++;
    }
  });

  // 更新楼层列表
  const floors = new Set();
  buildingData.rooms.forEach(room => floors.add(room.floor));
  buildingData.floors = Array.from(floors).sort((a, b) => a - b);

  return {
    success: true,
    addedCount,
    updatedCount
  };
}

/**
 * 导入入住信息
 * @param {Object} app - 应用实例
 * @param {Array} data - 入住数据
 * @param {string} mode - 导入模式 ('merge' | 'replace')
 * @returns {Object} 导入结果
 */
function importOccupants(app, data, mode = 'merge') {
  const buildingData = app.globalData.buildingData;
  const buildings = app.globalData.buildings || [];

  if (mode === 'replace') {
    // 替换模式：清空所有床位
    buildingData.rooms.forEach(room => {
      room.beds.forEach(bed => {
        bed.status = 'empty';
        bed.occupant = null;
      });
    });
  }

  // 创建房间映射（楼栋+房间号）
  const roomMap = new Map();
  buildingData.rooms.forEach(room => {
    roomMap.set(`${room.buildingId}-${room.roomNumber}`, room);
  });

  let addedCount = 0;
  let updatedCount = 0;
  const errors = [];

  data.forEach(item => {
    // 查找楼栋ID
    const buildingName = item['楼栋'];
    const building = buildings.find(b => b.name === buildingName);

    if (!building) {
      errors.push(`楼栋"${buildingName}"不存在`);
      return;
    }

    const roomKey = `${building.id}-${item['房间号']}`;
    const room = roomMap.get(roomKey);

    if (!room) {
      errors.push(`房间"${buildingName}-${item['房间号']}"不存在`);
      return;
    }

    const bed = room.beds.find(b => b.bedNo === item['床位号']);

    if (!bed) {
      errors.push(`房间"${buildingName}-${item['房间号']}"的床位${item['床位号']}不存在`);
      return;
    }

    const wasOccupied = bed.status === 'occupied';

    bed.status = 'occupied';
    bed.occupant = {
      name: item['姓名'],
      studentId: item['学号/工号'],
      type: item['类型'],
      gender: item['性别'],
      phone: item['手机号'],
      checkInDate: item['入住日期'],
      expectedLeaveDate: item['预计退宿日期']
    };

    if (wasOccupied) {
      updatedCount++;
    } else {
      addedCount++;
    }

    // 确保用户存在
    const users = app.globalData.users;
    const userExists = users.some(u => u.studentId === item['学号/工号']);

    if (!userExists) {
      users.push({
        userId: `U${Date.now()}${Math.random().toString(36).slice(2, 11)}`,
        studentId: item['学号/工号'],
        name: item['姓名'],
        role: item['角色'] || 'student', // 修复：支持从Excel读取角色
        phone: item['手机号'],
        type: item['类型'],
        gender: item['性别']
      });
    }
  });

  return {
    success: errors.length === 0,
    addedCount,
    updatedCount,
    errors
  };
}

/**
 * 导入用户数据
 * @param {Object} app - 应用实例
 * @param {Array} data - 用户数据
 * @param {string} mode - 导入模式 ('merge' | 'replace')
 * @returns {Object} 导入结果
 */
function importUsers(app, data, mode = 'merge') {
  const users = app.globalData.users;

  if (mode === 'replace') {
    // 替换模式：清空现有用户（保留管理员）
    app.globalData.users = users.filter(u => u.role === 'admin');
  }

  const existingUserMap = new Map();
  app.globalData.users.forEach(user => {
    existingUserMap.set(user.studentId, user);
  });

  let addedCount = 0;
  let updatedCount = 0;

  data.forEach(item => {
    const existingUser = existingUserMap.get(item.studentId);

    if (existingUser) {
      // 更新现有用户
      // 保护管理员账号：不允许修改管理员的角色
      if (existingUser.role === 'admin') {
        // 只更新非角色字段
        existingUser.name = item.name;
        existingUser.phone = item.phone;
        existingUser.type = item.type;
        existingUser.gender = item.gender;
        // 保持 role 不变
      } else {
        // 普通用户可以完全更新
        existingUser.name = item.name;
        existingUser.role = item.role;
        existingUser.phone = item.phone;
        existingUser.type = item.type;
        existingUser.gender = item.gender;
      }
      updatedCount++;
    } else {
      // 添加新用户
      app.globalData.users.push({
        userId: `U${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        studentId: item.studentId,
        name: item.name,
        role: item.role,
        phone: item.phone,
        type: item.type,
        gender: item.gender
      });
      addedCount++;
    }
  });

  return {
    success: true,
    addedCount,
    updatedCount
  };
}

/**
 * 导入Excel数据
 * @param {Object} app - 应用实例
 * @param {string} filePath - 文件路径
 * @param {string} mode - 导入模式 ('merge' | 'replace')
 * @returns {Promise<Object>} 导入结果
 */
async function importExcel(app, filePath, mode = 'merge') {
  try {
    // 解析文件
    const parsedData = await parseExcelFile(filePath);

    // 验证房间和用户数据
    const roomValidation = validator.validateRoomData(parsedData.rooms);
    if (!roomValidation.valid) {
      return {
        success: false,
        error: '房间信息验证失败',
        details: validator.formatErrors(roomValidation.errors)
      };
    }

    const userValidation = validator.validateUserData(parsedData.users);
    if (!userValidation.valid) {
      return {
        success: false,
        error: '用户信息验证失败',
        details: validator.formatErrors(userValidation.errors)
      };
    }

    // 创建备份（替换模式）
    let backup = null;
    if (mode === 'replace') {
      backup = {
        rooms: JSON.parse(JSON.stringify(app.globalData.buildingData.rooms)),
        floors: JSON.parse(JSON.stringify(app.globalData.buildingData.floors)),
        users: JSON.parse(JSON.stringify(app.globalData.users)),
        applications: JSON.parse(JSON.stringify(app.globalData.applications || []))
      };
    }

    try {
      // 先导入房间
      const roomResult = importRooms(app, roomValidation.data, mode);

      // 验证入住信息（使用导入后的房间数据）
      const occupantValidation = validator.validateOccupantData(
        parsedData.occupants,
        app.globalData.buildingData.rooms
      );
      if (!occupantValidation.valid) {
        // 回滚房间导入
        if (backup) {
          app.globalData.buildingData.rooms = backup.rooms;
          app.globalData.buildingData.floors = backup.floors;
        }
        return {
          success: false,
          error: '入住信息验证失败',
          details: validator.formatErrors(occupantValidation.errors)
        };
      }

      // 导入入住信息和用户
      const occupantResult = importOccupants(app, occupantValidation.data, mode);

      // 检查入住信息导入是否有错误
      if (!occupantResult.success && occupantResult.errors && occupantResult.errors.length > 0) {
        // 回滚
        if (backup) {
          app.globalData.buildingData.rooms = backup.rooms;
          app.globalData.buildingData.floors = backup.floors;
          app.globalData.users = backup.users;
        }
        return {
          success: false,
          error: '入住信息导入失败',
          details: occupantResult.errors.join('\n')
        };
      }

      const userResult = importUsers(app, userValidation.data, mode);

      // 持久化
      storageService.persistFromGlobal(app);

      return {
        success: true,
        rooms: roomResult,
        occupants: occupantResult,
        users: userResult
      };
    } catch (error) {
      // 回滚
      if (backup) {
        app.globalData.buildingData.rooms = backup.rooms;
        app.globalData.buildingData.floors = backup.floors;
        app.globalData.users = backup.users;
        storageService.persistFromGlobal(app);
      }
      throw error;
    }
  } catch (error) {
    return {
      success: false,
      error: '导入失败',
      details: error.message || String(error)
    };
  }
}

/**
 * 生成导入模板
 * @returns {Promise<string>} 文件路径
 */
function generateTemplate() {
  return new Promise((resolve, reject) => {
    try {
      const wb = XLSX.utils.book_new();

      // 房间信息模板
      const roomTemplate = [
        { '楼栋(必填)': '10号楼', '楼层(必填)': 1, '房间号(必填)': '101', '床位数(必填)': 6 },
        { '楼栋(必填)': '10号楼', '楼层(必填)': 1, '房间号(必填)': '102', '床位数(必填)': 6 },
        { '楼栋(必填)': '11号楼', '楼层(必填)': 2, '房间号(必填)': '201', '床位数(必填)': 4 }
      ];
      const roomSheet = XLSX.utils.json_to_sheet(roomTemplate);
      XLSX.utils.book_append_sheet(wb, roomSheet, '房间信息');

      // 入住信息模板
      const occupantTemplate = [
        {
          '楼栋(必填)': '10号楼',
          '房间号(必填)': '101',
          '床位号(必填)': 1,
          '姓名(必填)': '张三',
          '学号/工号(必填)': '2024001',
          '类型(可选)': '研究生',
          '性别(必填)': '男',
          '手机号(可选)': '13800138000',
          '入住日期(可选)': '2026-04-01',
          '预计退宿日期(可选)': ''
        },
        {
          '楼栋(必填)': '10号楼',
          '房间号(必填)': '101',
          '床位号(必填)': 2,
          '姓名(必填)': '李四',
          '学号/工号(必填)': '2024002',
          '类型(可选)': '实习生',
          '性别(必填)': '女',
          '手机号(可选)': '',
          '入住日期(可选)': '2026-04-15',
          '预计退宿日期(可选)': '2026-07-15'
        }
      ];
      const occupantSheet = XLSX.utils.json_to_sheet(occupantTemplate);
      XLSX.utils.book_append_sheet(wb, occupantSheet, '入住信息');

      // 用户信息模板
      const userTemplate = [
        {
          '学号/工号(必填)': 'admin001',
          '姓名(必填)': '管理员',
          '角色(必填)': 'admin',
          '手机号(可选)': '13900139000',
          '类型(可选)': '管理员',
          '性别(可选)': '男'
        },
        {
          '学号/工号(必填)': '2024001',
          '姓名(必填)': '张三',
          '角色(必填)': 'student',
          '手机号(可选)': '13800138000',
          '类型(可选)': '研究生',
          '性别(可选)': '男'
        },
        {
          '学号/工号(必填)': '2024002',
          '姓名(必填)': '李四',
          '角色(必填)': 'student',
          '手机号(可选)': '',
          '类型(可选)': '实习生',
          '性别(可选)': '女'
        }
      ];
      const userSheet = XLSX.utils.json_to_sheet(userTemplate);
      XLSX.utils.book_append_sheet(wb, userSheet, '用户信息');

      // 生成文件
      const wbout = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'base64'
      });

      const fileName = '宿舍数据导入模板.xlsx';
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

      fs.writeFile({
        filePath: filePath,
        data: wbout,
        encoding: 'base64',
        success: () => {
          resolve(filePath);
        },
        fail: (err) => {
          reject(err);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  exportAll,
  importExcel,
  generateTemplate
};
