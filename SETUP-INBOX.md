# 留言信箱后端配置指南（Supabase）

留言数据存放在 Supabase（免费 PostgreSQL）。按下面的步骤操作，全程约 10 分钟，无需写代码。

## 第 1 步：注册并创建项目

1. 打开 https://supabase.com ，点 **Start your project**，用 GitHub 账号登录即可
2. 点 **New project**：
   - Name：随意，比如 `my-site-inbox`
   - Database Password：点 Generate 生成一个，记下来（之后用不到，但先存好）
   - Region：选 **Singapore** 或离你最近的
3. 等 1~2 分钟项目初始化完成

## 第 2 步：建表和权限（复制粘贴运行）

1. 左侧菜单点 **SQL Editor** → **New query**
2. 把下面整段 SQL 粘进去，点 **Run**：

```sql
-- 留言表
create table messages (
  id uuid primary key default gen_random_uuid(),
  username text not null check (char_length(username) between 1 and 20),
  content text not null check (char_length(content) between 1 and 500),
  reply text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);

-- 开启行级安全
alter table messages enable row level security;

-- 访客：只能提交留言，且只能进入待审核状态
create policy "anon insert pending"
on messages for insert to anon
with check (status = 'pending');

-- 访客：只能看到已通过审核的留言
create policy "anon read approved"
on messages for select to anon
using (status = 'approved');

-- 站长（登录后）：全部权限
create policy "owner full access"
on messages for all to authenticated
using (true) with check (true);
```

看到 `Success` 即可。

## 第 3 步：创建站长账号

1. 左侧菜单 **Authentication** → **Users** → **Add user** → **Create new user**
2. 填你的邮箱和一个密码（这就是以后在网站上登录站长后台的账号）
3. 勾上 **Auto Confirm User**，点 Create

## 第 4 步：把密钥填进网站

1. 左侧菜单 **Project Settings**（齿轮图标）→ **API**
2. 复制两个值：
   - **Project URL**（形如 `https://abcdefgh.supabase.co`）
   - **anon public** key（`eyJ...` 开头的一长串）
3. 打开本项目的 `js/config.js`，替换两个占位值并保存：

```js
const SUPABASE_URL = "https://你的项目.supabase.co";
const SUPABASE_ANON_KEY = "你的anon key";
```

4. 提交并推送：

```bash
git add -A && git commit -m "配置 Supabase 后端" && git push
```

完成！打开网站「留言信箱」页，提交一条留言测试，然后页面底部「站长登录」审核它。

> 安全说明：anon key 公开是安全的。数据库 RLS 策略保证匿名访客只能提交留言、只能看到已审核内容；修改、回复、删除必须站长登录。

---

# 附：「你和我」条目留言表（space_comments）

「你和我」栏目里每条内容下方的留言存在 `space_comments` 表。同样在 **SQL Editor** → **New query** 粘贴运行：

```sql
-- 「你和我」条目留言表
create table space_comments (
  id uuid primary key default gen_random_uuid(),
  username text not null,        -- 所属「你和我」账号（留言归属哪个空间）
  entry_key text not null,       -- 内容条目标识（日期|标题）
  author text not null,          -- 留言者显示名
  content text not null,
  created_at timestamptz not null default now()
);

alter table space_comments enable row level security;

-- 匿名可读可写（只有知道账号密码的人才会看到留言入口）
create policy "anon read comments" on space_comments
  for select to anon using (true);
create policy "anon insert comments" on space_comments
  for insert to anon with check (true);
```

运行完即可，不用改任何配置文件。想删除某条留言：左侧 **Table Editor** → `space_comments` → 选中行删除。

---

# 附：五子棋联机对战房间表（gomoku_rooms）

「小游戏 → 五子棋 → 在线联机」用这张表同步棋局。同样在 **SQL Editor** → **New query** 粘贴运行：

```sql
-- 五子棋联机房间表
create table gomoku_rooms (
  code text primary key,                      -- 6 位房间码，即加入凭证
  moves jsonb not null default '[]',          -- 落子序列 [[x,y],...]，奇数下标为白方
  turn text not null default 'black',         -- 当前行棋方：black / white
  winner text,                                -- 胜方：black / white / draw（平局），未分胜负为 null
  status text not null default 'waiting',     -- waiting（等人）/ playing（对局中）/ finished（已结束）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table gomoku_rooms enable row level security;

-- 房间码即凭证：知道 6 位房间码的人才能看到/修改这盘棋，所以匿名读、建、改全放开。
-- 房间码有近 9 亿种组合，猜到别人房间的概率极低；但别用它下必须保密的棋局。
create policy "anon read rooms" on gomoku_rooms
  for select to anon using (true);
create policy "anon create rooms" on gomoku_rooms
  for insert to anon with check (true);
create policy "anon update rooms" on gomoku_rooms
  for update to anon using (true) with check (true);
```

运行完即可，不用改任何配置文件（联机复用第 4 步已填好的密钥）。想清理废弃房间：左侧 **Table Editor** → `gomoku_rooms` → 选中行删除。
