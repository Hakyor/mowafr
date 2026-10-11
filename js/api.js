/* Mowafr API layer — talks to the Cloudflare Worker (D1).
   localStorage is used only as a per-device cache of the signed-in user's data;
   every write is pushed to D1. Must be the FIRST script on every page. */
(function () {
  'use strict';

  var cfg = window.MOWAFR_CONFIG || {};
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API = (isLocal && (!cfg.API_BASE || /YOUR-SUBDOMAIN/.test(cfg.API_BASE))
              ? 'http://127.0.0.1:8787' : (cfg.API_BASE || '')).replace(/\/+$/, '');

  var TOKEN_KEY = 'mowafr_token';
  var KEYS = {
    users: 'mowafr_users',
    consumption: 'mowafr_consumption_data',
    appliances: 'mowafr_appliances_data',
    history: 'mowafr_history_data',
    notifications: 'mowafr_notifications_data'
  };
  var KEY_TO_KIND = {};
  KEY_TO_KIND[KEYS.users] = 'user';
  KEY_TO_KIND[KEYS.consumption] = 'consumption';
  KEY_TO_KIND[KEYS.appliances] = 'appliances';
  KEY_TO_KIND[KEYS.history] = 'history';
  KEY_TO_KIND[KEYS.notifications] = 'notifications';

  var rawSet = Storage.prototype.setItem;
  var rawRemove = Storage.prototype.removeItem;
  var ls = window.localStorage;
  var ss = window.sessionStorage;

  var AUTH_PAGES = ['login.html', 'register.html'];
  var PROTECTED = ['dashboard.html', 'data-entry.html', 'history.html', 'notifications.html', 'results.html', 'profile.html'];
  var page = (location.pathname.split('/').pop() || 'index.html');

  var hydrating = false;
  var dirty = {};
  var timer = null;
  var pushing = false;

  // ---------- defer DOMContentLoaded handlers until data is hydrated ----------
  var ready = false, domReady = false, queued = [];
  var origAdd = document.addEventListener.bind(document);
  document.addEventListener = function (type, fn, opts) {
    if (type === 'DOMContentLoaded' && typeof fn === 'function') {
      if (ready && domReady) { setTimeout(function () { safe(fn); }, 0); }
      else queued.push(fn);
      return;
    }
    return origAdd(type, fn, opts);
  };
  function safe(fn) { try { fn.call(document, new Event('DOMContentLoaded')); } catch (e) { console.error(e); } }
  function flushQueue() {
    if (!(ready && domReady)) return;
    var q = queued; queued = [];
    q.forEach(safe);
  }
  function onDom() { domReady = true; flushQueue(); }
  if (document.readyState === 'loading') origAdd('DOMContentLoaded', onDom); else onDom();

  // ---------- helpers ----------
  function getToken() { try { return ls.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function setToken(t) { rawSet.call(ls, TOKEN_KEY, t); }
  function clearToken() { rawRemove.call(ls, TOKEN_KEY); }

  function clearCache() {
    Object.keys(KEYS).forEach(function (k) { rawRemove.call(ls, KEYS[k]); });
    ['currentUserId', 'currentUserEmail', 'currentUserName'].forEach(function (k) { rawRemove.call(ss, k); });
  }

  function toast(msg, isError) {
    function show() {
      var el = document.getElementById('mowafr-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'mowafr-toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.className = 'show' + (isError ? ' error' : '');
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.className = ''; }, 3500);
    }
    if (document.body) show(); else origAdd('DOMContentLoaded', show);
  }

  function api(method, path, body, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    return fetch(API + path, {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive: !!opts.keepalive
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || 'حدث خطأ');
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  // ---------- cache <-> server ----------
  function writeCache(state) {
    hydrating = true;
    try {
      var uid = state.user.id;
      rawSet.call(ls, KEYS.users, JSON.stringify([state.user]));
      var cons = {}; if (state.consumption && Object.keys(state.consumption).length) cons[uid] = state.consumption;
      var a = {}; a[uid] = state.appliances || [];
      var h = {}; h[uid] = state.history || [];
      var n = {}; n[uid] = state.notifications || [];
      rawSet.call(ls, KEYS.consumption, JSON.stringify(cons));
      rawSet.call(ls, KEYS.appliances, JSON.stringify(a));
      rawSet.call(ls, KEYS.history, JSON.stringify(h));
      rawSet.call(ls, KEYS.notifications, JSON.stringify(n));
      rawSet.call(ss, 'currentUserId', uid);
      rawSet.call(ss, 'currentUserEmail', state.user.email);
      rawSet.call(ss, 'currentUserName', state.user.fullName);
    } finally { hydrating = false; }
  }

  function readJSON(key, fallback) {
    try { return JSON.parse(ls.getItem(key)) || fallback; } catch (e) { return fallback; }
  }

  function buildPayload(kinds) {
    var uid = ss.getItem('currentUserId');
    var out = {};
    kinds.forEach(function (kind) {
      if (kind === 'user') {
        var users = readJSON(KEYS.users, []);
        var u = users.filter(function (x) { return x.id === uid; })[0];
        if (u) { u = Object.assign({}, u); delete u.password; out.user = u; }
      } else {
        var map = readJSON(KEYS[kind], {});
        var v = map[uid];
        if (kind === 'consumption') out.consumption = v || {};
        else out[kind] = Array.isArray(v) ? v : [];
      }
    });
    return out;
  }

  function schedulePush() {
    clearTimeout(timer);
    timer = setTimeout(push, 500);
  }

  function push(opts) {
    if (pushing) { schedulePush(); return Promise.resolve(); }
    var kinds = Object.keys(dirty);
    if (!kinds.length || !getToken() || !ss.getItem('currentUserId')) return Promise.resolve();
    dirty = {};
    var payload = buildPayload(kinds);
    pushing = true;
    return api('PUT', '/api/state', payload, opts).then(function () {
      pushing = false;
    }).catch(function (err) {
      pushing = false;
      if (err.status === 401) return sessionExpired();
      if (err.status && err.status >= 400 && err.status < 500) {
        // server rejected (e.g. email taken) — reload the real state
        toast(err.message, true);
        return refresh().then(function () { if (/profile/.test(page)) setTimeout(function () { location.reload(); }, 1200); });
      }
      // network problem: keep dirty and retry
      kinds.forEach(function (k) { dirty[k] = true; });
      toast('لا يوجد اتصال — سيتم حفظ التعديلات عند عودة الاتصال', true);
      clearTimeout(timer);
      timer = setTimeout(push, 8000);
    });
  }

  // Intercept writes to the cached keys
  Storage.prototype.setItem = function (key, value) {
    rawSet.call(this, key, value);
    if (this === ls && !hydrating && KEY_TO_KIND[key] && getToken()) {
      dirty[KEY_TO_KIND[key]] = true;
      schedulePush();
    }
  };
  Storage.prototype.removeItem = function (key) {
    rawRemove.call(this, key);
    if (this === ls && !hydrating && KEY_TO_KIND[key] && getToken() && KEY_TO_KIND[key] !== 'user') {
      dirty[KEY_TO_KIND[key]] = true;
      schedulePush();
    }
  };

  function flushNow() {
    if (Object.keys(dirty).length) { clearTimeout(timer); push({ keepalive: true }); }
  }
  window.addEventListener('pagehide', flushNow);
  origAdd('visibilitychange', function () { if (document.visibilityState === 'hidden') flushNow(); });
  window.addEventListener('online', function () { if (Object.keys(dirty).length) push(); });

  function refresh() {
    return api('GET', '/api/state').then(function (state) { writeCache(state); return state; });
  }

  function sessionExpired() {
    clearToken(); clearCache();
    if (PROTECTED.indexOf(page) !== -1) location.href = 'login.html';
  }

  // ---------- public API ----------
  window.MowafrAPI = {
    base: API,
    isConfigured: function () { return !!API && !/YOUR-SUBDOMAIN/.test(API); },
    ready: null,
    login: function (email, password) {
      return api('POST', '/api/login', { email: email, password: password }).then(function (r) {
        setToken(r.token); return refresh();
      });
    },
    register: function (data) {
      return api('POST', '/api/register', data).then(function (r) {
        setToken(r.token); return refresh();
      });
    },
    logout: function () {
      var p = getToken() ? api('POST', '/api/logout').catch(function () {}) : Promise.resolve();
      return p.then(function () { clearToken(); clearCache(); });
    },
    changePassword: function (currentPassword, newPassword) {
      return api('POST', '/api/password', { currentPassword: currentPassword, newPassword: newPassword });
    },
    verifyPassword: function (password) {
      return api('POST', '/api/verify-password', { password: password }).then(function (r) { return !!r.ok; });
    },
    deleteAccount: function () {
      return api('DELETE', '/api/account').then(function () { clearToken(); clearCache(); });
    },
    refresh: refresh,
    flush: function () { clearTimeout(timer); return push(); },
    isLoggedIn: function () { return !!getToken(); }
  };

  // ---------- boot ----------
  function boot() {
    var token = getToken();
    if (!token) {
      clearCache();
      return Promise.resolve();
    }
    // loading veil while we fetch fresh data (only for signed-in users)
    var veil = document.createElement('div');
    veil.id = 'mowafr-veil';
    veil.innerHTML = '<div class="spin"></div>';
    document.documentElement.appendChild(veil);

    var timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 10000); });
    return Promise.race([refresh(), timeout]).catch(function (err) {
      if (err.status === 401) { sessionExpired(); return; }
      // offline / slow: fall back to the cached copy if it belongs to a user
      var users = readJSON(KEYS.users, []);
      if (users.length) {
        rawSet.call(ss, 'currentUserId', users[0].id);
        rawSet.call(ss, 'currentUserEmail', users[0].email);
        rawSet.call(ss, 'currentUserName', users[0].fullName);
        toast('تعذر الاتصال بالخادم — يتم عرض آخر بيانات محفوظة', true);
      } else { clearToken(); clearCache(); }
    }).then(function () {
      var v = document.getElementById('mowafr-veil'); if (v) v.remove();
    });
  }

  window.MowafrAPI.ready = boot().then(function () { ready = true; flushQueue(); });
})();
