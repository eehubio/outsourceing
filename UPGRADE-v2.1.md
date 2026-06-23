# 本轮新增功能（v2.1）

在 v2 基础上新增三大功能。**升级需要更新数据库表结构和一个环境变量**，见下方"升级步骤"。

## 1. PDF 智能解析（Gemini）

发布项目时可上传 PRD / 规范 PDF，由 Gemini 自动解析并填充需求书各字段（背景、功能需求、接口、交付物等），人工核对后提交。

- 解析在**服务端**完成（`/api/outsourcing/parse-pdf`），API key 不暴露给前端。
- 需配置环境变量 `GEMINI_API_KEY`。**不配则发布向导不显示上传入口**，其余功能照常。
- 模型用 `gemini-2.0-flash`，原生读取 PDF。单文件 ≤15MB。

## 2. 真实用户系统（注册 / 登录）

- 新增 `/register`（注册）和 `/login`（登录）页面。
- 注册时选择账户类型：**服务方**（工程师/工作室/研发公司）或**发布方/甲方**（企业/实验室/团队）。
- 密码用 bcrypt 哈希存储；登录签发服务端会话 cookie。
- 平台管理员可用演示账号 `u_admin` 或自行注册后在数据库置 `platformRole=ADMIN`。
- **演示身份切换仍保留**：未登录时右上角可切换演示账号体验；真实登录后显示账号信息与"退出"。
- 登录态下右上角"登录/注册"入口进入真实登录。

## 3. 申请字段行业化 + 甲方多选

- 申请表重构为硬件研发外包专用字段：姓名/团队、联系方式、身份类型、所在地、从业年限、匹配技能、熟悉的 MCU/FPGA、工具链/EDA、技术方案、里程碑、报价（含不包含项）、风险、案例链接、服务能力（可开票/支持生产/支持现场）等。
- 甲方在"管理申请"页可**多选合适人选**（★ 标记，可多个），被选中的申请高亮显示，顶部统计已选人数。多选独立于申请状态流程，不影响后续邀请/合作确认。
- 甲方可看到申请人**联系方式**等完整资料。

---

## 升级步骤（已部署过 v2 的情况）

1. **更新代码**：用本包替换本地工程，`npm install`。
2. **更新数据库表**（新增 `passwordHash`/`accountType` 于 User，`selected` 于 Application）：
   ```bash
   export DATABASE_URL="你的 Neon 串"
   export DIRECT_URL="你的 Neon 串"
   npx prisma generate
   npx prisma db push        # 增量加列，不会删数据
   ```
3. **加环境变量**（本地 + Vercel 都要）：`GEMINI_API_KEY`。
   - Vercel：Settings → Environment Variables → 加 `GEMINI_API_KEY`，三个环境都勾。
4. **推送 + 部署**：`git add . && git commit -m "v2.1: pdf+auth+multiselect" && git push`，Vercel 自动重新部署。

> 不配 `GEMINI_API_KEY` 也能部署，只是没有 PDF 解析功能。
> Gemini key 申请：https://aistudio.google.com/apikey
