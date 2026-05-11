window.I18N = (function () {
  'use strict';

  var zh = {

    'brand.line1': 'Convert to',
    'brand.line2': 'responses',

    'nav.providers': '服务商',
    'nav.info': '信息',
    'nav.logs': '日志',

    'status.online': '在线',
    'status.offline': '离线',
    'status.live': '实时',
    'status.paused': '已暂停',
    'status.reconnecting': '重连中',

    'providers.title': '服务商管理',
    'providers.add': '添加服务商',
    'providers.refresh': '刷新',
    'providers.empty': '尚未配置服务商',
    'providers.empty_add': '添加第一个服务商',

    'card.model': '模型',
    'card.base_url': '接口地址',
    'card.priority': '优先级',
    'card.key': '密钥',
    'card.key_set': '已配置',
    'card.key_none': '未设置',
    'card.active_btn': '已激活',
    'card.activate': '激活',
    'card.test': '测试',
    'card.edit': '编辑',
    'card.del': '删除',

    'sidebar.active': '当前',
    'sidebar.no_active': '无活动服务商',

    'info.title': '系统信息',
    'info.translation_title': 'API 转译',
    'info.translation_desc': '本网关在多个 AI 服务商 API 之间进行转译，输出 OpenAI Responses API 格式，供 Codex CLI / 桌面端使用。',
    'info.providers_title': '支持的服务商',
    'info.providers_1': 'Anthropic Messages API',
    'info.providers_2': 'OpenAI Chat Completions API',
    'info.providers_3': 'OpenAI Responses API（直通）',
    'info.endpoints_title': '接口端点',
    'info.endpoints_path': '路径',
    'info.endpoints_desc': '说明',
    'info.endpoints_1': '转译后的 Responses API',
    'info.endpoints_2': '列出所有服务商',
    'info.endpoints_3': '激活服务商',
    'info.endpoints_4': '测试连接',
    'info.usage_title': '使用方法',
    'info.usage_desc': '在服务商管理中添加 API 密钥、接口地址和模型。一次只激活一个服务商。向 /v1/responses 发送请求 — 网关会自动路由到活动服务商并转译响应格式。',

    'logs.title': '终端日志',
    'logs.clear': '清空',
    'logs.pause': '暂停',
    'logs.resume': '继续',
    'logs.empty': '暂无日志条目',
    'logs.waiting': '等待日志数据...',

    'modal.edit': '编辑服务商',
    'modal.new': '新建服务商',
    'modal.delete_btn': '删除',

    'form.name': '名称',
    'form.name_placeholder': '我的服务商',
    'form.type': 'API 类型',
    'form.key': 'API 密钥',
    'form.key_placeholder': 'sk-...',
    'form.url': '接口地址',
    'form.url_placeholder': 'https://api.example.com',
    'form.model': '模型',
    'form.model_placeholder': '模型名称',
    'form.priority': '优先级',
    'form.enabled': '启用',

    'btn.cancel': '取消',
    'btn.save': '保存',

    'toast.load_failed': '加载失败',
    'toast.save_failed': '保存失败',
    'toast.name_required': '名称为必填项',
    'toast.provider_updated': '服务商已更新',
    'toast.provider_added': '服务商已添加',
    'toast.activated': '已激活',
    'toast.activate_failed': '激活失败',
    'toast.deactivated': '服务商已停用',
    'toast.deactivate_failed': '停用失败',
    'toast.conn_ok': '连接成功',
    'toast.test_failed': '测试失败',
    'toast.test_error': '测试出错',
    'toast.parse_error': '解析错误',
    'toast.unknown': '未知错误',
    'toast.provider_deleted': '服务商已删除',
    'toast.delete_failed': '删除失败',

    'confirm.delete': '确定要删除此服务商吗？',
  };

  var en = {

    'brand.line1': 'Convert to',
    'brand.line2': 'responses',

    'nav.providers': 'Providers',
    'nav.info': 'Info',
    'nav.logs': 'Logs',

    'status.online': 'ONLINE',
    'status.offline': 'OFFLINE',
    'status.live': 'LIVE',
    'status.paused': 'PAUSED',
    'status.reconnecting': 'RECONNECTING',

    'providers.title': 'Provider Registry',
    'providers.add': 'New Provider',
    'providers.refresh': 'Refresh',
    'providers.empty': 'No providers configured yet',
    'providers.empty_add': 'Add Provider',

    'card.model': 'Model',
    'card.base_url': 'Base URL',
    'card.priority': 'Priority',
    'card.key': 'Key',
    'card.key_set': 'Configured',
    'card.key_none': 'Not set',
    'card.active_btn': 'Active',
    'card.activate': 'Activate',
    'card.test': 'Test',
    'card.edit': 'Edit',
    'card.del': 'Del',

    'sidebar.active': 'Active',
    'sidebar.no_active': 'No active provider',

    'info.title': 'System Information',
    'info.translation_title': 'API Translation',
    'info.translation_desc': 'This gateway translates between multiple AI provider APIs and outputs the OpenAI Responses API format for Codex CLI / desktop consumption.',
    'info.providers_title': 'Supported Providers',
    'info.providers_1': 'Anthropic Messages API',
    'info.providers_2': 'OpenAI Chat Completions API',
    'info.providers_3': 'OpenAI Responses API (passthrough)',
    'info.endpoints_title': 'Endpoints',
    'info.endpoints_path': 'Path',
    'info.endpoints_desc': 'Description',
    'info.endpoints_1': 'Translated Responses API',
    'info.endpoints_2': 'List all providers',
    'info.endpoints_3': 'Activate a provider',
    'info.endpoints_4': 'Test connection',
    'info.usage_title': 'Usage',
    'info.usage_desc': 'Configure your provider\'s API key, base URL, and model in the Provider Registry. Activate one provider at a time. Send requests to /v1/responses — the gateway will route to your active provider and translate the response format automatically.',

    'logs.title': 'Terminal Logs',
    'logs.clear': 'Clear',
    'logs.pause': 'Pause',
    'logs.resume': 'Resume',
    'logs.empty': 'No log entries',
    'logs.waiting': 'Awaiting log data...',

    'modal.edit': 'Edit Provider',
    'modal.new': 'New Provider',
    'modal.delete_btn': 'Delete',

    'form.name': 'Name',
    'form.name_placeholder': 'My Provider',
    'form.type': 'API Type',
    'form.key': 'API Key',
    'form.key_placeholder': 'sk-...',
    'form.url': 'Base URL',
    'form.url_placeholder': 'https://api.example.com',
    'form.model': 'Model',
    'form.model_placeholder': 'model-name',
    'form.priority': 'Priority',
    'form.enabled': 'Enabled',

    'btn.cancel': 'Cancel',
    'btn.save': 'Save',

    'toast.load_failed': 'Load failed',
    'toast.save_failed': 'Save failed',
    'toast.name_required': 'Name is required',
    'toast.provider_updated': 'Provider updated',
    'toast.provider_added': 'Provider added',
    'toast.activated': 'Activated',
    'toast.activate_failed': 'Activate failed',
    'toast.deactivated': 'Provider deactivated',
    'toast.deactivate_failed': 'Deactivate failed',
    'toast.conn_ok': 'Connection OK',
    'toast.test_failed': 'Test failed',
    'toast.test_error': 'Test error',
    'toast.parse_error': 'Parse error',
    'toast.unknown': 'Unknown',
    'toast.provider_deleted': 'Provider deleted',
    'toast.delete_failed': 'Delete failed',

    'confirm.delete': 'Delete this provider?',
  };

  var packs = { zh: zh, en: en };
  var current = localStorage.getItem('lang') || 'zh';

  function t(key) {
    var dict = packs[current] || packs.en;
    return dict[key] !== undefined ? dict[key] : key;
  }

  function setLang(lang) {
    current = lang;
    localStorage.setItem('lang', lang);
    apply();
  }

  function getLang() {
    return current;
  }

  function apply() {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-i18n');
      if (key === 'html') {
        var htmlKey = el.getAttribute('data-i18n-html');
        if (htmlKey) el.innerHTML = t(htmlKey);
      } else {
        el.textContent = t(key);
      }
    }

    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      var ph = placeholders[j];
      ph.placeholder = t(ph.getAttribute('data-i18n-placeholder'));
    }

    var titles = document.querySelectorAll('[data-i18n-title]');
    for (var k = 0; k < titles.length; k++) {
      var tl = titles[k];
      tl.title = t(tl.getAttribute('data-i18n-title'));
    }

    document.documentElement.lang = current === 'zh' ? 'zh-CN' : 'en';
  }

  return { t: t, setLang: setLang, getLang: getLang, apply: apply, packs: packs };
})();
