const STYLE_ID = 'moji-ui-tweaks';
const MENU_ID = 'moji-backup-menu';
const TOGGLE_ID = 'moji-backup-toggle';

const injectStyle = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    aside {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    aside::-webkit-scrollbar {
      display: none;
    }
    .moji-backup-wrap {
      position: relative;
      margin-top: 6px;
    }
    .moji-backup-toggle,
    .moji-backup-menu button {
      height: 32px;
      border: 1px solid #e5d6b8;
      border-radius: 8px;
      background: #fdfaf1;
      color: #6b533e;
      font: 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
      cursor: pointer;
      transition: transform .15s ease, border-color .15s ease, color .15s ease;
    }
    .moji-backup-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .moji-backup-toggle:hover,
    .moji-backup-menu button:hover {
      border-color: #e7a889;
      color: #b04b2f;
      transform: translateY(-1px);
    }
    .moji-backup-menu {
      position: absolute;
      z-index: 20;
      left: 0;
      right: 0;
      top: 38px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding: 8px;
      border: 1px solid #e5d6b8;
      border-radius: 10px;
      background: #f6edd9;
      box-shadow: 0 12px 24px rgba(47, 30, 18, .12);
    }
    .moji-backup-menu[hidden] {
      display: none;
    }
    .moji-backup-menu button:disabled {
      cursor: not-allowed;
      opacity: .45;
      transform: none;
    }
  `;
  document.head.appendChild(style);
};

const findBackupGrid = () => {
  const aside = document.querySelector('aside');
  if (!aside) return null;
  const headings = Array.from(aside.querySelectorAll('div'));
  const heading = headings.find(node => node.textContent?.trim() === '备份');
  const section = heading?.closest('.border-b');
  if (!section) return null;
  return section.querySelector('.grid.grid-cols-2') as HTMLDivElement | null;
};

const buttonLabel = (button: HTMLButtonElement) => {
  return button.textContent?.trim().replace(/\s+/g, '') || '操作';
};

const applyBackupMenu = () => {
  const grid = findBackupGrid();
  if (!grid || grid.dataset.mojiCollapsed === 'true') return;
  const originalButtons = Array.from(grid.querySelectorAll('button'));
  if (originalButtons.length < 4) return;

  grid.dataset.mojiCollapsed = 'true';
  grid.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = 'moji-backup-wrap';

  const toggle = document.createElement('button');
  toggle.id = TOGGLE_ID;
  toggle.className = 'moji-backup-toggle';
  toggle.type = 'button';
  toggle.textContent = '备份操作';

  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.className = 'moji-backup-menu';
  menu.hidden = true;

  originalButtons.forEach(original => {
    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = buttonLabel(original);
    action.title = original.title;
    action.disabled = original.disabled;
    action.addEventListener('click', () => {
      menu.hidden = true;
      original.click();
    });
    menu.appendChild(action);
  });

  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    Array.from(menu.querySelectorAll('button')).forEach((button, index) => {
      button.disabled = originalButtons[index]?.disabled || false;
    });
  });

  document.addEventListener('click', event => {
    if (!wrap.contains(event.target as Node)) menu.hidden = true;
  });

  wrap.append(toggle, menu);
  grid.insertAdjacentElement('afterend', wrap);
};

const boot = () => {
  injectStyle();
  applyBackupMenu();
  const observer = new MutationObserver(applyBackupMenu);
  observer.observe(document.body, { childList: true, subtree: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
