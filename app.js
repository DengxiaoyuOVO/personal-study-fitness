// ==================== DATA LAYER ====================
const DB = {
  get(k, d) { try { const v = localStorage.getItem('ps_'+k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
  set(k, v) { localStorage.setItem('ps_'+k, JSON.stringify(v)); },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
};

// ==================== FILE STORAGE (IndexedDB) ====================
const FileStore = {
  _db: null,
  async _open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('PersonalStudyFiles', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => { this._db = e.target.result; resolve(this._db); };
      req.onerror = (e) => reject(e.target.error);
    });
  },
  async save(id, data) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put({ id, data });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },
  async load(id) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const req = tx.objectStore('files').get(id);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },
  async remove(id) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }
};


// ==================== INIT ====================
function initDefaultData() {
  if (!DB.get('initialized')) {
    DB.set('exercises', [
      {id:"e1",name:"杠铃卧推",part:"胸"},{id:"e2",name:"上斜哑铃卧推",part:"胸"},{id:"e3",name:"哑铃飞鸟",part:"胸"},
      {id:"e4",name:"绳索夹胸",part:"胸"},{id:"e5",name:"双杠臂屈伸",part:"胸"},{id:"e6",name:"俯卧撑",part:"胸"},
      {id:"e7",name:"引体向上",part:"背"},{id:"e8",name:"杠铃划船",part:"背"},{id:"e9",name:"哑铃划船",part:"背"},
      {id:"e10",name:"高位下拉",part:"背"},{id:"e11",name:"坐姿划船",part:"背"},{id:"e12",name:"硬拉",part:"背"},
      {id:"e13",name:"深蹲",part:"腿"},{id:"e14",name:"腿举",part:"腿"},{id:"e15",name:"腿弯举",part:"腿"},
      {id:"e16",name:"腿屈伸",part:"腿"},{id:"e17",name:"罗马尼亚硬拉",part:"腿"},{id:"e18",name:"提踵",part:"腿"},
      {id:"e19",name:"杠铃推举",part:"肩"},{id:"e20",name:"哑铃推举",part:"肩"},{id:"e21",name:"侧平举",part:"肩"},
      {id:"e22",name:"前平举",part:"肩"},{id:"e23",name:"俯身飞鸟",part:"肩"},{id:"e24",name:"面拉",part:"肩"},
      {id:"e25",name:"杠铃弯举",part:"手臂"},{id:"e26",name:"哑铃弯举",part:"手臂"},{id:"e27",name:"锤式弯举",part:"手臂"},
      {id:"e28",name:"绳索下压",part:"手臂"},{id:"e29",name:"窄距卧推",part:"手臂"},{id:"e30",name:"法式弯举",part:"手臂"},
      {id:"e31",name:"跑步",part:"有氧"},{id:"e32",name:"椭圆机",part:"有氧"},{id:"e33",name:"划船机",part:"有氧"},
      {id:"e34",name:"跳绳",part:"有氧"},{id:"e35",name:"游泳",part:"有氧"},{id:"e36",name:"骑行",part:"有氧"},
      {id:"e37",name:"保加利亚分腿蹲",part:"腿"},{id:"e38",name:"山羊挺身",part:"背"},{id:"e39",name:"杠铃耸肩",part:"肩"},
      {id:"e40",name:"爬楼梯",part:"有氧"}
    ]);
    DB.set("journal", []); DB.set("plans", []); DB.set("errors", []);
    DB.set("workouts", []); DB.set("bodyData", []); DB.set("diet", []);
    DB.set("trainingPlan", [
      {day:"周一",part:"胸+三头",acts:"杠铃卧推|上斜哑铃卧推|哑铃飞鸟|绳索夹胸|绳索下压",cardio:""},
      {day:"周二",part:"背+二头",acts:"引体向上|杠铃划船|高位下拉|坐姿划船|杠铃弯举",cardio:""},
      {day:"周三",part:"腿+肩",acts:"深蹲|腿举|哑铃推举|侧平举|面拉",cardio:""},
      {day:"周四",part:"休息日",acts:"",cardio:"慢跑30min"},
      {day:"周五",part:"胸+背",acts:"上斜杠铃卧推|哑铃飞鸟|哑铃划船|高位下拉|面拉",cardio:""},
      {day:"周六",part:"腿+肩",acts:"硬拉|腿弯举|杠铃推举|侧平举|俯身飞鸟",cardio:""},
      {day:"周日",part:"手臂+核心",acts:"杠铃弯举|绳索下压|锤式弯举|法式弯举|窄距卧推",cardio:""},
    ]);
    DB.set("examDate", "2026-12-26"); DB.set("uploadedFiles", []);
    DB.set("initialized", true);
  }
}

// ==================== LOGIN ====================
function doLogin() {
  const pwd = document.getElementById("loginPwd").value.trim();
  if (!pwd) return;
  const stored = DB.get("password", "");
  if (!stored) { DB.set("password", pwd); initDefaultData(); }
  else if (stored !== pwd) {
    const msg = document.getElementById("loginMsg");
    msg.textContent = "密码错误"; msg.style.display = "block"; return;
  }
  document.getElementById("loginPage").classList.remove("active");
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("mainApp").classList.add("active");
  document.getElementById("mainApp").style.display = "block";
  navigate("dashboard");
}
function doLogout() {
  document.getElementById("mainApp").classList.remove("active");
  document.getElementById("mainApp").style.display = "none";
  document.getElementById("loginPage").classList.add("active");
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("loginPwd").value = "";
}
window.addEventListener("DOMContentLoaded", () => {
  const hint = document.getElementById("loginHint");
  hint.textContent = DB.get("password", "") ? "请输入密码" : "首次使用请设置密码";
});

// ==================== HELPERS ====================
function fmtDate(d) { const dt = new Date(d); return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"); }
function fmtSize(bytes) { if (bytes >= 1048576) return (bytes/1048576).toFixed(1)+"MB"; if (bytes >= 1024) return (bytes/1024).toFixed(1)+"KB"; return bytes+"B"; }
function today() { return fmtDate(new Date()); }
function thisMonth() { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }
function tagSpan(t) {
  const m = {"数学":"blue","英语":"green","政治":"amber","专业课":"purple","胸":"blue","背":"green","腿":"amber","肩":"purple","手臂":"red","有氧":"green"};
  return '<span class="tag tag-'+(m[t]||"gray")+'">'+t+"</span>";
}

// ==================== NAVIGATION ====================
let currentPage = "dashboard";
function navigate(page) {
  currentPage = page;
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  renderPage(page);
}
document.querySelectorAll(".nav-item").forEach(el => el.addEventListener("click", () => navigate(el.dataset.page)));

function renderPage(page) {
  const mc = document.getElementById("mainContent");
  switch(page) {
    case "dashboard": mc.innerHTML = renderDashboard(); setTimeout(initDashboard, 100); break;
    case "journal": mc.innerHTML = renderJournal(); break;
    case "plans": mc.innerHTML = renderPlans(); break;
    case "errors": mc.innerHTML = renderErrors(); break;
    case "files": mc.innerHTML = renderFiles(); break;
    case "workout": mc.innerHTML = renderWorkout(); break;
    case "body": mc.innerHTML = renderBody(); setTimeout(initBodyChart, 200); break;
    case "diet": mc.innerHTML = renderDiet(); break;
    case "training": mc.innerHTML = renderTraining(); break;
    case "calendar": mc.innerHTML = renderCalendar(); initCalendar(); break;
    case "settings": mc.innerHTML = renderSettings(); break;
  }
}

// ==================== MODAL ====================
function openModal(html) { document.getElementById("modalContent").innerHTML = html; document.getElementById("modalOverlay").classList.add("active"); }
function closeModal() { document.getElementById("modalOverlay").classList.remove("active"); }

// ==================== DASHBOARD ====================
function renderDashboard() {
  const examDate = DB.get("examDate", "2026-12-26");
  const daysLeft = Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000));
  const mon = thisMonth();
  const journals = DB.get("journal", []);
  const workouts = DB.get("workouts", []);
  const plans = DB.get("plans", []);
  const bodyData = DB.get("bodyData", []);
  const monthJournals = journals.filter(j => j.date.startsWith(mon));
  const monthWorkouts = workouts.filter(w => w.date.startsWith(mon));
  const monthPlans = plans.filter(p => p.date && p.date.startsWith(mon));
  const totalHours = (monthJournals.reduce((s, j) => s + (parseInt(j.duration)||0), 0) / 60).toFixed(1);
  const planDone = monthPlans.filter(p => p.done).length;
  const planRate = Math.round(planDone / Math.max(monthPlans.length, 1) * 100);
  let weightChange = "--";
  const monBody = [...bodyData].sort((a,b)=>a.date.localeCompare(b.date)).filter(b=>b.date.startsWith(mon));
  if (monBody.length >= 2) {
    const diff = (parseFloat(monBody[monBody.length-1].weight) - parseFloat(monBody[0].weight)).toFixed(1);
    weightChange = (diff > 0 ? "+" : "") + diff + "kg";
  }
  return '<div style="margin-bottom:24px"><h2 style="font-size:20px;font-weight:700">'+'\ud83c\udfe0'+' 首页看板</h2></div>'+
  '<div class="grid-2" style="margin-bottom:24px">'+
    '<div class="card card-blue" style="text-align:center;padding:32px 20px;background:linear-gradient(135deg,#eff6ff,#dbeafe)">'+
      '<div style="font-size:14px;color:#64748b;margin-bottom:8px">'+'\ud83d\udcc5'+' 距离考研还剩</div>'+
      '<div class="countdown-num">'+daysLeft+'</div><div style="font-size:16px;color:#64748b">天</div>'+
      '<div style="font-size:12px;color:#94a3b8;margin-top:12px">考试日期：'+examDate+'</div></div>'+
    '<div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:8px;font-size:14px">'+
      '<div>'+'\ud83c\udfaf'+' 目标：<strong>全力以赴，一战成硕</strong></div>'+
      '<div>'+'\ud83d\udcdd'+' 加油，每一天都算数</div></div></div>'+
  '<div class="grid-4" style="margin-bottom:24px">'+
    '<div class="card" style="text-align:center"><div style="font-size:24px">'+'\ud83d\udcda'+'</div><div class="stat-val">'+totalHours+'</div><div class="stat-label">本月学习总时长（小时）</div></div>'+
    '<div class="card" style="text-align:center"><div style="font-size:24px">'+'\ud83c\udfcb'+'</div><div class="stat-val">'+monthWorkouts.length+'</div><div class="stat-label">本月健身次数</div></div>'+
    '<div class="card" style="text-align:center"><div style="font-size:24px">'+'\u2705'+'</div><div class="stat-val">'+planRate+'%</div><div class="stat-label">本月计划完成率</div></div>'+
    '<div class="card" style="text-align:center"><div style="font-size:24px">'+'\u2696'+'</div><div class="stat-val">'+weightChange+'</div><div class="stat-label">本月体重变化</div></div></div>'+
  '<div class="card" style="margin-bottom:24px"><div style="font-weight:600;font-size:15px;margin-bottom:12px">'+'\ud83d\udcc8'+' 近7日学习时长趋势</div>'+
    '<div class="chart-wrap"><canvas id="dashboardChart"></canvas></div></div>'+
  '<div class="grid-2">'+
    '<div class="card"><div style="font-weight:600;font-size:13px;margin-bottom:8px">'+'\ud83d\udcd6'+' 最近学习日志</div>'+renderJournalList(journals.slice(-5).reverse())+'</div>'+
    '<div class="card"><div style="font-weight:600;font-size:13px;margin-bottom:8px">'+'\ud83d\udcaa'+' 最近训练</div>'+renderWorkoutList(workouts.slice(-5).reverse())+'</div></div>';
}

function initDashboard() {
  const journals = DB.get("journal", []);
  const dayNames = ["周日","周一","周二","周三","周四","周五","周六"];
  const days = []; const vals = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(dayNames[d.getDay()]);
    vals.push(journals.filter(j => j.date === fmtDate(d)).reduce((s,j) => s + (parseInt(j.duration)||0), 0));
  }
  const ctx = document.getElementById("dashboardChart");
  if (ctx) new Chart(ctx, {
    type: "bar", data: { labels: days, datasets: [{ label: "学习时长(分钟)", data: vals, backgroundColor: "#93c5fd", borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#f1f5f9" } }, x: { grid: { display: false } } } }
  });
}

function renderJournalList(items) {
  if (!items.length) return '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:20px">暂无数据</div>';
  return '<table>'+items.map(j => '<tr><td style="width:80px;font-size:11px;color:#94a3b8">'+j.date+'</td><td>'+j.title+'</td><td style="text-align:right;font-size:12px;color:#64748b">'+(j.duration||0)+'min</td></tr>').join("")+"</table>";
}
function renderWorkoutList(items) {
  if (!items.length) return '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:20px">暂无数据</div>';
  return '<table>'+items.map(w => '<tr><td style="width:80px;font-size:11px;color:#94a3b8">'+w.date+'</td><td>'+w.exercise+'</td><td>'+tagSpan(w.part||"")+'</td><td style="text-align:right;font-size:12px">'+(w.sets||0)+'x'+(w.weight||0)+'x'+(w.reps||0)+'</td></tr>').join("")+"</table>";
}

// ==================== JOURNAL ====================
function renderJournal() {
  const journals = DB.get("journal", []).sort((a,b) => b.date.localeCompare(a.date));
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<h2 style="font-size:20px;font-weight:700">'+'\ud83d\udcd6'+' 学习日志</h2>'+
    '<button class="btn btn-primary" onclick="modalAddJournal()">+ 新建日志</button></div>'+
    '<div style="display:flex;gap:12px;margin-bottom:16px">'+
    '<input class="input" id="journalSearch" placeholder="搜索标题..." style="max-width:300px" oninput="filterJournals()">'+
    '<select class="input" id="journalTagFilter" style="max-width:150px" onchange="filterJournals()">'+
    '<option value="">全部科目</option><option>数学</option><option>英语</option><option>政治</option><option>专业课</option></select></div>'+
    '<div id="journalList">'+renderJournalCards(journals)+'</div>';
}
function renderJournalCards(journals) {
  if (!journals.length) return '<div class="card" style="text-align:center;color:#94a3b8;padding:40px">暂无学习日志，点击右上角新建</div>';
  return journals.map(j => '<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:start"><div style="flex:1"><div style="font-weight:600;font-size:15px">'+j.title+'</div><div style="font-size:12px;color:#94a3b8;margin:4px 0">'+j.date+' / '+(j.duration||0)+'分钟 / '+(j.tags||[]).map(t=>tagSpan(t)).join("")+'</div><div style="font-size:13px;color:#475569;margin-top:6px;white-space:pre-wrap">'+(j.content||"")+'</div></div><button class="btn btn-sm btn-danger" onclick="deleteJournal(\x27'+j.id+'\x27)">删除</button></div></div>').join("");
}
function filterJournals() {
  const q = (document.getElementById("journalSearch")?.value||"").toLowerCase();
  const tag = document.getElementById("journalTagFilter")?.value||"";
  const journals = DB.get("journal", []).sort((a,b) => b.date.localeCompare(a.date));
  const filtered = journals.filter(j => {
    if (q && !j.title.toLowerCase().includes(q) && !(j.content||"").toLowerCase().includes(q)) return false;
    if (tag && !(j.tags||[]).includes(tag)) return false;
    return true;
  });
  document.getElementById("journalList").innerHTML = renderJournalCards(filtered);
}
function modalAddJournal() {
  openModal('<h3>新建学习日志</h3><form onsubmit="saveJournal(event)" id="journalForm">'+
    '<div class="form-group"><label>日期</label><input class="input" type="date" name="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label>标题</label><input class="input" name="title" placeholder="学习内容摘要" required></div>'+
    '<div class="form-group"><label>学习时长（分钟）</label><input class="input" type="number" name="duration" value="60" min="1"></div>'+
    '<div class="form-group"><label>科目标签</label><div style="display:flex;gap:8px;flex-wrap:wrap">'+
    ["数学","英语","政治","专业课"].map(t => '<label style="font-size:13px;cursor:pointer"><input type="checkbox" name="tag_'+t+'" value="'+t+'"> '+t+'</label>').join("")+'</div></div>'+
    '<div class="form-group"><label>学习内容</label><textarea class="input" name="content" rows="5" placeholder="记录今天的学习心得..."></textarea></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-outline" onclick="closeModal()">取消</button><button type="submit" class="btn btn-primary">保存</button></div></form>');
}
function saveJournal(e) {
  e.preventDefault();
  const f = document.getElementById("journalForm"); const fd = new FormData(f);
  const tags = []; ["数学","英语","政治","专业课"].forEach(t => { if (fd.get("tag_"+t)) tags.push(t); });
  const journals = DB.get("journal", []);
  journals.push({ id: DB.uid(), date: fd.get("date"), title: fd.get("title"), duration: parseInt(fd.get("duration"))||0, tags, content: fd.get("content")||"" });
  DB.set("journal", journals); closeModal(); navigate("journal");
}
function deleteJournal(id) { if (!confirm("确定删除这条日志？")) return; DB.set("journal", DB.get("journal",[]).filter(j => j.id !== id)); navigate("journal"); }

// ==================== PLANS ====================
function renderPlans() {
  const plans = DB.get("plans", []).sort((a,b) => b.date?.localeCompare(a.date) || -1);
  const done = plans.filter(p => p.done).length;
  const total = Math.max(plans.length, 1);
  const rate = Math.round(done / total * 100);
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<h2 style="font-size:20px;font-weight:700">'+'\ud83d\udccb'+' 学习计划</h2>'+
    '<button class="btn btn-primary" onclick="modalAddPlan()">+ 新建计划</button></div>'+
    '<div class="card" style="margin-bottom:16px"><div style="font-weight:600;font-size:14px;margin-bottom:8px">计划完成率：'+rate+'%</div>'+
    '<progress value="'+rate+'" max="100"></progress></div>'+
    '<div id="planList">'+renderPlanCards(plans)+'</div>';
}
function renderPlanCards(plans) {
  if (!plans.length) return '<div class="card" style="text-align:center;color:#94a3b8;padding:40px">暂无计划</div>';
  return plans.map(p => '<div class="card" style="margin-bottom:12px;'+(p.done?"opacity:.6":"")+'"><div style="display:flex;justify-content:space-between;align-items:start"><div style="flex:1"><div style="font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px"><input type="checkbox" '+(p.done?"checked":"")+' onchange="togglePlan(\x27'+p.id+'\x27,this.checked)" style="width:18px;height:18px">'+p.title+' <span class="badge badge-gray">'+(p.type||"")+'</span></div><div style="font-size:12px;color:#94a3b8;margin:4px 0">'+(p.date||"")+'</div><div style="font-size:13px;color:#475569;white-space:pre-wrap">'+(p.tasks||"")+'</div></div><button class="btn btn-sm btn-danger" onclick="deletePlan(\x27'+p.id+'\x27)">删除</button></div></div>').join("");
}
function togglePlan(id, checked) {
  const plans = DB.get("plans", []);
  const p = plans.find(p => p.id === id);
  if (p) { p.done = checked; DB.set("plans", plans); navigate("plans"); }
}
function modalAddPlan() {
  openModal('<h3>新建学习计划</h3><form onsubmit="savePlan(event)" id="planForm">'+
    '<div class="form-group"><label>计划标题</label><input class="input" name="title" placeholder="例：7月第1周-基础巩固" required></div>'+
    '<div class="form-group"><label>计划类型</label><select class="input" name="type"><option>日计划</option><option>周计划</option><option>月计划</option></select></div>'+
    '<div class="form-group"><label>日期</label><input class="input" type="date" name="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label>任务列表（每行一条）</label><textarea class="input" name="tasks" rows="5" placeholder="- 数学660题第三章\n- 英语真题精读\n- 专业课第5章背诵"></textarea></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-outline" onclick="closeModal()">取消</button><button type="submit" class="btn btn-primary">保存</button></div></form>');
}
function savePlan(e) {
  e.preventDefault();
  const f = document.getElementById("planForm"); const fd = new FormData(f);
  const plans = DB.get("plans", []);
  plans.push({ id: DB.uid(), title: fd.get("title"), type: fd.get("type"), date: fd.get("date"), tasks: fd.get("tasks")||"", done: false });
  DB.set("plans", plans); closeModal(); navigate("plans");
}
function deletePlan(id) { if (!confirm("确定删除？")) return; DB.set("plans", DB.get("plans",[]).filter(p => p.id !== id)); navigate("plans"); }

// ==================== ERRORS ====================
function renderErrors() {
  const errors = DB.get("errors", []).sort((a,b) => b.date?.localeCompare(a.date) || -1);
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<h2 style="font-size:20px;font-weight:700">'+'\u274c'+' 错题本</h2>'+
    '<div style="display:flex;gap:8px"><select class="input" id="errorSubjectFilter" onchange="filterErrors()" style="max-width:120px">'+
    '<option value="">全部</option><option>数学</option><option>英语</option><option>政治</option><option>专业课</option></select>'+
    '<button class="btn btn-primary" onclick="modalAddError()">+ 录入错题</button></div></div>'+
    '<div id="errorList">'+renderErrorCards(errors)+'</div>';
}
function renderErrorCards(errors) {
  if (!errors.length) return '<div class="card" style="text-align:center;color:#94a3b8;padding:40px">暂无错题记录</div>';
  const sc = {"未掌握":"red","待巩固":"amber","已掌握":"green"};
  return errors.map(e => '<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:start"><div style="flex:1"><div style="font-weight:600;font-size:15px">'+e.title+'</div><div style="font-size:12px;color:#94a3b8;margin:4px 0">'+tagSpan(e.subject)+' / 原因：'+(e.reason||"")+' / 考点：'+(e.examPoint||"")+' <span class="badge badge-'+(sc[e.status]||"gray")+'">'+(e.status||"未掌握")+'</span></div><div style="font-size:13px;color:#475569;margin-top:4px;white-space:pre-wrap">正确解法：'+(e.solution||"")+'</div></div><button class="btn btn-sm btn-danger" onclick="deleteError(\x27'+e.id+'\x27)">删除</button></div></div>').join("");
}
function filterErrors() {
  const subj = document.getElementById("errorSubjectFilter")?.value||"";
  const errors = DB.get("errors", []).sort((a,b) => b.date?.localeCompare(a.date) || -1);
  document.getElementById("errorList").innerHTML = renderErrorCards(subj ? errors.filter(e => e.subject === subj) : errors);
}
function modalAddError() {
  openModal('<h3>录入错题</h3><form onsubmit="saveError(event)" id="errorForm">'+
    '<div class="form-group"><label>题目描述</label><input class="input" name="title" placeholder="简要描述错题" required></div>'+
    '<div class="form-group"><label>科目</label><select class="input" name="subject"><option>数学</option><option>英语</option><option>政治</option><option>专业课</option></select></div>'+
    '<div class="form-group"><label>错误原因</label><select class="input" name="reason"><option>计算失误</option><option>概念不清</option><option>审题错误</option><option>遗忘</option><option>时间不够</option></select></div>'+
    '<div class="form-group"><label>考点标签</label><input class="input" name="examPoint" placeholder="例：极限、中值定理"></div>'+
    '<div class="form-group"><label>正确解法</label><textarea class="input" name="solution" rows="4" placeholder="正确的解题思路"></textarea></div>'+
    '<div class="form-group"><label>掌握状态</label><select class="input" name="status"><option>未掌握</option><option>待巩固</option><option>已掌握</option></select></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-outline" onclick="closeModal()">取消</button><button type="submit" class="btn btn-primary">保存</button></div></form>');
}
function saveError(e) {
  e.preventDefault();
  const f = document.getElementById("errorForm"); const fd = new FormData(f);
  const errors = DB.get("errors", []);
  errors.push({ id: DB.uid(), title: fd.get("title"), subject: fd.get("subject"), reason: fd.get("reason"), examPoint: fd.get("examPoint"), solution: fd.get("solution"), status: fd.get("status"), date: today() });
  DB.set("errors", errors); closeModal(); navigate("errors");
}
function deleteError(id) { if (!confirm("确定删除？")) return; DB.set("errors", DB.get("errors",[]).filter(e => e.id !== id)); navigate("errors"); }

// ==================== FILES ====================
function renderFiles() {
  const files = DB.get("uploadedFiles", []);
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<h2 style="font-size:20px;font-weight:700">'+'\ud83d\udcc1'+' 文件资料库</h2>'+
    '<button class="btn btn-primary" onclick="modalAddFile()">+ 上传文件</button></div>'+
    '<div class="card"><div style="font-weight:600;font-size:14px;margin-bottom:12px">按分类浏览</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'+
    ["全部","数学","英语","政治","专业课"].map(c => '<button class="btn btn-sm '+(c==="全部"?"btn-primary":"btn-outline")+'" onclick="filterFileCat(\x27'+c+'\x27)">'+(c==="全部"?"\ud83d\udcc2 全部":c)+'</button>').join("")+"</div>"+
    '<div id="fileList">'+renderFileGrid(files)+'</div></div>';
}
function renderFileGrid(files) {
  if (!files.length) return '<div style="text-align:center;color:#94a3b8;padding:40px">暂无文件</div>';
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">'+files.map(f => '<div class="card" style="text-align:center;padding:16px"><div style="font-size:32px;margin-bottom:8px">'+'\ud83d\udcc4'+'</div><div style="font-size:13px;font-weight:500;word-break:break-all">'+f.name+'</div><div style="font-size:11px;color:#94a3b8;margin:4px 0">'+tagSpan(f.category)+' / '+(f.size||"")+'</div><button class="btn btn-sm btn-primary" onclick="downloadFile(\x27'+f.id+'\x27)">下载</button> <button class="btn btn-sm btn-danger" onclick="deleteFile(\x27'+f.id+'\x27)">删</button></div>').join("")+"</div>";
}
function filterFileCat(cat) {
  const files = DB.get("uploadedFiles", []);
  document.getElementById("fileList").innerHTML = renderFileGrid(cat === "全部" ? files : files.filter(f => f.category === cat));
}
function modalAddFile() {
  openModal('<h3>\u4e0a\u4f20\u6587\u4ef6</h3><form onsubmit="saveFile(event)" id="fileForm"><div class="form-group"><label>\u9009\u62e9\u6587\u4ef6</label><input class="input" type="file" name="file" required></div><div class="form-group"><label>\u5206\u7c7b</label><select class="input" name="category"><option>\u6570\u5b66</option><option>\u82f1\u8bed</option><option>\u653f\u6cbb</option><option>\u4e13\u4e1a\u8bfe</option></select></div><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-outline" onclick="closeModal()">\u53d6\u6d88</button><button type="submit" class="btn btn-primary">\u4e0a\u4f20</button></div></form>');
}
function saveFile(e) {
  e.preventDefault();
  e.stopPropagation();
  const f = document.getElementById("fileForm");
  if (!f) return;
  const fd = new FormData(f);
  const file = fd.get("file");
  if (!file || !file.name) return;
  if (file.size > 500 * 1024 * 1024) { alert("文件超过 500MB"); return; }
  const reader = new FileReader();
  reader.onload = async function() {
    try {
      const id = DB.uid();
      await FileStore.save(id, reader.result);
      const files = DB.get("uploadedFiles", []);
      files.push({ id, name: file.name, category: fd.get("category"), size: fmtSize(file.size), date: today() });
      DB.set("uploadedFiles", files);
      closeModal(); navigate("files");
    } catch(err) {
      alert("存储失败：" + err.message);
    }
  };
  reader.onerror = function() { alert("文件读取失败"); };
  reader.readAsArrayBuffer(file);
  return false;
}

async function downloadFile(id) { const f = DB.get("uploadedFiles",[]).find(x => x.id === id); if(f){ try { const stored = await FileStore.load(id); const blob = stored ? new Blob([stored.data]) : null; const url = blob ? URL.createObjectURL(blob) : f.data; const a = document.createElement("a"); a.href = url; a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); } catch(e) { alert("下载失败: "+e.message); } } }
async function deleteFile(id) { if(!confirm("\u786e\u5b9a\u5220\u9664\uff1f")) return; try { await FileStore.remove(id); } catch(e) {} DB.set("uploadedFiles", DB.get("uploadedFiles",[]).filter(x => x.id !== id)); navigate("files"); }

// ==================== WORKOUT ====================
function renderWorkout() {
  const workouts = DB.get("workouts", []).sort((a,b) => b.date?.localeCompare(a.date) || -1);
  const exercises = DB.get("exercises", []);
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<h2 style="font-size:20px;font-weight:700">'+'\ud83d\udcaa'+' 训练打卡</h2>'+
    '<button class="btn btn-primary" onclick="modalAddWorkout()">+ 打卡</button></div>'+
    '<div class="card" style="margin-bottom:16px"><div style="font-weight:600;font-size:14px;margin-bottom:8px">'+'\ud83c\udfcb'+' 动作库（点击快速打卡）</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">'+["胸","背","腿","肩","手臂","有氧"].map(part => {
      const acts = exercises.filter(e => e.part === part);
      return '<div style="margin-bottom:8px"><span class="badge badge-blue" style="margin-right:4px">'+part+'</span>'+acts.map(e => '<span class="tag tag-green" style="cursor:pointer" onclick="quickWorkout(\x27'+e.name+'\x27,\x27'+e.part+'\x27)">'+e.name+'</span>').join("")+"</div>";
    }).join("")+"</div></div>"+
    '<div id="workoutList"><h3 style="font-size:15px;font-weight:600;margin:16px 0 8px">打卡记录</h3>'+renderWorkoutCards(workouts)+'</div>';
}
function quickWorkout(name, part) {
  openModal('<h3>快速打卡：'+name+'</h3><form onsubmit="saveWorkout(event)" id="workoutForm"><input type="hidden" name="exercise" value="'+name+'"><input type="hidden" name="part" value="'+part+'"><div class="form-group"><label>日期</label><input class="input" type="date" name="date" value="'+today()+'"></div><div class="form-group"><label>组数</label><input class="input" type="number" name="sets" value="4" min="1"></div><div class="form-group"><label>重量(kg)</label><input class="input" type="number" name="weight" value="60" min="0"></div><div class="form-group"><label>次数</label><input class="input" type="number" name="reps" value="10" min="1"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-outline" onclick="closeModal()">取消</button><button type="submit" class="btn btn-primary">打卡</button></div></form>');
}
function modalAddWorkout() {
  const exList = DB.get("exercises",[]).map(e => '<option value="'+e.name+'">').join("");
  openModal('<h3>训练打卡</h3><form onsubmit="saveWorkout(event)" id="workoutForm2"><div class="form-group"><label>动作名称</label><input class="input" name="exercise" list="exList" placeholder="输入或选择动作" required><datalist id="exList">'+exList+'</datalist></div><div class="form-group"><label>训练部位</label><select class="input" name="part"><option>胸</option><option>背</option><option>腿</option><option>肩</option><option>手臂</option><option>核心</option><option>有氧</option></select></div><div class="form-group"><label>日期</label><input class="input" type="date" name="date" value="'+today()+'"></div><div class="form-group"><label>组数</label><input class="input" type="number" name="sets" value="4" min="1"></div><div class="form-group"><label>重量(kg)</label><input class="input" type="number" name="weight" value="60" min="0"></div><div class="form-group"><label>次数</label><input class="input" type="number" name="reps" value="10" min="1"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-outline" onclick="closeModal()">取消</button><button type="submit" class="btn btn-primary">打卡</button></div></form>');
}
function saveWorkout(e) {
  e.preventDefault();
  const f = e.target; const fd = new FormData(f);
  const workouts = DB.get("workouts", []);
  workouts.push({ id: DB.uid(), exercise: fd.get("exercise"), part: fd.get("part"), date: fd.get("date"), sets: parseInt(fd.get("sets"))||0, weight: parseInt(fd.get("weight"))||0, reps: parseInt(fd.get("reps"))||0, ktime: fd.get("ktime")||"" });
  DB.set("workouts", workouts); closeModal(); navigate("workout");
}
function renderWorkoutCards(workouts) {
  if (!workouts.length) return '<div style="color:#94a3b8;text-align:center;padding:20px">暂无训练记录</div>';
  return workouts.map(w => '<div class="card" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><div><span style="font-weight:600">'+w.exercise+'</span> '+tagSpan(w.part||"")+' <span style="font-size:12px;color:#94a3b8">'+w.date+'</span></div><div style="display:flex;align-items:center;gap:12px"><span style="font-size:13px;color:#64748b">'+w.sets+'组 x '+w.weight+'kg x '+w.reps+'次</span><button class="btn btn-sm btn-danger" onclick="deleteWorkout(\x27'+w.id+'\x27)">删除</button></div></div>').join("");
}
function deleteWorkout(id) { if(!confirm("确定删除？")) return; DB.set("workouts", DB.get("workouts",[]).filter(w => w.id !== id)); navigate("workout"); }

// ==================== BODY DATA ====================
function renderBody() {
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<h2 style="font-size:20px;font-weight:700">'+'\ud83d\udcca'+' 身体数据</h2>'+
    '<button class="btn btn-primary" onclick="modalAddBody()">+ 录入数据</button></div>'+
    '<div class="card" style="margin-bottom:20px"><div style="font-weight:600;font-size:14px;margin-bottom:12px">'+'\ud83d\udcc8'+' 长期趋势</div>'+
    '<div class="chart-wrap"><canvas id="bodyChart"></canvas></div></div>'+
    '<div class="card"><div style="font-weight:600;font-size:14px;margin-bottom:12px">历史记录</div>'+renderBodyTable()+'</div>';
}
function renderBodyTable() {
  const data = DB.get("bodyData", []).sort((a,b) => b.date.localeCompare(a.date));
  if (!data.length) return '<div style="color:#94a3b8;text-align:center;padding:20px">暂无数据</div>';
  return '<table><tr><th>日期</th><th>体重</th><th>胸围</th><th>腰围</th><th>臂围</th><th>大腿围</th><th>操作</th></tr>'+
    data.map(d => '<tr><td>'+d.date+'</td><td>'+d.weight+'kg</td><td>'+d.chest+'cm</td><td>'+d.waist+'cm</td><td>'+d.arm+'cm</td><td>'+d.thigh+'cm</td><td><button class="btn btn-sm btn-danger" onclick="deleteBody(\x27'+d.id+'\x27)">删除</button></td></tr>').join("")+"</table>";
}
function initBodyChart() {
  const data = DB.get("bodyData", []).sort((a,b) => a.date.localeCompare(a.date));
  if (!data.length) return;
  const labels = data.map(d => d.date);
  const ctx = document.getElementById("bodyChart");
  if (ctx) new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {label:"体重(kg)",data:data.map(d=>parseFloat(d.weight)),borderColor:"#3b82f6",tension:.3},
        {label:"胸围(cm)",data:data.map(d=>parseFloat(d.chest)),borderColor:"#22c55e",tension:.3},
        {label:"腰围(cm)",data:data.map(d=>parseFloat(d.waist)),borderColor:"#f59e0b",tension:.3},
        {label:"臂围(cm)",data:data.map(d=>parseFloat(d.arm)),borderColor:"#8b5cf6",tension:.3},
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { grid: { color: "#f1f5f9" } }, x: { grid: { display: false } } } }
  });
}
function modalAddBody() {
  const last = DB.get("bodyData",[]).sort((a,b)=>b.date.localeCompare(a.date))[0];
  openModal('<h3>录入身体数据</h3><form onsubmit="saveBody(event)" id="bodyForm">'+
    '<div class="form-group"><label>日期</label><input class="input" type="date" name="date" value="'+today()+'"></div>'+
    '<div class="grid-2">'+
    '<div class="form-group"><label>体重(kg)</label><input class="input" type="number" name="weight" step="0.1" value="'+(last?last.weight:"70")+'"></div>'+
    '<div class="form-group"><label>胸围(cm)</label><input class="input" type="number" name="chest" step="0.1" value="'+(last?last.chest:"95")+'"></div>'+
    '<div class="form-group"><label>腰围(cm)</label><input class="input" type="number" name="waist" step="0.1" value="'+(last?last.waist:"80")+'"></div>'+
    '<div class="form-group"><label>臂围(cm)</label><input class="input" type="number" name="arm" step="0.1" value="'+(last?last.arm:"35")+'"></div>'+
    '<div class="form-group"><label>大腿围(cm)</label><input class="input" type="number" name="thigh" step="0.1" value="'+(last?last.thigh:"55")+'"></div></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-outline" onclick="closeModal()">取消</button><button type="submit" class="btn btn-primary">保存</button></div></form>');
}
function saveBody(e) {
  e.preventDefault();
  const f = document.getElementById("bodyForm"); const fd = new FormData(f);
  const data = DB.get("bodyData", []);
  data.push({ id: DB.uid(), date: fd.get("date"), weight: fd.get("weight"), chest: fd.get("chest"), waist: fd.get("waist"), arm: fd.get("arm"), thigh: fd.get("thigh") });
  DB.set("bodyData", data); closeModal(); navigate("body");
}
function deleteBody(id) { if(!confirm("确定删除？")) return; DB.set("bodyData", DB.get("bodyData",[]).filter(d => d.id !== id)); navigate("body"); }

// ==================== DIET ====================
function renderDiet() {
  const diets = DB.get("diet", []).sort((a,b) => b.date?.localeCompare(a.date) || -1);
  const todayDiets = diets.filter(d => d.date === today());
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<h2 style="font-size:20px;font-weight:700">'+'\ud83c\udf7d'+' 饮食记录</h2>'+
    '<button class="btn btn-primary" onclick="modalAddDiet()">+ 记录饮食</button></div>'+
    '<div class="card" style="margin-bottom:20px"><div style="font-weight:600;font-size:14px;margin-bottom:12px">今日饮食（'+today()+'）</div>'+
    (todayDiets.length ? ["早餐","午餐","晚餐","加餐"].map(meal => {
      const items = todayDiets.filter(d => d.meal === meal);
      return '<div style="margin-bottom:8px"><span class="badge badge-blue">'+meal+'</span> '+(items.length ? items.map(i => i.food+' ('+(i.cal||"?")+'kcal)').join(" / ") : '<span style="color:#94a3b8">未记录</span>')+'</div>';
    }).join("") : '<div style="color:#94a3b8;text-align:center;padding:12px">今日暂无饮食记录</div>')+'</div>'+
    '<div class="card"><div style="font-weight:600;font-size:14px;margin-bottom:12px">历史记录</div>'+renderDietTable(diets)+'</div>';
}
function renderDietTable(diets) {
  if (!diets.length) return '<div style="color:#94a3b8;text-align:center;padding:20px">暂无记录</div>';
  return '<table><tr><th>日期</th><th>餐别</th><th>食物</th><th>热量</th><th>操作</th></tr>'+
    diets.map(d => '<tr><td>'+d.date+'</td><td>'+d.meal+'</td><td>'+d.food+'</td><td>'+(d.cal||"--")+'kcal</td><td><button class="btn btn-sm btn-danger" onclick="deleteDiet(\x27'+d.id+'\x27)">删除</button></td></tr>').join("")+"</table>";
}
function modalAddDiet() {
  openModal('<h3>记录饮食</h3><form onsubmit="saveDiet(event)" id="dietForm">'+
    '<div class="form-group"><label>日期</label><input class="input" type="date" name="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label>餐别</label><select class="input" name="meal"><option>早餐</option><option>午餐</option><option>晚餐</option><option>加餐</option></select></div>'+
    '<div class="form-group"><label>食材/菜品</label><input class="input" name="food" placeholder="例：鸡胸肉200g+西兰花+糙米饭" required></div>'+
    '<div class="form-group"><label>热量估算(kcal)</label><input class="input" type="number" name="cal" placeholder="可选"></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn btn-outline" onclick="closeModal()">取消</button><button type="submit" class="btn btn-primary">保存</button></div></form>');
}
function saveDiet(e) {
  e.preventDefault();
  const f = document.getElementById("dietForm"); const fd = new FormData(f);
  const diets = DB.get("diet", []);
  diets.push({ id: DB.uid(), date: fd.get("date"), meal: fd.get("meal"), food: fd.get("food"), cal: fd.get("cal")||"" });
  DB.set("diet", diets); closeModal(); navigate("diet");
}
function deleteDiet(id) { if(!confirm("确定删除？")) return; DB.set("diet", DB.get("diet",[]).filter(d => d.id !== id)); navigate("diet"); }

// ==================== TRAINING PLAN ====================
function renderTraining() {
  const plan = DB.get("trainingPlan", []);
  return '<div style="margin-bottom:20px"><h2 style="font-size:20px;font-weight:700">'+'\ud83c\udfcb'+' 训练计划表</h2></div>'+
    '<div class="card"><div style="font-weight:600;font-size:14px;margin-bottom:12px">推拉腿分化训练</div>'+
    '<table><tr><th>星期</th><th>训练部位</th><th>主要动作</th><th>有氧</th></tr>'+
    plan.map(d => '<tr><td style="font-weight:600">'+d.day+'</td><td>'+d.part+'</td><td style="font-size:12px">'+(d.acts||"").replace(/\|/g," / ")+'</td><td style="font-size:12px">'+(d.cardio||"--")+'</td></tr>').join("")+"</table></div>";
}

// ==================== CALENDAR ====================
let calYear, calMonth;
function renderCalendar() {
  const now = new Date();
  return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<h2 style="font-size:20px;font-weight:700">'+'\ud83d\udcc5'+' 日历视图</h2>'+
    '<div style="display:flex;align-items:center;gap:12px">'+
    '<button class="btn btn-sm btn-outline" onclick="changeMonth(-1)">\u25c0</button>'+
    '<span style="font-size:16px;font-weight:600" id="calMonthLabel">'+(now.getFullYear()+"年"+(now.getMonth()+1)+"月")+'</span>'+
    '<button class="btn btn-sm btn-outline" onclick="changeMonth(1)">\u25b6</button>'+
    '<button class="btn btn-sm btn-outline" onclick="changeMonth(0)">今天</button></div></div>'+
    '<div class="card"><div class="calendar-grid" id="calGrid"></div></div>'+
    '<div class="card" style="margin-top:16px;display:none" id="calDetail"><div style="font-weight:600;font-size:14px;margin-bottom:8px" id="calDetailDate"></div><div id="calDetailContent"></div></div>';
}
function initCalendar() {
  const now = new Date();
  calYear = now.getFullYear(); calMonth = now.getMonth();
  renderCalGrid();
}
function changeMonth(delta) {
  if (delta === 0) { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); }
  else { calMonth += delta; if (calMonth < 0) { calMonth = 11; calYear--; } if (calMonth > 11) { calMonth = 0; calYear++; } }
  document.getElementById("calMonthLabel").textContent = calYear+"年"+(calMonth+1)+"月";
  renderCalGrid();
}
function renderCalGrid() {
  const grid = document.getElementById("calGrid");
  const todayStr = today();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const dayNames = ["日","一","二","三","四","五","六"];
  const journals = DB.get("journal", []);
  const workouts = DB.get("workouts", []);
  let html = dayNames.map(d => '<div class="cal-day-header">'+d+'</div>').join("");
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell" style="background:transparent;border:none"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = calYear+"-"+String(calMonth+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    const studyMins = journals.filter(j => j.date === ds).reduce((s,j) => s + (parseInt(j.duration)||0), 0);
    const workoutCount = workouts.filter(w => w.date === ds).length;
    let dots = "";
    if (studyMins > 0) dots += '<span class="cal-dot study" title="学习'+studyMins+'min"></span>';
    if (workoutCount > 0) dots += '<span class="cal-dot workout" title="健身'+workoutCount+'次"></span>';
    html += '<div class="cal-cell'+(ds===todayStr?" today":"")+'" onclick="showCalDetail(\x27'+ds+'\x27)"><div class="date-num">'+d+'</div>'+dots+(studyMins?'<div style="font-size:10px;color:#3b82f6">'+studyMins+'min</div>':"")+'</div>';
  }
  grid.innerHTML = html;
}
function showCalDetail(ds) {
  const journals = DB.get("journal",[]).filter(j => j.date === ds);
  const workouts = DB.get("workouts",[]).filter(w => w.date === ds);
  const diets = DB.get("diet",[]).filter(di => di.date === ds);
  document.getElementById("calDetail").style.display = "block";
  document.getElementById("calDetailDate").textContent = "\ud83d\udcc5 "+ds+" 详情";
  let html = "";
  html += '<div style="margin-bottom:12px"><strong>\ud83d\udcd6 学习日志</strong> '+(journals.length ? journals.map(j => '<div style="font-size:13px;margin:4px 0">- '+j.title+' ('+j.duration+'分钟) '+(j.tags||[]).map(t=>tagSpan(t)).join("")+'</div>').join("") : '<span style="color:#94a3b8;font-size:13px">无记录</span>')+'</div>';
  html += '<div style="margin-bottom:12px"><strong>\ud83d\udcaa 训练打卡</strong> '+(workouts.length ? workouts.map(w => '<div style="font-size:13px;margin:4px 0">- '+w.exercise+' '+w.sets+'x'+w.weight+'x'+w.reps+(w.ktime?' ('+w.ktime+')':'')+' '+tagSpan(w.part||"")+'</div>').join("") : '<span style="color:#94a3b8;font-size:13px">无记录</span>')+'</div>';
  html += '<div style="margin-bottom:12px"><strong>\ud83c\udf7d 饮食记录</strong> '+(diets.length ? diets.map(di => '<div style="font-size:13px;margin:4px 0">- ['+di.meal+'] '+di.food+' ('+(di.cal||"?")+'kcal)</div>').join("") : '<span style="color:#94a3b8;font-size:13px">无记录</span>')+'</div>';
  document.getElementById("calDetailContent").innerHTML = html;
}

// ==================== SETTINGS ====================
function renderSettings() {
  const examDate = DB.get("examDate", "2026-12-26");
  return '<div style="margin-bottom:20px"><h2 style="font-size:20px;font-weight:700">'+'\u2699'+' 设置</h2></div>'+
    '<div class="card" style="margin-bottom:16px"><div style="font-weight:600;font-size:14px;margin-bottom:12px">'+'\ud83d\udd11'+' 修改密码</div>'+
    '<div class="form-group"><label>新密码</label><input class="input" type="password" id="newPwd" style="max-width:300px"></div>'+
    '<button class="btn btn-primary btn-sm" onclick="changePwd()">保存密码</button></div>'+
    '<div class="card" style="margin-bottom:16px"><div style="font-weight:600;font-size:14px;margin-bottom:12px">'+'\ud83d\udcc5'+' 考试日期</div>'+
    '<div class="form-group"><label>考试日期</label><input class="input" type="date" id="examDateInput" value="'+examDate+'" style="max-width:250px"></div>'+
    '<button class="btn btn-primary btn-sm" onclick="changeExamDate()">保存日期</button></div>'+
    '<div class="card" style="margin-bottom:16px"><div style="font-weight:600;font-size:14px;margin-bottom:12px">'+'\ud83d\udce4'+' 数据导出</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
    '<button class="btn btn-outline btn-sm" onclick="exportCSV(\x27journal\x27)">导出学习日志</button>'+
    '<button class="btn btn-outline btn-sm" onclick="exportCSV(\x27plans\x27)">导出学习计划</button>'+
    '<button class="btn btn-outline btn-sm" onclick="exportCSV(\x27errors\x27)">导出错题本</button>'+
    '<button class="btn btn-outline btn-sm" onclick="exportCSV(\x27workouts\x27)">导出训练打卡</button>'+
    '<button class="btn btn-outline btn-sm" onclick="exportCSV(\x27bodyData\x27)">导出身体数据</button>'+
    '<button class="btn btn-outline btn-sm" onclick="exportCSV(\x27diet\x27)">导出饮食记录</button>'+
    '<button class="btn btn-outline btn-sm" onclick="exportAll()">一键导出全部 (Excel)</button></div></div>'+
    '<div class="card"><div style="font-weight:600;font-size:14px;margin-bottom:12px;color:#dc2626">'+'\u26a0'+' 危险操作</div>'+
    '<button class="btn btn-danger btn-sm" onclick="resetAll()">重置所有数据</button>'+
    '<button class="btn btn-danger btn-sm" style="margin-left:8px" onclick="doLogout()">退出登录</button></div>';
}
function changePwd() {
  const pwd = document.getElementById("newPwd").value.trim();
  if (!pwd) return alert("请输入新密码");
  DB.set("password", pwd);
  alert("密码已更新");
  document.getElementById("newPwd").value = "";
}
function changeExamDate() {
  const d = document.getElementById("examDateInput").value;
  DB.set("examDate", d);
  alert("考试日期已更新为 "+d);
}
function resetAll() {
  if (!confirm("确定要重置所有数据吗？此操作不可恢复！")) return;
  if (!confirm("再次确认：所有学习日志、健身记录、身体数据等将被永久删除！")) return;
  const pwd = DB.get("password", "");
  localStorage.clear();
  if (pwd) DB.set("password", pwd);
  initDefaultData();
  alert("数据已重置");
  navigate("dashboard");
}

// ==================== EXPORT ====================
function exportCSV(type) {
  const nameMap = {journal:"学习日志",plans:"学习计划",errors:"错题本",workouts:"训练打卡",bodyData:"身体数据",diet:"饮食记录"};
  const data = DB.get(type, []);
  if (!data.length) return alert("无数据可导出");
  let csv = "\uFEFF";
  const keys = Object.keys(data[0]).filter(k => k !== "id" && k !== "data");
  csv += keys.join(",") + "\n";
  data.forEach(row => {
    csv += keys.map(k => { const v = (row[k]||"").toString().replace(/"/g,'""').replace(/\n/g," "); return '"'+v+'"'; }).join(",") + "\n";
  });
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nameMap[type]+"_"+today()+".csv";
  a.click();
}
function exportAll() {
  const types = ["journal","plans","errors","workouts","bodyData","diet"];
  const wb = XLSX.utils.book_new();
  const nameMap = {journal:"学习日志",plans:"学习计划",errors:"错题本",workouts:"训练打卡",bodyData:"身体数据",diet:"饮食记录"};
  types.forEach(type => {
    const data = DB.get(type, []);
    if (data.length) {
      const clean = data.map(row => { const r = {}; Object.keys(row).forEach(k => { if (k !== "id" && k !== "data") r[k] = row[k]; }); return r; });
      const ws = XLSX.utils.json_to_sheet(clean);
      XLSX.utils.book_append_sheet(wb, ws, nameMap[type]);
    }
  });
  XLSX.writeFile(wb, "个人书房数据导出_"+today()+".xlsx");
}
