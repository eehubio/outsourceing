# 部署到 Vercel + Neon

本工程已配置为 **Neon Postgres + Prisma** 生产形态。
默认的 `memory` 后端不能用于 Vercel（无服务器，内存不持久、实例间不共享，数据会丢）。

---

## 一、在 Neon 建库并取两个连接串

1. 注册 https://neon.tech → New Project（选离你/用户最近的 Region）
2. 建好后进入 **Dashboard → Connection Details**
3. 复制两个连接串（同一库的两种入口）：

| 用途 | 选哪个 | 特征 |
|---|---|---|
| 运行时 DATABASE_URL | **Pooled connection**（连接池） | 主机名含 `-pooler` |
| 迁移 DIRECT_URL | **Direct connection**（直连） | 主机名不含 `-pooler` |

> 两者都要带 `?sslmode=require`。
> 为什么分两个：Vercel serverless 每次冷启动新建连接，运行时走连接池避免打满 Neon 连接数；而 db push/migrate 这类 DDL 必须走直连。Prisma 通过 url + directUrl 自动分流。

---

## 二、本地先建表 + 灌数据（连 Neon 执行一次）

    cd ezplm-outsourcing-v2
    npm install
    export DATABASE_URL="postgresql://USER:PWD@ep-xxx-pooler.REGION.aws.neon.tech/DB?sslmode=require"
    export DIRECT_URL="postgresql://USER:PWD@ep-xxx.REGION.aws.neon.tech/DB?sslmode=require"
    npx prisma db push                    # 建表（走 DIRECT_URL）
    DATA_BACKEND=prisma npm run db:seed   # 灌演示数据（可选）

跑完可用 `npx prisma studio` 连上查看。

---

## 三、推送代码到 Git

    git init && git add . && git commit -m "ezPLM outsourcing v2 (Neon)"
    git remote add origin <你的仓库地址>
    git push -u origin main

确认 .env 不被提交（.gitignore 已忽略），仓库里只应有 .env.example。

---

## 四、Vercel 导入并配置环境变量

1. Vercel → Add New → Project → 选该仓库 → Import（自动识别 Next.js）
2. Settings → Environment Variables 添加：

| 变量 | 值 |
|---|---|
| DATABASE_URL | Neon pooled 串（含 -pooler、?sslmode=require） |
| DIRECT_URL | Neon direct 串 |
| DATA_BACKEND | prisma |
| SESSION_SECRET | openssl rand -base64 32 生成 |
| EZPLM_API_MODE | mock |
| EZPLM_BASE_URL | https://ezplm.cn |

也可用 Vercel 官方 Neon 集成（Integrations → Neon）自动注入连接串。

3. 点 Deploy。构建期自动 prisma generate（不建表，表已在第二步建好）。

---

## 五、验证

访问分配的域名，右上角切换演示身份。
seed 后测试账号：杨阳(发布方) / 蒋吴琦(服务方) / 平台审核员 / 平台管理员。

---

## 常见问题

- 数据一刷新就没了 → DATA_BACKEND 没设成 prisma。
- prisma db push 报 pooler 错误 → 建表用了 pooled 串，换成 DIRECT_URL（不含 -pooler）。
- 运行时 "too many connections" → 运行时 DATABASE_URL 用了直连，换成 pooled 串（含 -pooler）。
- SSL 错误 → 连接串结尾加 ?sslmode=require。
- Neon 免费层会休眠 → 首个请求有几百毫秒冷启动，属正常。

---

## 上线前仍需补强（见 README 第 9 节）

模拟支付换真实支付网关；外包数据放隔离的 outsourcing_* 表 + 链接表，不改 ezPLM 核心表；补 CSRF、Rate Limit、文件存储与类型校验、字段级加密。
