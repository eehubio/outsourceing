# ezPLM 项目外包智能体 v2

把一个模糊的硬件研发需求，转变为清晰的需求书 → 撮合合适的承接方 → 完成前期沟通与合作确认；**双方正式确认合作后，项目转入 ezPLM 组织空间执行**。本工程只负责"正式立项前"的流程，不重复实现 ezPLM 已有的任务/BOM/里程碑/验收等正式执行功能。

---

## 1. 本地运行

```bash
npm install

# 方式 A：内存后端（默认，零依赖，即开即跑，演示/预览推荐）
npm run dev            # DATA_BACKEND 默认 memory

# 方式 B：Prisma + SQLite（可持久化，本地需能下载 Prisma 引擎）
cp .env.example .env   # 确认 DATABASE_URL=file:./dev.db
# 编辑 .env 设 DATA_BACKEND=prisma
npm run db:push        # 建表
npm run db:seed        # 灌演示数据
npm run dev
```

打开 http://localhost:3000 ，右上角"演示身份"切换角色。

> 数据后端由环境变量 `DATA_BACKEND` 控制：`memory`（默认）或 `prisma`。两者实现同一个仓储接口（`src/lib/repo/types-repo.ts`），业务代码无差别。

### 生产（PostgreSQL）

1. `prisma/schema.prisma` 中 `datasource.provider` 改为 `postgresql`
2. `.env` 设 `DATABASE_URL=postgresql://…`、`DATA_BACKEND=prisma`、强随机 `SESSION_SECRET`
3. `npm run db:push && npm run db:seed && npm run build && npm start`

---

## 2. 测试账号（均为演示数据）

| 身份 | userId | 角色 | 能做什么 |
|---|---|---|---|
| 杨阳 | `u_pub1` | 发布方（Seeed） | 发布/编辑项目、管理申请、合作确认、移交 ezPLM |
| 李工 | `u_pub2` | 发布方（高校） | 同上 |
| 蒋吴琦 | `u_prov1` | 服务方 | 浏览、申请、沟通、接受邀请 |
| cly | `u_prov2` | 服务方 | 同上 |
| 平台审核员 | `u_rev` | 审核员 | 审核台：通过/驳回/要求修改 |
| 平台管理员 | `u_admin` | 管理员 | 审核 + 管理员权限 |

演示登录通过 `POST /api/auth/login {userId}` 签发**服务端会话 cookie**；登录后所有身份从会话读取，前端无法伪造。

---

## 3. 已实现功能（第一轮：P0 + 前期沟通 + 合作确认 + ezPLM 移交 Mock）

- **修复编辑 Bug**：编辑走 `PATCH /projects/:id`，保留项目 ID / 审核 / 支付 / 申请，不再重复新建
- **服务端鉴权与 RBAC**：会话身份；项目 Owner / 申请者 / 对话参与者 / 审核员校验
- **三套状态机**（项目 / 申请 / 合作）：校验当前态 + 操作角色，非法转换返回 409，全部写审计日志
- **数据模型**：~25 张表的 Prisma schema，项目版本快照、申请关联版本、状态历史、审计、ezPLM 链接
- **申请数据隔离**：发布方只看自己项目的申请；服务方只看自己的；改 URL 越权返回 403
- **消息防伪造**：发送人来自会话；仅对话参与者可读写
- **前期沟通工作台**：需求摘要 / 结构化澄清问题（open→answered→confirmed/deferred，含"影响范围"标记）/ 异步消息
- **双方合作确认**：合作摘要、待确认事项、双方分别确认、NDA 状态、确认后才能移交
- **ezPLM 移交 Mock**：`both_confirmed`（+ 必要时 NDA）后创建 ezPLM 项目，幂等，返回跳转链接，项目状态置 `transferred_to_ezplm`
- **发布向导 + 模拟支付**：6 步需求书 + 费用（预算中值×1%+¥10）+ 多渠道模拟支付 + 自动提交审核
- **候选横向比较**、**审核台**、**广场搜索/筛选**

### 安全与流程加固（第二轮修复）

- **完整可见性矩阵**：未发布项目（draft/pending_review/revision_required/rejected/cancelled）仅 owner 与审核员可见，其余一律 403；已发布项目按 public / summary_login / summary_apply / nda / invite_only / org_only 分级裁剪，游客与未申请者按级别给摘要或 403。详见 `viewProjectFor`。
- **禁止未授权访问未发布项目**：详情接口对未发布项目非授权身份返回 403。
- **修复 clarification 跨对话越权**：回答澄清问题时校验该问题确属当前对话，不能用 A 对话权限改 B 对话的问题。
- **合作确认前强制逐项确认**：任一方"确认合作"前，所有待确认事项必须已由双方逐项确认（both_confirmed），否则 409 并列出未完成项。
- **NDA 双方分别确认**：发布方与服务方各自确认，二者都确认后 NDA 方才生效，才能转入 ezPLM。
- **取消合作后可重选**：取消后原已接受申请置为 rejected、项目退回 published；被自动关闭的候选可被重新邀请（rejected → invited → accepted），合作记录自动重置复用。
- **一位 accepted 后关闭其他候选**：接受某申请时，同项目其余进行中的申请自动拒绝（写审计 `application.auto_reject`）。

## 4. 尚未实现（第二轮）

AI 需求访谈与自动需求书生成、AI 候选方案比较与智能匹配、NDA 电子签、收藏/举报/通知、服务方公开档案页、运营管理配置、**正式 ezPLM HTTP Adapter**（已留接口与占位）。

---

## 5. ezPLM 集成 API 契约（需 ezPLM 后端提供）

集成层见 `src/lib/ezplm/service.ts`，接口 `EzplmIntegrationService`。当前为 `MockEzplmService`；正式环境设 `EZPLM_API_MODE=http` 并实现 `HttpEzplmService`。

```ts
createProjectFromOutsourcing(input): Promise<{ ezplmOrgId, ezplmProjectId, link, status }>
getProjectLink(ezplmProjectId): string
```

`createProjectFromOutsourcing` 入参（移交时同步给 ezPLM）：外包项目 ID、标题、需求书、发布方组织、承接方用户、项目类型、预算、周期、交付物、技能、已确认事项、申请 ID、**幂等键**。建议 ezPLM 侧据幂等键去重，返回 `organizationId / projectId / link / syncStatus`。

---

## 6. 主要数据流

```
草稿 →(支付)→ 提交审核 →(审核员通过)→ 已发布（广场可见）
  → 服务方申请 → 前期沟通工作台（澄清/消息）
  → 发布方 shortlist → invite →(服务方)accept → 项目 matched
  → 发起合作确认 → 双方确认 → both_confirmed →(NDA)→ 移交 ezPLM → transferred_to_ezplm
```

## 7. 权限矩阵（节选）

| 操作 | 发布方 | 服务方 | 审核员 |
|---|---|---|---|
| 编辑项目 | ✅ 自己的 | ❌ | ❌ |
| 看项目收到的申请 | ✅ 自己的 | ❌ | ✅ |
| 看某条申请 | ✅ 自己项目的 | ✅ 自己的 | ✅ |
| 对话发消息 | ✅ 参与者 | ✅ 参与者 | ✅ |
| 审核项目 | ❌ | ❌ | ✅ |
| 发起/移交合作 | ✅ | ❌ | ❌ |
| 确认合作 | ✅ | ✅ | ❌ |
| 确认 NDA | ✅ 各自 | ✅ 各自 | ❌ |
| 取消合作 | ✅ | ✅ | ❌ |
| 看未发布项目 | ✅ 自己的 | ❌ 403 | ✅ |

## 8. 状态机

定义见 `src/lib/state-machines/definitions.ts`，引擎 `engine.ts`。
- 项目：`draft pending_review revision_required published paused matched cooperation_confirming transferred_to_ezplm closed rejected cancelled`
- 申请：`draft submitted under_discussion shortlisted invited accepted rejected withdrawn expired`（`rejected` 可被发布方重新 `invite` 用于重选承接方）
- 合作：`not_started publisher_confirmed provider_confirmed both_confirmed cancelled transferred`

## 9. 已知风险 / 内植前必做

- **模拟支付**：`payProject` 需替换为真实支付网关回调
- **Prisma 引擎**：本演示沙盒因网络限制无法下载 Prisma 引擎，故默认 `memory` 后端；生产用 Prisma 时确保能访问 `binaries.prisma.sh` 或用对应离线引擎
- **承接组织**：移交时承接方组织/成员加入应由 ezPLM 侧据真实账号体系处理
- **建议**：外包数据放隔离的 `outsourcing_*` 表 + 链接表，不改 ezPLM 核心表（沿用 contest 数据隔离原则）
- 生产需补：CSRF、Rate Limit、文件存储与类型校验、字段级加密

## 10. 后续迭代建议

先做 AI 需求访谈与完整度自动修订（接 Claude/OpenAI，经 Zod 校验、用户确认后才落库），再做智能匹配与候选比较，最后做正式 ezPLM HTTP Adapter 与通知体系。

---

## 目录结构

```
prisma/schema.prisma         数据模型（~25 表）
prisma/seed.ts               生产 seed
src/lib/
  constants.ts               类型/预算/费用/状态标签
  state-machines/            状态机引擎 + 定义
  auth/                      会话 + 权限
  repo/                      仓储接口 + memory/prisma 双适配器
  services/                  业务逻辑（项目/申请/沟通/合作）
  ezplm/ ai/                 集成与 AI 服务抽象（Mock）
  schemas.ts                 Zod 校验
src/app/api/outsourcing/     20 条 API 路由
src/app/outsourcing/         10 个页面
tests/                       状态机/完整度/费用单测
```
