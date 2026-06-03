// ==================== CLOUD SYNC (GitHub Gist) ====================
const Sync = {
  tokenKey: 'ps_github_token',
  gistIdKey: 'ps_gist_id',

  getToken() { return localStorage.getItem(this.tokenKey) || ''; },
  setToken(t) { localStorage.setItem(this.tokenKey, t); },
  getGistId() { return localStorage.getItem(this.gistIdKey) || ''; },
  setGistId(id) { localStorage.setItem(this.gistIdKey, id); },

  async pushToCloud() {
    const token = this.getToken();
    if (!token) return { ok: false, error: 'Token未配置' };
    const gistId = this.getGistId();
    const data = {};
    ['password','examDate','initialized','journal','plans','errors','workouts','bodyData','diet','trainingPlan','uploadedFiles','exercises'].forEach(k => {
      const raw = localStorage.getItem('ps_' + k);
      if (raw) data[k] = JSON.parse(raw);
    });
    const content = JSON.stringify(data, null, 2);

    try {
      let resp;
      if (gistId) {
        resp = await fetch('https://api.github.com/gists/' + gistId, {
          method: 'PATCH',
          headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: { 'data.json': { content } } })
        });
      } else {
        resp = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: '个人书房数据', public: false, files: { 'data.json': { content } } })
        });
      }
      if (!resp.ok) { const e = await resp.json(); return { ok: false, error: e.message || 'HTTP ' + resp.status }; }
      const result = await resp.json();
      if (!gistId) this.setGistId(result.id);
      return { ok: true, time: new Date().toISOString() };
    } catch(e) { return { ok: false, error: e.message }; }
  },

  async pullFromCloud() {
    const token = this.getToken();
    const gistId = this.getGistId();
    if (!token || !gistId) return { ok: false, error: '未配置同步' };
    try {
      const resp = await fetch('https://api.github.com/gists/' + gistId, {
        headers: { 'Authorization': 'token ' + token }
      });
      if (!resp.ok) return { ok: false, error: 'HTTP ' + resp.status };
      const gist = await resp.json();
      const file = gist.files && gist.files['data.json'];
      if (!file || !file.content) return { ok: false, error: '云端无数据' };
      const data = JSON.parse(file.content);
      if (data) Object.keys(data).forEach(k => { localStorage.setItem('ps_' + k, JSON.stringify(data[k])); });
      return { ok: true, time: gist.updated_at };
    } catch(e) { return { ok: false, error: e.message }; }
  }
};

// Override DB.set to auto-sync
const _origDBSet = DB.set;
DB.set = function(k, v) {
  _origDBSet.call(DB, k, v);
  if (!DB._syncPending && Sync.getToken()) {
    DB._syncPending = true;
    clearTimeout(DB._syncTimer);
    DB._syncTimer = setTimeout(() => { DB._syncPending = false; Sync.pushToCloud().catch(()=>{}); }, 5000);
  }
};

// Override renderSettings to add sync section
const _origRenderSettings = renderSettings;
renderSettings = function() {
  let html = _origRenderSettings();
  const syncSection = '<div class="card" style="margin-bottom:16px"><div style="font-weight:600;font-size:14px;margin-bottom:12px">\u2601\ufe0f 跨设备云同步 (GitHub Gist)</div>'+
    '<div class="form-group"><label>GitHub Token (<a href="https://github.com/settings/tokens" target="_blank" style="color:#3b82f6;font-size:11px">\u83b7\u53d6</a>)</label><input class="input" type="password" id="githubToken" value="'+Sync.getToken()+'" placeholder="ghp_xxxx..." style="max-width:400px;font-size:12px"><div style="font-size:11px;color:#94a3b8;margin-top:2px">\u9700\u8981 gist \u6743\u9650\uff0c\u70b9\u51fb\u83b7\u53d6\u94fe\u63a5\u7533\u8bf7 Token</div></div>'+
    '<div style="display:flex;gap:8px;margin-bottom:8px">'+
    '<button class="btn btn-sm btn-primary" onclick="saveSyncCfg()">\u4fdd\u5b58 Token</button>'+
    '<button class="btn btn-sm btn-outline" onclick="syncPush()">\u2b07 \u4e0a\u4f20\u5230\u4e91\u7aef</button>'+
    '<button class="btn btn-sm btn-outline" onclick="syncPull()">\u2b06 \u4ece\u4e91\u7aef\u4e0b\u8f7d</button></div>'+
    '<div id="syncMsg" style="font-size:12px;margin-top:4px"></div></div>';
  html = html.replace('\u2699\ufe0f \u8bbe\u7f6e</h2>', '\u2699\ufe0f \u8bbe\u7f6e</h2>'+syncSection);
  // Remove the first card (will be shifted)
  return html;
};

function saveSyncCfg() { const t=document.getElementById('githubToken').value.trim(); if(t){Sync.setToken(t);document.getElementById('syncMsg').innerHTML='<span style=color:#16a34a>Token\u5df2\u4fdd\u5b58</span>';} }
async function syncPush() { const m=document.getElementById('syncMsg');m.innerHTML='<span style=color:#64748b>\u4e0a\u4f20\u4e2d...</span>';const r=await Sync.pushToCloud();m.innerHTML=r.ok?'<span style=color:#16a34a>\u2705 \u4e0a\u4f20\u6210\u529f ('+new Date(r.time).toLocaleString()+')</span>':'<span style=color:#dc2626>\u274c '+r.error+'</span>'; }
async function syncPull() { if(!confirm('\u4e0b\u8f7d\u5c06\u8986\u76d6\u672c\u5730\u6570\u636e\uff0c\u786e\u5b9a\uff1f'))return;const m=document.getElementById('syncMsg');m.innerHTML='<span style=color:#64748b>\u4e0b\u8f7d\u4e2d...</span>';const r=await Sync.pullFromCloud();if(r.ok){m.innerHTML='<span style=color:#16a34a>\u2705 \u4e0b\u8f7d\u6210\u529f\uff0c\u5237\u65b0\u4e2d...</span>';setTimeout(()=>location.reload(),1000);}else{m.innerHTML='<span style=color:#dc2626>\u274c '+r.error+'</span>';} }

// Dashboard sync indicator
setInterval(()=>{const el=document.getElementById('syncStatus');if(el) {el.textContent=Sync.getToken()?'\u2601 \u4e91\u540c\u6b65\u5df2\u542f\u7528':'\u2601 \u672a\u914d\u7f6e\u540c\u6b65';el.style.color=Sync.getToken()?'#16a34a':'#94a3b8';}},2000);
