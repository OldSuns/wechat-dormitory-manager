/**
 * roomService.js - 宿舍床位管理服务层
 * 封装所有数据读取、统计、入住、退宿操作
 */

const storageService = require('./storageService');

let _app = null;
function app() {
  if (!_app) _app = getApp();
  return _app;
}

/** 判断日期是否在 N 天内 */
function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return diff > 0 && diff <= days * 24 * 60 * 60 * 1000;
}

/** 即将退宿：7 天内 */
function isLeavingSoon(expectedLeaveDate) {
  return isWithinDays(expectedLeaveDate, 7);
}

/** 获取所有楼栋 */
function getBuildings() {
  return app().globalData.buildings || [];
}

/** 添加楼栋 */
function addBuilding(id, name) {
  const buildings = app().globalData.buildings || [];
  if (buildings.some(b => b.id === id)) {
    return { success: false, msg: '楼栋ID已存在' };
  }
  buildings.push({ id, name });
  app().globalData.buildings = buildings;
  storageService.persistFromGlobal();
  return { success: true };
}

/** 删除楼栋 */
function deleteBuilding(buildingId) {
  const rooms = app().globalData.buildingData.rooms;
  if (rooms.some(r => r.buildingId === buildingId)) {
    return { success: false, msg: '该楼栋下还有房间，无法删除' };
  }
  const buildings = app().globalData.buildings || [];
  const idx = buildings.findIndex(b => b.id === buildingId);
  if (idx !== -1) {
    buildings.splice(idx, 1);
    storageService.persistFromGlobal();
  }
  return { success: true };
}

/** 获取指定楼栋的楼层列表 */
function getFloorsByBuilding(buildingId) {
  const rooms = app().globalData.buildingData.rooms.filter(r => r.buildingId === buildingId);
  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  return floors;
}

/** 获取所有楼层（兼容旧代码） */
function getFloors() {
  return app().globalData.buildingData.floors;
}

/** 获取指定楼栋和楼层的房间列表 */
function getRoomsByFloor(buildingId, floor) {
  if (buildingId) {
    return app().globalData.buildingData.rooms.filter((r) => r.buildingId === buildingId && r.floor === floor);
  }
  return app().globalData.buildingData.rooms.filter((r) => r.floor === floor);
}

/** 获取指定楼栋的所有房间 */
function getRoomsByBuilding(buildingId) {
  return app().globalData.buildingData.rooms.filter((r) => r.buildingId === buildingId);
}

/** 根据 roomId 获取房间 */
function getRoomById(roomId) {
  return app().globalData.buildingData.rooms.find((r) => r.roomId === roomId);
}

/** 获取房间摘要统计 */
function getRoomSummary(roomId) {
  const room = getRoomById(roomId);
  if (!room) return null;
  const totalBeds = room.beds.length;
  const emptyBeds = room.beds.filter((b) => b.status === 'empty').length;
  const leavingSoonCount = room.beds.filter(
    (b) => b.status === 'occupied' && isLeavingSoon(b.occupant && b.occupant.expectedLeaveDate),
  ).length;
  const occupiedBeds = totalBeds - emptyBeds;

  let statusType = 'available'; // 有空床
  if (emptyBeds === 0) statusType = 'full';
  if (leavingSoonCount > 0) statusType = 'leaving-soon';

  return {
    totalBeds,
    emptyBeds,
    occupiedBeds,
    leavingSoonCount,
    statusType,
    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
  };
}

/** 获取楼层汇总统计 */
function getFloorSummary(buildingId, floor) {
  const rooms = getRoomsByFloor(buildingId, floor);
  let totalRooms = rooms.length;
  let totalBeds = 0;
  let emptyBeds = 0;
  let leavingSoonCount = 0;

  rooms.forEach((room) => {
    room.beds.forEach((bed) => {
      totalBeds++;
      if (bed.status === 'empty') emptyBeds++;
      if (
        bed.status === 'occupied' &&
        bed.occupant &&
        isLeavingSoon(bed.occupant.expectedLeaveDate)
      ) {
        leavingSoonCount++;
      }
    });
  });

  return { totalRooms, totalBeds, emptyBeds, leavingSoonCount };
}

/** 办理入住 */
function checkInBed({ roomId, bedNo, occupant }) {
  const room = getRoomById(roomId);
  if (!room) return { success: false, msg: '房间不存在' };
  const bed = room.beds.find((b) => b.bedNo === bedNo);
  if (!bed) return { success: false, msg: '床位不存在' };
  if (bed.status === 'occupied') return { success: false, msg: '该床位已有人入住' };

  bed.status = 'occupied';
  bed.occupant = {
    name: occupant.name,
    type: occupant.type,
    studentId: occupant.studentId,
    phone: occupant.phone,
    checkInDate: occupant.checkInDate,
    expectedLeaveDate: occupant.expectedLeaveDate,
  };
  storageService.persistFromGlobal();
  return { success: true };
}

/** 办理退宿 */
function checkOutBed({ roomId, bedNo }) {
  const room = getRoomById(roomId);
  if (!room) return { success: false, msg: '房间不存在' };
  const bed = room.beds.find((b) => b.bedNo === bedNo);
  if (!bed) return { success: false, msg: '床位不存在' };

  bed.status = 'empty';
  bed.occupant = null;
  storageService.persistFromGlobal();
  return { success: true };
}

/** 获取全部房间 */
function getAllRooms() {
  return app().globalData.buildingData.rooms;
}

/** 全楼统计 */
function getBuildingSummary() {
  const rooms = app().globalData.buildingData.rooms;
  let totalRooms = rooms.length;
  let totalBeds = 0;
  let emptyBeds = 0;
  let leavingSoonCount = 0;

  rooms.forEach((room) => {
    room.beds.forEach((bed) => {
      totalBeds++;
      if (bed.status === 'empty') emptyBeds++;
      if (bed.status === 'occupied' && bed.occupant && isLeavingSoon(bed.occupant.expectedLeaveDate)) {
        leavingSoonCount++;
      }
    });
  });

  return { totalRooms, totalBeds, emptyBeds, occupiedBeds: totalBeds - emptyBeds, leavingSoonCount };
}

/** 新增房间 */
function addRoom({ buildingId, floor, roomNumber, bedCount }) {
  const rooms = app().globalData.buildingData.rooms;
  // 检查同一楼栋下是否有相同房间号
  if (rooms.some((r) => r.buildingId === buildingId && r.roomNumber === roomNumber)) {
    return { success: false, msg: '该楼栋下房间号已存在' };
  }

  // 确保楼栋存在
  const buildings = app().globalData.buildings || [];
  if (!buildings.some(b => b.id === buildingId)) {
    return { success: false, msg: '楼栋不存在' };
  }

  const floors = app().globalData.buildingData.floors;
  if (!floors.includes(floor)) {
    floors.push(floor);
    floors.sort((a, b) => a - b);
  }
  const beds = [];
  for (let i = 1; i <= bedCount; i++) {
    beds.push({ bedNo: i, status: 'empty', occupant: null });
  }
  // 使用 buildingId-roomNumber 作为唯一 roomId
  const roomId = `${buildingId}-${roomNumber}`;
  rooms.push({ roomId, buildingId, floor, roomNumber, beds });
  storageService.persistFromGlobal();
  return { success: true };
}

/** 删除房间（仅全部空床时允许） */
function deleteRoom(roomId) {
  const buildingData = app().globalData.buildingData;
  const rooms = buildingData.rooms;
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx === -1) return { success: false, msg: '房间不存在' };
  const room = rooms[idx];
  if (room.beds.some((b) => b.status === 'occupied')) {
    return { success: false, msg: '房间内有住客，无法删除' };
  }
  const deletedFloor = room.floor;
  rooms.splice(idx, 1);

  // 检查该楼层是否还有其他房间，如果没有则从楼层列表中移除
  const hasRoomsOnFloor = rooms.some((r) => r.floor === deletedFloor);
  if (!hasRoomsOnFloor) {
    const floorIdx = buildingData.floors.indexOf(deletedFloor);
    if (floorIdx !== -1) {
      buildingData.floors.splice(floorIdx, 1);
    }
  }

  storageService.persistFromGlobal();
  return { success: true };
}

/** 修改床位数量 */
function modifyBedCount(roomId, newCount) {
  const room = getRoomById(roomId);
  if (!room) return { success: false, msg: '房间不存在' };
  if (newCount < 1) return { success: false, msg: '至少保留1个床位' };

  const currentCount = room.beds.length;
  if (newCount > currentCount) {
    for (let i = currentCount + 1; i <= newCount; i++) {
      room.beds.push({ bedNo: i, status: 'empty', occupant: null });
    }
  } else if (newCount < currentCount) {
    for (let i = currentCount; i > newCount; i--) {
      const bed = room.beds[i - 1];
      if (bed.status === 'occupied') {
        return { success: false, msg: `${i}号床有住客，无法缩减` };
      }
      room.beds.pop();
    }
  }
  storageService.persistFromGlobal();
  return { success: true };
}

/** 更新房间基本信息 (楼栋、楼层、门牌号) */
function updateRoomInfo(roomId, { buildingId, floor, roomNumber }) {
  const room = getRoomById(roomId);
  if (!room) return { success: false, msg: '房间不存在' };

  if (!floor || floor < 1 || !Number.isInteger(floor)) {
    return { success: false, msg: '请输入有效的楼层号（正整数）' };
  }

  if (buildingId) {
    const buildings = app().globalData.buildings || [];
    if (!buildings.some(b => b.id === buildingId)) {
      return { success: false, msg: '楼栋不存在' };
    }
  }

  // 检查房间号是否在同一楼栋下重复
  const targetBuildingId = buildingId || room.buildingId;
  if (roomNumber !== room.roomNumber || targetBuildingId !== room.buildingId) {
    const rooms = app().globalData.buildingData.rooms;
    if (rooms.some(r => r.buildingId === targetBuildingId && r.roomNumber === roomNumber && r.roomId !== roomId)) {
      return { success: false, msg: '该楼栋下门牌号已存在' };
    }
  }

  const oldFloor = room.floor;
  const oldBuildingId = room.buildingId;
  if (buildingId) room.buildingId = buildingId;
  room.floor = floor;
  room.roomNumber = roomNumber;
  // 更新 roomId 为新的 buildingId-roomNumber
  room.roomId = `${room.buildingId}-${roomNumber}`;

  const buildingData = app().globalData.buildingData;
  if (!buildingData.floors.includes(floor)) {
    buildingData.floors.push(floor);
    buildingData.floors.sort((a, b) => a - b);
  }

  if (oldFloor !== floor) {
    const hasRoomsOnOldFloor = buildingData.rooms.some(r => r.floor === oldFloor);
    if (!hasRoomsOnOldFloor) {
      const floorIdx = buildingData.floors.indexOf(oldFloor);
      if (floorIdx !== -1) {
        buildingData.floors.splice(floorIdx, 1);
      }
    }
  }

  storageService.persistFromGlobal();
  return { success: true };
}

/** 获取所有空床位 */
function getEmptyBeds() {
  const rooms = getAllRooms();
  const buildings = app().globalData.buildings || [];
  const emptyBeds = [];

  rooms.forEach(room => {
    const building = buildings.find(b => b.id === room.buildingId);
    room.beds.forEach(bed => {
      if (bed.status === 'empty') {
        emptyBeds.push({
          roomId: room.roomId,
          roomNumber: room.roomNumber,
          buildingId: room.buildingId,
          buildingName: building ? building.name : '',
          floor: room.floor,
          bedNo: bed.bedNo,
          label: `${building ? building.name + '-' : ''}${room.roomNumber}号房间 ${bed.bedNo}号床`
        });
      }
    });
  });

  return emptyBeds;
}

/** 检查房间是否有异性住客 */
function checkGenderConflict(roomId, gender) {
  const room = getRoomById(roomId);
  if (!room) return { hasConflict: false };

  const occupiedBeds = room.beds.filter(b => b.status === 'occupied' && b.occupant);
  if (occupiedBeds.length === 0) return { hasConflict: false };

  const hasConflict = occupiedBeds.some(b => b.occupant.gender !== gender);
  return {
    hasConflict,
    existingGender: occupiedBeds[0].occupant.gender
  };
}

/** 换床位 */
function transferBed({ studentId, newRoomId, newBedNo, forceTransfer = false }) {
  // 1. 查找学生当前床位
  const userService = require('./userService');
  const currentBed = userService.getStudentBed(studentId);

  if (!currentBed) {
    return { success: false, msg: '学生未入住任何床位' };
  }

  // 2. 验证新床位
  const newRoom = getRoomById(newRoomId);
  if (!newRoom) return { success: false, msg: '目标房间不存在' };

  const newBed = newRoom.beds.find(b => b.bedNo === newBedNo);
  if (!newBed) return { success: false, msg: '目标床位不存在' };

  if (newBed.status === 'occupied') {
    return { success: false, msg: '目标床位已有人入住' };
  }

  // 3. 检查性别冲突
  if (!forceTransfer) {
    const genderCheck = checkGenderConflict(newRoomId, currentBed.occupant.gender);
    if (genderCheck.hasConflict) {
      return {
        success: false,
        needConfirm: true,
        msg: `目标房间已有${genderCheck.existingGender}性住客，确认要换入吗？`
      };
    }
  }

  // 4. 保存占用信息
  const occupantData = { ...currentBed.occupant };

  // 5. 退出旧床位
  const checkOutResult = checkOutBed({
    roomId: currentBed.roomId,
    bedNo: currentBed.bedNo
  });

  if (!checkOutResult.success) {
    return { success: false, msg: '退出原床位失败' };
  }

  // 6. 入住新床位
  const checkInResult = checkInBed({
    roomId: newRoomId,
    bedNo: newBedNo,
    occupant: occupantData
  });

  if (!checkInResult.success) {
    // 回滚：重新入住原床位
    checkInBed({
      roomId: currentBed.roomId,
      bedNo: currentBed.bedNo,
      occupant: occupantData
    });
    return { success: false, msg: '入住新床位失败' };
  }

  return { success: true };
}

/** 编辑在住人员信息 */
function updateOccupant({ roomId, bedNo, occupant }) {
  const room = getRoomById(roomId);
  if (!room) return { success: false, msg: '房间不存在' };
  const bed = room.beds.find((b) => b.bedNo === bedNo);
  if (!bed) return { success: false, msg: '床位不存在' };
  if (bed.status !== 'occupied') return { success: false, msg: '该床位无住客' };
  Object.assign(bed.occupant, occupant);
  storageService.persistFromGlobal();
  return { success: true };
}

module.exports = {
  isLeavingSoon,
  getBuildings,
  addBuilding,
  deleteBuilding,
  getFloorsByBuilding,
  getFloors,
  getRoomsByBuilding,
  getRoomsByFloor,
  getRoomById,
  getRoomSummary,
  getFloorSummary,
  checkInBed,
  checkOutBed,
  getAllRooms,
  getBuildingSummary,
  addRoom,
  deleteRoom,
  modifyBedCount,
  updateRoomInfo,
  updateOccupant,
  getEmptyBeds,
  checkGenderConflict,
  transferBed,
};
