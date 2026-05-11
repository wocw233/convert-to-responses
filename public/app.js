(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const DOM = {
    grid: $('#providersGrid'),
    empty: $('#emptyState'),
    count: $('#providerCount'),
    mini: $('#activeMini'),
    dot: $('#statusDot'),
    status: $('#statusText'),
    toast: $('#toastRack'),
    logBody: $('#logBody'),
    logStatus: $('#logStatus'),
    logPause: $('#btnLogPause'),
    modal: $('#modalLayer'),
    modalTitle: $('#modalTitle'),
    btnDel: $('#btnDelete'),
  };

  const F = {
    name: $('#f-name'),
    type: $('#f-type'),
    key: $('#f-api_key'),
    url: $('#f-base_url'),
    model: $('#f-model'),
    priority: $('#f-priority'),
    enabled: $('#f-enabled'),
  };

  const state = { providers: [], activeId: null, editingId: null };

  const log = { entries: [], paused: false, filter: 'all', es: null };

  function esc(v) {
    if (v == null) return '';
    const d = document.createElement('div');
    d.textContent = String(v);
    return d.innerHTML;
  }

  function fmt(ts) {
    const d = new Date(ts);
    return d.getHours().toString().padStart(2,'0') + ':' +
           d.getMinutes().toString().padStart(2,'0') + ':' +
           d.getSeconds().toString().padStart(2,'0');
  }

  function badgeCls(t) {
    if (t === 'anthropic') return 'badge-anthropic';
    if (t === 'openai-chat') return 'badge-openai-chat';
    if (t === 'openai-responses') return 'badge-openai-responses';
    return '';
  }

  function toast(msg, type) {
    type = type || 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    DOM.toast.appendChild(el);
    setTimeout(function () {
      el.classList.add('fade-out');
      setTimeout(function () { if (el.parentNode) el.remove(); }, 400);
    }, 3500);
  }

  /* ─── PROVIDERS ─── */

  async function load() {
    try {
      const r = await fetch('/api/providers');
      if (!r.ok) throw new Error('Status ' + r.status);
      const d = await r.json();
      state.providers = d.providers || [];
      var a = state.providers.find(function (p) { return p.active; });
      state.activeId = a ? a.id : null;
      render();
      mini();
    } catch (e) {
      toast(I18N.t('toast.load_failed') + ': ' + e.message, 'error');
      DOM.dot.classList.remove('online');
      DOM.dot.classList.add('error');
      DOM.status.textContent = I18N.t('status.offline');
    }
  }

  function render() {
    if (state.providers.length === 0) {
      DOM.grid.innerHTML = '';
      DOM.empty.style.display = 'flex';
    } else {
      DOM.empty.style.display = 'none';
      DOM.grid.innerHTML = state.providers.map(function (p, i) {
        var active = p.active || p.id === state.activeId;
        var cls = active ? 'card active' : (p.enabled ? 'card' : 'card disabled');
        var dly = (i * 0.06).toFixed(2);
        return '<div class="' + cls + '" style="animation-delay:' + dly + 's" data-id="' + p.id + '">' +
          '<div class="card-header">' +
            '<span class="card-name">' + esc(p.name) + '</span>' +
            '<span class="card-badge ' + badgeCls(p.type) + '">' + esc(p.type) + '</span>' +
          '</div>' +
          '<div class="card-divider"></div>' +
          '<div class="card-fields">' +
            '<div class="card-field"><span class="field-key">' + I18N.t('card.model') + '</span><span class="field-val">' + esc(p.model || '\u2014') + '</span></div>' +
            '<div class="card-field"><span class="field-key">' + I18N.t('card.base_url') + '</span><span class="field-val truncate">' + esc(p.base_url || '\u2014') + '</span></div>' +
            '<div class="card-field"><span class="field-key">' + I18N.t('card.priority') + '</span><span class="field-val">' + (p.priority || 0) + '</span></div>' +
            '<div class="card-field"><span class="field-key">' + I18N.t('card.key') + '</span><span class="field-val' + (p.has_key ? '' : ' text-muted') + '">' + (p.has_key ? I18N.t('card.key_set') : I18N.t('card.key_none')) + '</span></div>' +
          '</div>' +
          '<div class="card-divider"></div>' +
          '<div class="card-actions">' +
            (active
              ? '<button class="btn btn-sm btn-success" onclick="App.deactivate()">' + '\u25C9' + ' ' + I18N.t('card.active_btn') + '</button>'
              : '<button class="btn btn-sm btn-primary" onclick="App.activate(' + p.id + ')">' + I18N.t('card.activate') + '</button>') +
            '<button class="btn btn-sm btn-ghost" onclick="App.test(' + p.id + ')">' + I18N.t('card.test') + '</button>' +
            '<button class="btn btn-sm btn-ghost" onclick="App.edit(' + p.id + ')">' + I18N.t('card.edit') + '</button>' +
            '<button class="btn btn-sm btn-danger" onclick="App.del(' + p.id + ')">' + I18N.t('card.del') + '</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    DOM.count.textContent = state.providers.length;
  }

  function mini() {
    var a = state.providers.find(function (p) { return p.active || p.id === state.activeId; });
    if (a) {
      DOM.mini.innerHTML = I18N.t('sidebar.active') + ': <strong>' + esc(a.name) + '</strong>';
    } else {
      DOM.mini.textContent = I18N.t('sidebar.no_active');
    }
  }

  /* ─── MODAL ─── */

  function showModal(provider) {
    state.editingId = provider ? provider.id : null;
    DOM.modalTitle.textContent = provider ? I18N.t('modal.edit') : I18N.t('modal.new');
    DOM.btnDel.style.display = provider ? '' : 'none';

    F.name.value = provider ? provider.name : '';
    F.type.value = provider ? provider.type : 'anthropic';
    F.key.value = provider ? (provider.api_key || '') : '';
    F.url.value = provider ? (provider.base_url || '') : '';
    F.model.value = provider ? (provider.model || '') : '';
    F.priority.value = provider ? (provider.priority || 1) : 1;
    F.enabled.checked = provider ? !!provider.enabled : true;

    DOM.modal.classList.add('open');
  }

  function closeModal() {
    DOM.modal.classList.remove('open');
    state.editingId = null;
  }

  async function save() {
    var body = {
      name: F.name.value.trim(),
      type: F.type.value,
      api_key: F.key.value.trim(),
      base_url: F.url.value.trim(),
      model: F.model.value.trim(),
      priority: parseInt(F.priority.value, 10) || 0,
      enabled: F.enabled.checked,
    };

    if (!body.name) { toast(I18N.t('toast.name_required'), 'error'); return; }
    if (body.api_key && body.api_key === '******') { body.api_key = undefined; }

    var method = state.editingId ? 'PUT' : 'POST';
    var url = state.editingId ? '/api/providers/' + state.editingId : '/api/providers';

    try {
      var r = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { var e = await r.json().catch(function () { return {}; }); throw new Error(e.error || 'Status ' + r.status); }
      closeModal();
      await load();
      toast(state.editingId ? I18N.t('toast.provider_updated') : I18N.t('toast.provider_added'), 'success');
    } catch (e) {
      toast(I18N.t('toast.save_failed') + ': ' + e.message, 'error');
    }
  }

  /* ─── ACTIONS ─── */

  async function activate(id) {
    try {
      var r = await fetch('/api/providers/' + id + '/activate', { method: 'POST' });
      if (!r.ok) { var e = await r.json().catch(function () { return {}; }); throw new Error(e.error || 'Status ' + r.status); }
      var d = await r.json();
      state.activeId = d.active_provider_id || (d.provider && d.provider.id) || id;
      render();
      mini();
      var prov = d.provider || state.providers.find(function (p) { return p.id === state.activeId; });
      var name = prov ? prov.name : ('#' + state.activeId);
      toast(I18N.t('toast.activated') + ': ' + name, 'success');
    } catch (e) {
      toast(I18N.t('toast.activate_failed') + ': ' + e.message, 'error');
    }
  }

  async function deactivate() {
    try {
      var r = await fetch('/api/providers/deactivate', { method: 'POST' });
      if (!r.ok) { var e = await r.json().catch(function () { return {}; }); throw new Error(e.error || 'Status ' + r.status); }
      state.activeId = null;
      render();
      mini();
      toast(I18N.t('toast.deactivated'), 'info');
    } catch (e) {
      toast(I18N.t('toast.deactivate_failed') + ': ' + e.message, 'error');
    }
  }

  async function test(id) {
    var card = DOM.grid.querySelector('[data-id="' + id + '"]');
    if (card) {
      card.style.opacity = '0.6';
      card.style.pointerEvents = 'none';
    }
    try {
      var r = await fetch('/api/providers/' + id + '/test', { method: 'POST' });
      var d = await r.json().catch(function () { return { error: I18N.t('toast.parse_error') }; });
      if (r.ok && d.success) {
        toast(I18N.t('toast.conn_ok') + ': ' + (d.message || ''), 'success');
      } else {
        toast(I18N.t('toast.test_failed') + ': ' + (d.error || d.message || I18N.t('toast.unknown')), 'error');
      }
    } catch (e) {
      toast(I18N.t('toast.test_error') + ': ' + e.message, 'error');
    }
    if (card) {
      card.style.opacity = '';
      card.style.pointerEvents = '';
    }
  }

  function edit(id) {
    var p = state.providers.find(function (v) { return v.id === id; });
    if (p) showModal(p);
  }

  async function del(id) {
    if (!confirm(I18N.t('confirm.delete'))) return;
    try {
      var r = await fetch('/api/providers/' + id, { method: 'DELETE' });
      if (!r.ok) { var e = await r.json().catch(function () { return {}; }); throw new Error(e.error || 'Status ' + r.status); }
      if (state.activeId === id) state.activeId = null;
      await load();
      toast(I18N.t('toast.provider_deleted'), 'info');
    } catch (e) {
      toast(I18N.t('toast.delete_failed') + ': ' + e.message, 'error');
    }
  }

  /* ─── PAGES ─── */

  function switchPage(name) {
    $$('.page').forEach(function (p) { p.classList.remove('active'); });
    $$('.nav-link').forEach(function (n) { n.classList.remove('active'); });
    var page = $('#page-' + name);
    if (page) page.classList.add('active');
    var nav = document.querySelector('.nav-link[data-page="' + name + '"]');
    if (nav) nav.classList.add('active');

    if (name === 'logs') {
      renderLogs();
      scrollLogs();
    }

    if (name === 'info' || name === 'providers') {
      if (log.es) { log.es.close(); log.es = null; }
    }
  }

  /* ─── LOGS ─── */

  function connectLogStream() {
    if (log.es) {
      try { log.es.close(); } catch (_) {}
      log.es = null;
    }

    var es = new EventSource('/api/logs/stream');
    log.es = es;

    es.onmessage = function (e) {
      try {
        var entry = JSON.parse(e.data);
        if (entry._init && Array.isArray(entry.logs)) {
          entry.logs.forEach(function (item) { addLogEntry(item); });
        } else {
          addLogEntry(entry);
        }
      } catch (_) {}
    };

    es.onerror = function () {
      DOM.logStatus.textContent = I18N.t('status.reconnecting');
      DOM.logStatus.classList.add('testing');
      setTimeout(function () {
        if (log.es === es) connectLogStream();
      }, 3000);
    };

    es.onopen = function () {
      DOM.logStatus.textContent = I18N.t('status.live');
      DOM.logStatus.classList.remove('testing');
    };
  }

  function addLogEntry(entry) {
    log.entries.push(entry);
    if (log.entries.length > 500) log.entries.shift();
    if (!log.paused && $('#page-logs').classList.contains('active')) {
      renderLogs();
      scrollLogs();
    }
  }

  function renderLogs() {
    var filtered = log.entries;
    if (log.filter !== 'all') {
      filtered = log.entries.filter(function (e) { return e.level === log.filter; });
    }

    if (filtered.length === 0) {
      DOM.logBody.innerHTML = '<div class="terminal-empty">' + I18N.t('logs.empty') + '</div>';
      return;
    }

    DOM.logBody.innerHTML = filtered.map(function (e) {
      return '<div class="log-entry log-' + (e.level || 'info') + '">' +
        '<span class="log-time">' + fmt(e.ts || e.timestamp || Date.now()) + '</span>' +
        '<span class="log-level">' + (e.level || 'INFO').toUpperCase() + '</span>' +
        '<span class="log-msg">' + esc(e.message || e.msg || '') + '</span>' +
      '</div>';
    }).join('');
  }

  function scrollLogs() {
    var b = DOM.logBody;
    if (b) b.scrollTop = b.scrollHeight;
  }

  function setLogFilter(level) {
    log.filter = level;
    $$('#logFilters .filter-chip').forEach(function (c) {
      c.classList.toggle('on', c.getAttribute('data-level') === level);
    });
    renderLogs();
    scrollLogs();
  }

  function toggleLogPause() {
    log.paused = !log.paused;
    DOM.logPause.textContent = log.paused ? I18N.t('logs.resume') : I18N.t('logs.pause');
    DOM.logStatus.textContent = log.paused ? I18N.t('status.paused') : I18N.t('status.live');
    if (!log.paused) {
      renderLogs();
      scrollLogs();
    }
  }

  function clearLogs() {
    log.entries = [];
    renderLogs();
  }

  /* ─── INIT ─── */

  function init() {
    // Language initial state
    I18N.apply();
    var curLang = I18N.getLang();
    $('#btnLangZh').classList.toggle('active', curLang === 'zh');
    $('#btnLangEn').classList.toggle('active', curLang === 'en');

    // Language toggle buttons
    $('#btnLangZh').addEventListener('click', function () {
      I18N.setLang('zh');
      $('#btnLangZh').classList.add('active');
      $('#btnLangEn').classList.remove('active');
      refreshAfterLang();
    });
    $('#btnLangEn').addEventListener('click', function () {
      I18N.setLang('en');
      $('#btnLangEn').classList.add('active');
      $('#btnLangZh').classList.remove('active');
      refreshAfterLang();
    });

    // Nav
    $$('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        switchPage(this.getAttribute('data-page'));
      });
    });

    // Buttons
    $('#btnAddProvider').addEventListener('click', function () { showModal(null); });
    $('#btnEmptyAdd').addEventListener('click', function () { showModal(null); });
    $('#btnRefresh').addEventListener('click', function () { load(); });
    $('#modalClose').addEventListener('click', closeModal);
    $('#btnCancel').addEventListener('click', closeModal);
    $('#btnSave').addEventListener('click', save);
    $('#btnDelete').addEventListener('click', function () {
      if (state.editingId) { closeModal(); del(state.editingId); }
    });
    $('.modal-bg').addEventListener('click', closeModal);

    // Logs
    $('#btnLogPause').addEventListener('click', toggleLogPause);
    $('#btnLogClear').addEventListener('click', clearLogs);
    $$('#logFilters .filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        setLogFilter(this.getAttribute('data-level'));
      });
    });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && DOM.modal.classList.contains('open')) {
        closeModal();
      }
    });

    // Form submit
    $('#providerForm').addEventListener('submit', function (e) {
      e.preventDefault();
      save();
    });

    // Health
    fetch('/health')
      .then(function (r) { return r.json(); })
      .then(function () {
        DOM.dot.classList.add('online');
        DOM.status.textContent = I18N.t('status.online');
      })
      .catch(function () {
        DOM.dot.classList.add('error');
        DOM.status.textContent = I18N.t('status.offline');
      });

    load();
    connectLogStream();
  }

  function refreshAfterLang() {
    render();
    mini();
    var logPage = $('#page-logs');
    if (logPage && logPage.classList.contains('active')) {
      renderLogs();
      scrollLogs();
    }
  }

  /* ─── EXPORT ─── */

  window.App = {
    activate: activate,
    deactivate: deactivate,
    test: test,
    edit: edit,
    del: del,
    switchPage: switchPage,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
