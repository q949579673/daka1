# 轻伴演示工程（标准拆分版）

## 目录结构
- `index.html`：前端入口页面。
- `assets/css/app.css`：样式文件。
- `assets/js/app.js`：前端业务逻辑。
- `backend/`：Node.js + Express API 示例服务。
- `database/schema.sql`：MySQL 建表与初始化数据脚本。

## 前端部署
静态部署即可（Nginx / 宝塔 / GitHub Pages）。

## 后端本地启动
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## MySQL 初始化
```bash
mysql -uroot -p < database/schema.sql
```

## 预置演示账号（同一登录页）
- 医生端：`13800000000`
- 总控后台：`13900000000`
- 其他手机号默认患者端
