# 墨记

一个本地优先的日记应用。默认数据会保存在当前浏览器的 localStorage 里；开启 Supabase 后，可以登录并把日记同步到云端。

## 本地运行

```bash
npm install
npm run dev
```

## 备份

左侧“备份”区域支持：

- 手动导出 JSON
- 导入 JSON 恢复
- 在支持 File System Access API 的浏览器里选择本地文件夹，应用会定期写入备份文件

## Supabase 云同步

1. 在 Supabase 新建项目。
2. 打开 Supabase SQL Editor，执行 `supabase/schema.sql`。
3. 在 Supabase Project Settings -> API 复制 Project URL 和 anon public key。
4. 在 Netlify 的 Site configuration -> Environment variables 添加：

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. 重新部署 Netlify。
6. 打开网站右下角“云同步”，注册或登录。登录后会合并本地和云端日记，后续修改会自动同步。

个人日记通常足够使用 Supabase 免费额度。超过免费额度后才需要考虑付费。
