const HW = {
  _key: 'ecrf_hw_state',

  get state() { return sessionStorage.getItem(this._key) || 'idle'; },
  set state(v) { sessionStorage.setItem(this._key, v); },

  isRx()     { return this.state === 'rx';     },
  isJammer() { return this.state === 'jammer'; },
  isIdle()   { return this.state === 'idle';   },

  async ensureIdle(reason) {
    const prev = this.state;
    if (prev === 'idle') return true;

    console.log(`[HW] ensureIdle — stopping "${prev}" before "${reason}"`);
    const endpoint = prev === 'rx' ? '/stoprx' : '/stopjammer';

    try {
      const r = await fetch(endpoint, { method: 'POST' });
      if (!r.ok) console.warn(`[HW] ${endpoint} returned ${r.status}`);
    } catch (err) {
      console.error('[HW] ensureIdle fetch error:', err);
    }

    this.state = 'idle';

    window.dispatchEvent(new CustomEvent('hw:idle', { detail: { from: prev } }));
    return true;
  }
};

const Store = {
  _pfx: 'ecrf_',
  save(key, val)      { try { sessionStorage.setItem(this._pfx + key, String(val)); } catch(e){} },
  load(key, fallback) { const v = sessionStorage.getItem(this._pfx + key); return v !== null ? v : fallback; },
  del(key)            { sessionStorage.removeItem(this._pfx + key); }
};

function bindField(el, key, defaultVal) {
  if (!el) return;
  el.value = Store.load(key, defaultVal !== undefined ? String(defaultVal) : '');
  el.addEventListener('change', () => Store.save(key, el.value));
  el.addEventListener('input',  () => Store.save(key, el.value));
}

let isNavigating = false;
let abortControllers = [];
const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
let lastConnectionCheck = 0;

function checkConnection() {
  const now = Date.now();
  if (now - lastConnectionCheck < 2000) return;
  lastConnectionCheck = now;
  if (isNavigating) { abortAllRequests(); return; }

  const controller = new AbortController();
  abortControllers.push(controller);
  const timeout = setTimeout(() => controller.abort(), 1500);

  fetch(isHomePage ? '/stats' : '/connectioncheck', { signal: controller.signal })
    .then(response => {
      clearTimeout(timeout);
      if (isNavigating) return;
      if (isHomePage) {
        return response.json().then(data => updateStats(data));
      } else {
        updateConnectionStatus(response.ok);
        return response.json();
      }
    })
    .catch(error => {
      clearTimeout(timeout);
      if (error.name !== 'AbortError' && !isNavigating) {
        updateConnectionStatus(false);
        if (isHomePage) {
          ['uptime','cpu0','cpu1','temperature','freespiffs','totalram','freeram',
           'ssid','ipaddress','sdcard_size_gb','sdcard_free_gb'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = 'N/A';
          });
          const sp = document.getElementById('sdcard_present');
          if (sp) sp.innerText = 'No';
        }
      }
    });
}

function abortAllRequests() {
  abortControllers.forEach(c => c.abort());
  abortControllers = [];
}

function setupNavigation() {
  const links = document.querySelectorAll('#menu a');
  const currentPath = window.location.pathname;

  links.forEach(link => {
    if (link.getAttribute('href') === currentPath) link.classList.add('active');
    else link.classList.remove('active');

    link.addEventListener('click', function(e) {
      closeMobileMenu();
      if (this.classList.contains('active')) { e.preventDefault(); return; }
      isNavigating = true;
      abortAllRequests();
      document.body.classList.add('page-loading');
      const dest = this.href;
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        e.preventDefault();
        setTimeout(() => window.location.replace(dest), 50);
      } else {
        setTimeout(() => { window.location.href = dest; }, 100);
      }
    });
  });

  setupMobileMenuToggle();
}

function setupMobileMenuToggle() {
  const checkbox = document.getElementById('responsive-menu');
  const menu = document.getElementById('menu');
  if (!checkbox || !menu) return;

  checkbox.addEventListener('change', () => {
    menu.classList.toggle('menu-open', checkbox.checked);
  });

  // Click outside the drawer (on the dimmed backdrop) closes it
  menu.addEventListener('click', (e) => {
    if (e.target === menu && checkbox.checked) {
      closeMobileMenu();
    }
  });
}

function closeMobileMenu() {
  const checkbox = document.getElementById('responsive-menu');
  const menu = document.getElementById('menu');
  if (checkbox) checkbox.checked = false;
  if (menu) menu.classList.remove('menu-open');
}

window.addEventListener('load', () => {
  isNavigating = false;
  document.body.classList.remove('page-loading');
});

function updateConnectionStatus(isOnline) {
  document.querySelectorAll('.status-indicator').forEach(el => {
    el.classList.toggle('status-online',  isOnline);
    el.classList.toggle('status-offline', !isOnline);
  });
  if (!isHomePage) {
    document.querySelectorAll('.conn-dot').forEach(dot => {
      dot.classList.toggle('online',  isOnline);
      dot.classList.toggle('offline', !isOnline);
    });
  }
}

function updateStats(data) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.innerText = val; };
  if (data.uptime)       set('uptime', formatUptime(data.uptime));
  if (data.cpu0)         set('cpu0', data.cpu0 + ' MHz');
  if (data.cpu1)         set('cpu1', data.cpu1 + ' MHz');
  if (data.temperature)  set('temperature', data.temperature.toFixed(1) + ' °C');
  if (data.freespiffs)   set('freespiffs', formatBytes(data.freespiffs));
  if (data.totalram)     set('totalram', formatBytes(data.totalram));
  if (data.freeram)      set('freeram', formatBytes(data.freeram));
  if (data.ssid)         set('ssid', data.ssid);
  if (data.ipaddress)    set('ipaddress', data.ipaddress);
  if (data.sdcard_size_gb) set('sdcard_size_gb', data.sdcard_size_gb + ' GB');
  if (data.sdcard_free_gb) set('sdcard_free_gb', data.sdcard_free_gb + ' GB');
  if (data.sdcard_present !== undefined)
    set('sdcard_present', data.sdcard_present ? 'Yes' : 'No');
  updateConnectionStatus(true);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function showMessage(type, text) {
  let container = document.getElementById('global-toast');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-toast';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast-message ${type}`;
  const msg = document.createElement('span');
  msg.textContent = text;
  const close = document.createElement('span');
  close.className = 'toast-close';
  close.innerHTML = '&times;';
  toast.appendChild(msg);
  toast.appendChild(close);
  container.appendChild(toast);
  const timer = setTimeout(() => _dismissToast(toast), 5000);
  close.onclick = () => { clearTimeout(timer); _dismissToast(toast); };
}

function _dismissToast(t) {
  t.style.animation = 'toastFadeOut 0.3s ease-out';
  setTimeout(() => t.remove(), 300);
}

document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

async function syncHwState() {
  try {
    const r = await fetch('/rxstatus', { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    if (!d.active && HW.state === 'rx') {

      HW.state = 'idle';
      window.dispatchEvent(new CustomEvent('hw:idle', { detail: { from: 'rx' } }));
    }
  } catch (_) {  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  isNavigating = false;
  document.body.classList.remove('page-loading');
  syncHwState();
  setInterval(checkConnection, 5000);
  checkConnection();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    if (typeof setupNavigation === 'function') setupNavigation();
    if (typeof checkConnection === 'function') { setInterval(checkConnection, 5000); checkConnection(); }
  }, 100);
}

/* ═══════════════════════════════════════
   THEME TOGGLE — dark / light
   Persisted via localStorage so it
   survives page navigation on the device.
═══════════════════════════════════════ */
(function() {
  var STORAGE_KEY = 'krodi_theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var cb = document.getElementById('theme-checkbox');
    if (cb) cb.checked = (theme === 'light');
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch(e) {}
  }

  function initTheme() {
    // Apply saved preference immediately (before paint) to avoid flash
    var saved = 'dark';
    try { saved = localStorage.getItem(STORAGE_KEY) || 'dark'; } catch(e) {}
    applyTheme(saved);

    // Wire up the checkbox once the DOM is ready
    function wireToggle() {
      var cb = document.getElementById('theme-checkbox');
      if (cb) {
        cb.checked = (saved === 'light');
        cb.addEventListener('change', toggleTheme);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wireToggle);
    } else {
      wireToggle();
    }
  }

  // Run theme init immediately so no flash on load
  initTheme();
})();
