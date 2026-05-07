/* eslint-disable @typescript-eslint/no-explicit-any */

const KEY = 'diary-warm-paper-v3';
const SYNC_DELAY = 1200;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Entries = Record<string, any>;

let supabase: any = null;
let user: any = null;
let statusEl: HTMLDivElement;
let panelEl: HTMLDivElement;
let syncTimer: number | undefined;
let lastSnapshot = localStorage.getItem(KEY) || '';

const readEntries = (): Entries => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw.entries || {};
  } catch {
    return {};
  }
};

const writeEntries = (entries: Entries) => {
  localStorage.setItem(KEY, JSON.stringify({ entries }));
  lastSnapshot = localStorage.getItem(KEY) || '';
};

const mergeEntries = (localEntries: Entries, cloudEntries: Entries) => {
  const merged = { ...localEntries };
  Object.entries(cloudEntries).forEach(([date, cloudEntry]) => {
    const localEntry = merged[date];
    if (!localEntry || (cloudEntry?.updatedAt || 0) > (localEntry?.updatedAt || 0)) {
      merged[date] = cloudEntry;
    }
  });
  return merged;
};

const setStatus = (text: string) => {
  if (statusEl) statusEl.textContent = text;
};

const loadSupabase = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (supabase) return supabase;
  const mod = await import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2.105.3');
  supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
};

const fetchCloudEntries = async () => {
  const client = await loadSupabase();
  if (!client) return {};
  const { data, error } = await client
    .from('diary_entries')
    .select('date,entry')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).reduce((acc: Entries, row: any) => {
    if (row.entry) acc[row.date] = row.entry;
    return acc;
  }, {});
};

const pushCloudEntries = async (entries: Entries) => {
  const client = await loadSupabase();
  if (!client || !user) return;
  const rows = Object.values(entries)
    .filter((entry: any) => entry?.date)
    .map((entry: any) => ({
      user_id: user.id,
      date: entry.date,
      entry,
      updated_at: new Date(entry.updatedAt || Date.now()).toISOString(),
    }));
  if (!rows.length) return;
  const { error } = await client
    .from('diary_entries')
    .upsert(rows, { onConflict: 'user_id,date' });
  if (error) throw error;
};

const syncNow = async (message = '已同步') => {
  if (!user) {
    setStatus('请先登录云同步。');
    return;
  }
  setStatus('正在同步...');
  try {
    const merged = mergeEntries(readEntries(), await fetchCloudEntries());
    writeEntries(merged);
    await pushCloudEntries(merged);
    setStatus(`${message} ${new Date().toLocaleTimeString('zh-CN')}`);
  } catch (error: any) {
    console.error('cloud sync error:', error);
    setStatus(`同步失败：${error.message || '请稍后重试'}`);
  }
};

const scheduleSync = () => {
  if (!user) return;
  window.clearTimeout(syncTimer);
  setStatus('本地已保存，等待云同步...');
  syncTimer = window.setTimeout(() => syncNow('自动同步完成'), SYNC_DELAY);
};

const login = async (email: string, password: string, signup = false) => {
  const client = await loadSupabase();
  if (!client) {
    setStatus('还没有配置 Supabase 环境变量。');
    return;
  }
  setStatus(signup ? '正在注册...' : '正在登录...');
  const result = signup
    ? await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    : await client.auth.signInWithPassword({ email, password });
  if (result.error) {
    setStatus(`${signup ? '注册' : '登录'}失败：${result.error.message}`);
    return;
  }
  user = result.data.session?.user || result.data.user || null;
  render();
  if (user && result.data.session) {
    await syncNow(signup ? '注册成功，已同步' : '登录成功，已同步');
  } else {
    setStatus('注册成功，请先到邮箱确认后再登录。');
  }
};

const logout = async () => {
  const client = await loadSupabase();
  if (client) await client.auth.signOut();
  user = null;
  render();
  setStatus('已退出云同步，本地内容仍会保留。');
};

const render = () => {
  panelEl.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'moji-cloud-title';
  title.textContent = '云同步';
  panelEl.appendChild(title);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const hint = document.createElement('div');
    hint.className = 'moji-cloud-hint';
    hint.textContent = '在 Netlify 填入 Supabase 环境变量后即可启用。';
    panelEl.appendChild(hint);
  } else if (user) {
    const email = document.createElement('div');
    email.className = 'moji-cloud-hint';
    email.textContent = user.email || '已登录';
    panelEl.appendChild(email);
    const row = document.createElement('div');
    row.className = 'moji-cloud-row';
    const sync = button('同步', () => syncNow('手动同步完成'));
    const out = button('退出', logout);
    row.append(sync, out);
    panelEl.appendChild(row);
  } else {
    const email = input('邮箱', 'email');
    const password = input('密码', 'password');
    const row = document.createElement('div');
    row.className = 'moji-cloud-row';
    row.append(
      button('登录', () => login(email.value.trim(), password.value)),
      button('注册', () => login(email.value.trim(), password.value, true)),
    );
    panelEl.append(email, password, row);
  }

  statusEl = document.createElement('div');
  statusEl.className = 'moji-cloud-status';
  statusEl.textContent = user ? '修改日记后会自动同步。' : '登录后会合并本地和云端日记。';
  panelEl.appendChild(statusEl);
};

const button = (text: string, onClick: () => void | Promise<void>) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = text;
  el.onclick = () => void onClick();
  return el;
};

const input = (placeholder: string, type: string) => {
  const el = document.createElement('input');
  el.type = type;
  el.placeholder = placeholder;
  return el;
};

const boot = async () => {
  const style = document.createElement('style');
  style.textContent = `
    .moji-cloud-panel{position:fixed;right:16px;bottom:16px;z-index:50;width:248px;padding:14px;border:1px solid #e5d6b8;border-radius:12px;background:#fdfaf1f2;color:#2f1e12;box-shadow:0 10px 30px #2f1e1220;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif;backdrop-filter:blur(10px)}
    .moji-cloud-title{font-size:13px;font-weight:700;margin-bottom:8px}
    .moji-cloud-hint,.moji-cloud-status{font-size:11px;line-height:1.5;color:#6b533e;margin-top:8px}
    .moji-cloud-panel input{width:100%;height:30px;box-sizing:border-box;margin:0 0 6px;padding:0 8px;border:1px solid #e5d6b8;border-radius:8px;background:#fffaf0;color:#2f1e12}
    .moji-cloud-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:2px}
    .moji-cloud-panel button{height:30px;border:1px solid #e5d6b8;border-radius:8px;background:#fffaf0;color:#2f1e12;cursor:pointer}
    .moji-cloud-panel button:hover{border-color:#e7a889;color:#b04b2f}
    @media(max-width:720px){.moji-cloud-panel{left:12px;right:12px;bottom:12px;width:auto}}
  `;
  document.head.appendChild(style);
  panelEl = document.createElement('div');
  panelEl.className = 'moji-cloud-panel';
  document.body.appendChild(panelEl);

  const client = await loadSupabase();
  if (client) {
    const { data } = await client.auth.getSession();
    user = data.session?.user || null;
    client.auth.onAuthStateChange((_event: string, session: any) => {
      user = session?.user || null;
      render();
    });
  }

  render();
  window.setInterval(() => {
    const current = localStorage.getItem(KEY) || '';
    if (current !== lastSnapshot) {
      lastSnapshot = current;
      scheduleSync();
    }
  }, 1500);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
} else {
  void boot();
}
