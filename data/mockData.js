/**
 * mockData.js - 所有 Mock 数据集中管理
 */

const users = [
  { userId: 'A001', studentId: 'admin001', name: '管理员', role: 'admin', phone: '13000000001', type: '管理员', gender: '男' },
  { userId: 'S001', studentId: '2024001', name: '张三', role: 'student', phone: '13800000001', type: '研究生', gender: '男' },
];

const buildings = [
  { id: 'tenth', name: '10号楼' },
  { id: 'eleventh', name: '11号楼' },
];

const bed = (no, occupant) =>
  occupant ? { bedNo: no, status: 'occupied', occupant } : { bedNo: no, status: 'empty', occupant: null };

const buildingData = {
  floors: [1, 2],
  rooms: [
    {
      roomId: 'tenth-101', buildingId: 'tenth', floor: 1, roomNumber: '101',
      beds: [
        bed(1, { name: '张三', type: '研究生', gender: '男', studentId: '2024001', phone: '13800000001', checkInDate: '2026-03-01', expectedLeaveDate: '2026-04-18' }),
        bed(2, { name: '李四', type: '实习生', gender: '女', studentId: '2024010', phone: '13800000002', checkInDate: '2026-02-15', expectedLeaveDate: '2026-06-30' }),
        bed(3), bed(4),
      ],
    },
    {
      roomId: 'eleventh-101', buildingId: 'eleventh', floor: 1, roomNumber: '101',
      beds: [
        bed(1),bed(2),bed(3), bed(4),
      ],
    },
    {
      roomId: 'tenth-201', buildingId: 'tenth', floor: 2, roomNumber: '201',
      beds: [
        bed(1),bed(2), bed(3), bed(4),
      ],
    },
  ],
};

module.exports = { users, buildings, buildingData };
