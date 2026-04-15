/**
 * Excel数据验证工具
 */

/**
 * 规范化列名，去除(必填)和(可选)标注
 * @param {Object} row - 原始行数据
 * @returns {Object} 规范化后的行数据
 */
function normalizeRow(row) {
  const normalized = {};
  for (const key in row) {
    // 去除列名中的(必填)和(可选)标注
    const cleanKey = key.replace(/\(必填\)|\(可选\)/g, '');
    normalized[cleanKey] = row[key];
  }
  return normalized;
}

/**
 * 验证房间数据
 * @param {Array} rows - 房间数据行
 * @returns {Object} { valid: boolean, errors: Array, data: Array }
 */
function validateRoomData(rows) {
  const errors = [];
  const validData = [];
  const roomNumbers = new Set();

  if (!rows || rows.length === 0) {
    return { valid: false, errors: ['房间数据为空'], data: [] };
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel行号(从2开始,因为第1行是表头)
    const rowErrors = [];

    // 规范化列名
    row = normalizeRow(row);

    // 验证楼层
    if (!row['楼层'] && row['楼层'] !== 0) {
      rowErrors.push(`第${rowNum}行: 楼层不能为空`);
    } else if (!Number.isInteger(Number(row['楼层'])) || Number(row['楼层']) <= 0) {
      rowErrors.push(`第${rowNum}行: 楼层必须是正整数`);
    }

    // 验证房间号
    if (!row['房间号']) {
      rowErrors.push(`第${rowNum}行: 房间号不能为空`);
    } else {
      const roomNumber = String(row['房间号']).trim();
      if (roomNumbers.has(roomNumber)) {
        rowErrors.push(`第${rowNum}行: 房间号"${roomNumber}"重复`);
      } else {
        roomNumbers.add(roomNumber);
      }
    }

    // 验证床位数
    if (!row['床位数'] && row['床位数'] !== 0) {
      rowErrors.push(`第${rowNum}行: 床位数不能为空`);
    } else {
      const bedCount = Number(row['床位数']);
      if (!Number.isInteger(bedCount) || bedCount < 1 || bedCount > 8) {
        rowErrors.push(`第${rowNum}行: 床位数必须是1-8之间的整数`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validData.push({
        floor: Number(row['楼层']),
        roomNumber: String(row['房间号']).trim(),
        bedCount: Number(row['床位数'])
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    data: validData
  };
}

/**
 * 验证入住信息数据
 * @param {Array} rows - 入住信息数据行
 * @param {Array} rooms - 现有房间列表
 * @returns {Object} { valid: boolean, errors: Array, data: Array }
 */
function validateOccupantData(rows, rooms = []) {
  const errors = [];
  const validData = [];
  const occupiedBeds = new Set();

  if (!rows || rows.length === 0) {
    return { valid: true, errors: [], data: [] }; // 入住信息可以为空
  }

  // 创建房间映射
  const roomMap = new Map();
  rooms.forEach(room => {
    roomMap.set(room.roomNumber, room);
  });

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const rowErrors = [];

    // 规范化列名
    row = normalizeRow(row);

    // 验证房间号
    if (!row['房间号']) {
      rowErrors.push(`第${rowNum}行: 房间号不能为空`);
    } else {
      const roomNumber = String(row['房间号']).trim();
      const room = roomMap.get(roomNumber);

      if (rooms.length > 0 && !room) {
        rowErrors.push(`第${rowNum}行: 房间"${roomNumber}"不存在`);
      }

      // 验证床位号
      if (!row['床位号'] && row['床位号'] !== 0) {
        rowErrors.push(`第${rowNum}行: 床位号不能为空`);
      } else {
        const bedNo = Number(row['床位号']);
        if (!Number.isInteger(bedNo) || bedNo < 1) {
          rowErrors.push(`第${rowNum}行: 床位号必须是正整数`);
        } else if (room && bedNo > room.beds.length) {
          rowErrors.push(`第${rowNum}行: 床位号${bedNo}超出房间床位数${room.beds.length}`);
        }

        // 检查床位是否重复
        const bedKey = `${roomNumber}-${bedNo}`;
        if (occupiedBeds.has(bedKey)) {
          rowErrors.push(`第${rowNum}行: 床位"${roomNumber}-${bedNo}"重复`);
        } else {
          occupiedBeds.add(bedKey);
        }
      }
    }

    // 验证姓名
    if (!row['姓名']) {
      rowErrors.push(`第${rowNum}行: 姓名不能为空`);
    }

    // 验证学号/工号
    if (!row['学号/工号']) {
      rowErrors.push(`第${rowNum}行: 学号/工号不能为空`);
    }

    // 验证类型(可选)
    if (row['类型'] && !['研究生', '实习生'].includes(row['类型'])) {
      rowErrors.push(`第${rowNum}行: 类型必须是"研究生"或"实习生"`);
    }

    // 验证性别
    if (!row['性别']) {
      rowErrors.push(`第${rowNum}行: 性别不能为空`);
    } else if (!['男', '女'].includes(row['性别'])) {
      rowErrors.push(`第${rowNum}行: 性别必须是"男"或"女"`);
    }

    // 验证手机号(可选)
    if (row['手机号']) {
      const phone = String(row['手机号']).trim();
      if (!/^1\d{10}$/.test(phone)) {
        rowErrors.push(`第${rowNum}行: 手机号格式不正确`);
      }
    }

    // 验证日期格式
    if (row['入住日期']) {
      if (!isValidDate(row['入住日期'])) {
        rowErrors.push(`第${rowNum}行: 入住日期格式不正确,应为YYYY-MM-DD`);
      }
    }

    // 预计退宿日期为可选字段
    if (row['预计退宿日期']) {
      if (!isValidDate(row['预计退宿日期'])) {
        rowErrors.push(`第${rowNum}行: 预计退宿日期格式不正确,应为YYYY-MM-DD`);
      }
    }

    // 验证日期逻辑(仅当两个日期都存在时)
    if (row['入住日期'] && row['预计退宿日期']) {
      const checkIn = new Date(formatDate(row['入住日期']));
      const checkOut = new Date(formatDate(row['预计退宿日期']));
      if (checkIn >= checkOut) {
        rowErrors.push(`第${rowNum}行: 入住日期必须早于预计退宿日期`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      const today = new Date();

      validData.push({
        roomNumber: String(row['房间号']).trim(),
        bedNo: Number(row['床位号']),
        name: String(row['姓名']).trim(),
        studentId: String(row['学号/工号']).trim(),
        type: row['类型'] || '研究生',
        gender: String(row['性别']).trim(),
        phone: row['手机号'] ? String(row['手机号']).trim() : '',
        checkInDate: row['入住日期'] ? formatDate(row['入住日期']) : formatDate(today),
        expectedLeaveDate: row['预计退宿日期'] ? formatDate(row['预计退宿日期']) : null
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    data: validData
  };
}

/**
 * 验证用户数据
 * @param {Array} rows - 用户数据行
 * @returns {Object} { valid: boolean, errors: Array, data: Array }
 */
function validateUserData(rows) {
  const errors = [];
  const validData = [];
  const studentIds = new Set();

  if (!rows || rows.length === 0) {
    return { valid: true, errors: [], data: [] }; // 用户数据可以为空
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const rowErrors = [];

    // 规范化列名
    row = normalizeRow(row);

    // 验证学号/工号
    if (!row['学号/工号']) {
      rowErrors.push(`第${rowNum}行: 学号/工号不能为空`);
    } else {
      const studentId = String(row['学号/工号']).trim();
      if (studentIds.has(studentId)) {
        rowErrors.push(`第${rowNum}行: 学号/工号"${studentId}"重复`);
      } else {
        studentIds.add(studentId);
      }
    }

    // 验证姓名
    if (!row['姓名']) {
      rowErrors.push(`第${rowNum}行: 姓名不能为空`);
    }

    // 验证角色
    if (!row['角色']) {
      rowErrors.push(`第${rowNum}行: 角色不能为空`);
    } else if (!['admin', 'student'].includes(row['角色'])) {
      rowErrors.push(`第${rowNum}行: 角色必须是"admin"或"student"`);
    }

    // 验证手机号(可选)
    if (row['手机号']) {
      const phone = String(row['手机号']).trim();
      if (!/^1\d{10}$/.test(phone)) {
        rowErrors.push(`第${rowNum}行: 手机号格式不正确`);
      }
    }

    // 验证类型(可选)
    if (row['类型'] && !['管理员', '研究生', '实习生'].includes(row['类型'])) {
      rowErrors.push(`第${rowNum}行: 类型必须是"管理员"、"研究生"或"实习生"`);
    }

    // 验证性别(可选)
    if (row['性别'] && !['男', '女'].includes(row['性别'])) {
      rowErrors.push(`第${rowNum}行: 性别必须是"男"或"女"`);
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validData.push({
        studentId: String(row['学号/工号']).trim(),
        name: String(row['姓名']).trim(),
        role: row['角色'],
        phone: row['手机号'] ? String(row['手机号']).trim() : '',
        type: row['类型'] || (row['角色'] === 'admin' ? '管理员' : '研究生'),
        gender: row['性别'] ? String(row['性别']).trim() : ''
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    data: validData
  };
}

/**
 * 验证日期格式
 * @param {*} date - 日期值
 * @returns {boolean}
 */
function isValidDate(date) {
  if (!date) return false;

  // 处理Excel日期序列号
  if (typeof date === 'number') {
    return date > 0;
  }

  // 处理字符串日期
  const dateStr = String(date).trim();
  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
    /^\d{4}\/\d{2}\/\d{2}$/  // YYYY/MM/DD
  ];

  return patterns.some(pattern => pattern.test(dateStr));
}

/**
 * 格式化日期为YYYY-MM-DD
 * @param {*} date - 日期值
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return '';

  let dateObj;

  // 处理Excel日期序列号
  if (typeof date === 'number') {
    // Excel日期从1900-01-01开始计数
    const excelEpoch = new Date(1900, 0, 1);
    dateObj = new Date(excelEpoch.getTime() + (date - 2) * 24 * 60 * 60 * 1000);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    // 处理字符串日期
    const dateStr = String(date).trim().replace(/\//g, '-');
    dateObj = new Date(dateStr);
  }

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 格式化错误信息
 * @param {Array} errors - 错误列表
 * @returns {string}
 */
function formatErrors(errors) {
  if (!errors || errors.length === 0) {
    return '';
  }

  return errors.join('\n');
}

module.exports = {
  validateRoomData,
  validateOccupantData,
  validateUserData,
  formatErrors,
  isValidDate,
  formatDate
};
