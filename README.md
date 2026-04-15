# 宿舍管理系统 - 微信小程序

一个用于管理学生宿舍、床位分配和入住申请的微信小程序。

## 功能特性

- **双角色系统**：管理员和学生两种角色
- **房间管理**：多楼层建筑，可配置房间和床位数量
- **申请流程**：学生申请入住，管理员审批
- **Excel 集成**：批量导入/导出房间和入住信息
- **离宿提醒**：7天内即将离宿的学生提醒

## 技术栈

- 微信小程序原生框架
- TDesign 小程序组件库 v3.15.2
- 本地存储（微信 Storage API）

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd dormitory-manager
```

### 2. 配置小程序 AppID

复制配置模板文件：

```bash
cp project.config.template.json project.config.json
```

编辑 `project.config.json`，将 `YOUR_APPID_HERE` 替换为你的微信小程序 AppID：

```json
{
  "appid": "你的小程序AppID",
  ...
}
```

### 3. 安装依赖

在微信开发者工具中打开项目，工具会自动安装 npm 依赖。

或手动安装：

```bash
npm install
```

然后在微信开发者工具中：工具 → 构建 npm

### 4. 运行项目

在微信开发者工具中编译运行即可。

## 项目结构

```
├── components/          # 自定义组件
│   ├── room-card/      # 房间卡片
│   ├── bed-card/       # 床位卡片
│   ├── application-card/  # 申请卡片
│   ├── checkin-popup/  # 入住弹窗
│   └── edit-occupant-popup/  # 编辑入住信息弹窗
├── pages/              # 页面
│   ├── login/         # 登录页
│   ├── admin/         # 管理员页面
│   ├── student/       # 学生页面
│   ├── floor-overview/  # 楼层总览
│   └── room-detail/   # 房间详情
├── services/          # 业务逻辑层
│   ├── storageService.js      # 本地存储
│   ├── userService.js         # 用户管理
│   ├── roomService.js         # 房间管理
│   ├── applicationService.js  # 申请流程
│   └── excelService.js        # Excel 导入导出
├── utils/             # 工具函数
│   └── excelValidator.js  # Excel 数据验证
├── data/              # 初始数据
│   └── mockData.js    # Mock 数据
└── libs/              # 第三方库
    └── xlsx.mini.min.js  # Excel 处理库
```

## 默认账号

系统预置了以下测试账号：

- **管理员**：学号/工号 `admin001`
- **学生**：学号 `2024001`、`I2024010` 等

## 开发说明

### 配置文件

- `project.config.json` - 包含 AppID 的项目配置（已加入 .gitignore）
- `project.config.template.json` - 配置模板文件（提交到 Git）
- `project.private.config.json` - 私有配置（已加入 .gitignore）

### 数据存储

所有数据使用微信小程序的本地存储 API 持久化，包括：
- 用户信息
- 房间和床位数据
- 入住申请记录

## License

MIT
