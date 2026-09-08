/* 课表渲染：专业选择 + 按真实时间的周历视图 */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };

  /* ---------------- 时间轴 ---------------- */
  var DAY_START_MIN = 8 * 60;
  var DAY_END_MIN = 19 * 60 + 40;
  var PXM = 1.2;
  var H = Math.round((DAY_END_MIN - DAY_START_MIN) * PXM);
  var MAX_WEEK = 19;

  function hm(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }

  /* 第1周 = 2026-08-31 周一；第2周 = 2026-09-07 起使用 */
  var FIRST_MONDAY = new Date(2026, 7, 31);
  function mondayOfWeek(w) { var d = new Date(FIRST_MONDAY); d.setDate(d.getDate() + (w - 1) * 7); return d; }
  function fmtDate(d) { return (d.getMonth() + 1) + "月" + d.getDate() + "日"; }
  function fmtShort(d) { return (d.getMonth() + 1) + "/" + d.getDate(); }
  function weekOfMonday(m) { return Math.round((m - FIRST_MONDAY) / 864e5 / 7) + 1; }

  var state = { major: 0, week: null };
  function entries() { return MAJORS[state.major].schedule; }
  function major() { return MAJORS[state.major]; }

  function loadState() {
    try {
      var m = parseInt(localStorage.getItem("kb-major"), 10);
      if (!isNaN(m) && m >= 0 && m < MAJORS.length) state.major = m;
    } catch (e) { /* ignore */ }
  }
  function saveState() {
    try { localStorage.setItem("kb-major", String(state.major)); } catch (e) { /* ignore */ }
  }

  /* ---------------- 顶部：专业 + 周次 ---------------- */
  function buildHeader() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var monday = new Date(today);
    monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7));
    var tw = weekOfMonday(monday);
    loadState();

    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="head-row">' +
      '  <div class="head-left">' +
      '    <div class="t-main">2026～2027学年第一学期 · 硕士研究生课表</div>' +
      '    <div class="t-sub" id="majorInfo">信息学院 · 教学周第2～17周（2026年9月7日第2周起使用）</div>' +
      '  </div>' +
      '  <div class="head-right">' +
      '    <span id="weekRange" class="week-range"></span>' +
      '    <button id="btnPrev" class="mini-btn" title="上一周">‹ 上周</button>' +
      '    <button id="btnBack" class="mini-btn accent" title="回到本周">本周</button>' +
      '    <button id="btnNext" class="mini-btn" title="下一周">下周 ›</button>' +
      '  </div>' +
      '</div>' +
      '<div class="major-row"><span class="major-label">专业：</span><div id="majorStrip" class="major-strip"></div></div>' +
      '<div class="week-strip-wrap"><div id="weekStrip" class="week-strip"></div></div>';
    (document.querySelector("#topBar .inner") || $("#topBar")).appendChild(wrap);

    /* 专业药丸（顺序=数据顺序，光电信息工程在首位） */
    var mstrip = $("#majorStrip");
    MAJORS.forEach(function (mj, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wpill maj" + (i === state.major ? " on" : "");
      b.dataset.i = i;
      b.textContent = mj.short;
      b.title = mj.grade;
      b.addEventListener("click", function () { selectMajor(i); });
      mstrip.appendChild(b);
    });

    /* 周次药丸 1..19 */
    for (var w = 1; w <= MAX_WEEK; w++) {
      (function (w) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "wpill" + (w < 2 ? " off" : "");
        b.dataset.w = w;
        b.innerHTML = "第<b>" + w + "</b>周";
        b.title = fmtDate(mondayOfWeek(w)) + " 起";
        b.addEventListener("click", function () { setWeek(w); });
        $("#weekStrip").appendChild(b);
      })(w);
    }

    var init = (tw >= 2 && tw <= MAX_WEEK) ? tw : 2;
    setWeek(init, true);

    $("#btnPrev").addEventListener("click", function () { nav(-1); });
    $("#btnNext").addEventListener("click", function () { nav(1); });
    $("#btnBack").addEventListener("click", function () {
      setWeek(tw >= 2 && tw <= MAX_WEEK ? tw : 2);
    });
  }

  function selectMajor(i) {
    if (i === state.major) return;
    state.major = i;
    saveState();
    document.querySelectorAll("#majorStrip .maj").forEach(function (b, k) {
      b.classList.toggle("on", k === i);
    });
    refreshAll();
    var tt = $("#weekRangeTitle");
    if (tt) tt.textContent = major().short + " · 第" + state.week + "周 课程日历";
    var mi = $("#majorInfo");
    if (mi) mi.textContent = "信息学院 · " + major().grade + " · 教学周第2～17周（2026年9月7日第2周起使用）";
  }

  function setWeek(w, silent) {
    state.week = w;
    document.querySelectorAll("#weekStrip .wpill").forEach(function (b) {
      b.classList.toggle("on", +b.dataset.w === w);
    });
    var m = mondayOfWeek(w);
    var end = new Date(m); end.setDate(end.getDate() + 6);
    var label = "第" + w + "周 · " + fmtDate(m) + " — " + fmtDate(end);
    var rr = $("#weekRange"); if (rr) rr.textContent = label;
    var tt = $("#weekRangeTitle"); if (tt) tt.textContent = major().short + " · " + label + " 课程日历";
    var mi = $("#majorInfo");
    if (mi) mi.textContent = "信息学院 · " + major().grade + " · 教学周第2～17周（2026年9月7日第2周起使用）";
    if (!silent) { renderCal(); renderWeekTable(); buildLegend(); }
  }

  function nav(delta) {
    var w = state.week + delta;
    if (w < 1) w = 1;
    if (w > MAX_WEEK) w = MAX_WEEK;
    setWeek(w);
  }

  function refreshAll() {
    renderCal();
    renderWeekTable();
    renderAllTable();
    buildLegend();
  }

  /* ---------------- 时间轴几何 ---------------- */
  function topOf(mins) { return Math.round((mins - DAY_START_MIN) * PXM); }

  /* 同一格多门课（如日语/俄语任选）左右分栏 */
  function layoutDay(blocks) {
    var n = blocks.length;
    if (!n) return;
    var lanes = new Array(n).fill(0);
    var maxLane = 0;
    for (var i = 0; i < n; i++) {
      var lane = 0;
      for (;;) {
        var clash = false;
        for (var j = 0; j < i; j++) {
          if (lanes[j] === lane &&
              blocks[j].secA <= blocks[i].secB && blocks[i].secA <= blocks[j].secB) {
            clash = true; break;
          }
        }
        if (!clash) break;
        lane++;
      }
      lanes[i] = lane;
      if (lane > maxLane) maxLane = lane;
    }
    var cols = maxLane + 1;
    for (var k = 0; k < n; k++) { blocks[k].lane = lanes[k]; blocks[k].cols = cols; }
  }

  /* ---------------- 日历 ---------------- */
  function renderCal() {
    var cal = $("#cal");
    cal.innerHTML = "";

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var monday = new Date(today);
    monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7));
    var isCurrentWeek = weekOfMonday(monday) === state.week;
    var list = entries().filter(function (e) { return e.weeks.indexOf(state.week) >= 0; });

    /* 表头 */
    var head = document.createElement("div");
    head.className = "cal-head";
    var corner = document.createElement("div");
    corner.className = "head-cell corner-cell";
    corner.textContent = "时间";
    head.appendChild(corner);
    for (var d = 1; d <= 7; d++) {
      var dc = document.createElement("div");
      dc.className = "head-cell day-cell" + (d >= 6 ? " wkend" : "");
      var dm = new Date(monday); dm.setDate(dm.getDate() + (d - 1));
      var isToday = isCurrentWeek && (today.getDay() + 6) % 7 === d - 1;
      dc.innerHTML = '<span class="dn">' + DAYS[d - 1] + "</span>" +
        '<span class="dd' + (isToday ? " tday" : "") + '">' + fmtShort(dm) + "</span>";
      head.appendChild(dc);
    }
    cal.appendChild(head);

    if (!list.length) {
      var tip = document.createElement("div");
      tip.className = "no-course";
      tip.textContent = "本周（第" + state.week + "周）" + major().short + " 没有课程安排";
      cal.appendChild(tip);
    }

    var body = document.createElement("div");
    body.className = "cal-body";
    body.style.height = H + "px";

    /* 时间轨道 */
    var rail = document.createElement("div");
    rail.className = "rail";
    PERIODS.forEach(function (p) {
      var t0 = hm(p.start), t1 = hm(p.end);
      var el = document.createElement("div");
      el.className = "peri";
      el.style.top = (topOf(t0) + 1) + "px";
      el.style.height = Math.max(24, Math.round((t1 - t0) * PXM) - 2) + "px";
      el.innerHTML = '<span class="pn">' + p.no + "</span>" + p.start;
      rail.appendChild(el);
    });
    body.appendChild(rail);

    /* 各天 */
    for (var dd = 1; dd <= 7; dd++) {
      var col = document.createElement("div");
      col.className = "day-col" + (dd >= 6 ? " wkend" : "") +
        (isCurrentWeek && (today.getDay() + 6) % 7 === dd - 1 ? " tday" : "");
      var dayEntries = list.filter(function (e) { return e.day === dd; });

      if (dayEntries.length) layoutDay(dayEntries);
      dayEntries.forEach(function (e) {
        var colo = colorOf(e);
        var t0 = hm(PERIODS[e.secA - 1].start);
        var t1 = hm(PERIODS[e.secB - 1].end);
        var card = document.createElement("div");
        card.className = "c-card";
        card.style.background = colo.bg;
        card.style.borderLeftColor = colo.line;
        card.style.top = (topOf(t0) + 1) + "px";
        card.style.height = Math.round((t1 - t0) * PXM) - 3 + "px";
        card.style.color = colo.fg;
        card.dataset.course = e.name;
        if (e.cols > 1) {
          var w = 100 / e.cols;
          card.style.left = "calc(" + (w * e.lane) + "% + 3px)";
          card.style.right = "auto";
          card.style.width = "calc(" + w + "% - " + (e.lane === e.cols - 1 ? 6 : 5) + "px)";
        }
        card.innerHTML =
          '<div class="cc-name">' + shortName(e) + "</div>" +
          '<div class="cc-meta">' + e.room + " · " + firstTeacher(e) + "</div>" +
          (e.eva ? '<div class="cc-eva">100%形成性评价</div>' : "") +
          (e.alt ? '<div class="cc-eva">公共外语（任选其一）</div>' : "") +
          '<div class="cc-sec">' + e.secA + (e.secB === e.secA ? "" : "–" + e.secB) + "节</div>";
        card.addEventListener("click", function () { selectEntry(e); });
        col.appendChild(card);
      });
      body.appendChild(col);
    }

    /* 网格线最上层（不挡点击） */
    var gl = document.createElement("div");
    gl.className = "grid-lines";
    for (var h = 9; h <= 19; h++) {
      var ln = document.createElement("div");
      ln.className = "hour";
      ln.style.top = topOf(h * 60) + "px";
      gl.appendChild(ln);
    }
    [["11:45", "13:20"], ["16:50", "18:00"]].forEach(function (z) {
      var zo = document.createElement("div");
      zo.className = "zone";
      zo.style.top = (topOf(hm(z[0])) + 1) + "px";
      zo.style.height = Math.max(0, Math.round((hm(z[1]) - hm(z[0])) * PXM) - 2) + "px";
      gl.appendChild(zo);
    });
    body.appendChild(gl);
    cal.appendChild(body);
  }

  function firstTeacher(e) {
    return e.teachers.split("、")[0].split(" ")[0];
  }

  /* ---------------- 详情浮层 ---------------- */
  function selectEntry(e) {
    var pane = $("#detail");
    var colo = colorOf(e);
    pane.style.display = "block";
    var sec1 = PERIODS[e.secA - 1], sec2 = PERIODS[e.secB - 1];
    pane.innerHTML =
      '<div class="det-close">×</div>' +
      '<div class="det-head" style="background:' + colo.bg + ";border-left:6px solid " + colo.line + '">' +
      '  <div class="det-name">' + e.name + "</div>" +
      '  <div class="det-cat">' + major().short + " · " + e.cat + " · 总学时 " + e.hours +
      (e.eva ? " · 100%形成性评价" : "") + "</div>" +
      "</div>" +
      '<div class="det-row"><span>星期</span>' + DAYS[e.day - 1] + "</div>" +
      '<div class="det-row"><span>节次</span>第' + e.secA + (e.secB === e.secA ? "" : "～" + e.secB) +
      "节（" + sec1.start + "–" + sec2.end + "）</div>" +
      '<div class="det-row"><span>周次</span>' + e.wdesc + "</div>" +
      '<div class="det-row"><span>教室</span>' + e.room + "</div>" +
      '<div class="det-row"><span>教师</span>' + e.teachers + "</div>" +
      (e.alt ? '<div class="det-row"><span></span>公共外语（日语/俄语）任选其一修读</div>' : "");
    var close = pane.querySelector(".det-close");
    if (close) close.addEventListener("click", function () { pane.style.display = "none"; });
    pane.addEventListener("click", function (ev) { if (ev.target === pane) pane.style.display = "none"; });
  }

  /* ---------------- 本周明细 ---------------- */
  function renderWeekTable() {
    var list = entries().filter(function (e) { return e.weeks.indexOf(state.week) >= 0; });
    var t = $("#weekListTitle");
    if (t) t.textContent = "（" + major().short + "，第" + state.week + "周）" +
      list.map(function (e) { return shortName(e); }).join("、");
    var tb = $("#weekBody");
    tb.innerHTML = "";
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="7" class="empty">本周没有课程安排</td></tr>';
      return;
    }
    list.slice().sort(function (a, b) { return a.day - b.day || a.secA - b.secA; }).forEach(function (e) {
      var sec1 = PERIODS[e.secA - 1], sec2 = PERIODS[e.secB - 1];
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td>' + DAYS[e.day - 1] + " 第" + e.secA + (e.secB === e.secA ? "" : "~" + e.secB) + "节</td>" +
        "<td>" + sec1.start + "–" + sec2.end + "</td>" +
        "<td>" + e.name + "</td>" +
        "<td>" + e.room + "</td>" +
        "<td>" + e.teachers + "</td>" +
        "<td>" + e.cat + " / " + (e.hours || "-") + "学时</td>" +
        "<td>" + (e.eva ? "是" : "—") + "</td>";
      tr.addEventListener("click", function () { selectEntry(e); });
      tb.appendChild(tr);
    });
  }

  /* ---------------- 学期总览表 ---------------- */
  function renderAllTable() {
    var tb = $("#allBody");
    var all = entries().slice().sort(function (a, b) { return a.day - b.day || a.secA - b.secA; });
    var t = $("#allTitle");
    if (t) t.textContent = "本学期课程总览（" + major().short + "，共" + all.length + "条安排）";
    tb.innerHTML = "";
    all.forEach(function (e) {
      var colo = colorOf(e);
      var sec1 = PERIODS[e.secA - 1], sec2 = PERIODS[e.secB - 1];
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><span class="dot" style="background:' + colo.fg + '"></span>' + e.name + "</td>" +
        "<td>" + e.cat + "</td>" +
        "<td>" + (e.hours || "-") + "</td>" +
        "<td>" + DAYS[e.day - 1] + " 第" + e.secA + (e.secB === e.secA ? "" : "~" + e.secB) + "节</td>" +
        "<td>" + sec1.start + "–" + sec2.end + "</td>" +
        "<td>" + e.wdesc + "</td>" +
        "<td>" + e.room + "</td>" +
        "<td>" + e.teachers + "</td>" +
        "<td>" + (e.eva ? "是" : "—") + "</td>";
      tr.addEventListener("click", function () { selectEntry(e); });
      tb.appendChild(tr);
    });
  }

  /* ---------------- 图例 ---------------- */
  function buildLegend() {
    var el = $("#legend");
    if (!el) return;
    el.innerHTML = "";
    var seen = {};
    entries().forEach(function (e) {
      var key = shortName(e);
      if (seen[key]) return;
      seen[key] = true;
      var colo = colorOf(e);
      var s = document.createElement("span");
      s.className = "lg";
      s.innerHTML = '<i style="background:' + colo.bg + ";border:1px solid " + colo.line + '"></i>' + key;
      el.appendChild(s);
    });
  }

  /* ---------------- 说明 ---------------- */
  function buildNotes() {
    $("#notes").innerHTML =
      '<div class="note-title">说明</div><ol>' +
      "<li>数据来源：《信息学院-2026～2027学年第一学期硕士研究生专业课程表.pdf》，含 6 个专业：电子信息（光电信息工程）、光学工程、控制科学与工程、电子信息（计算机技术）、电子信息（控制工程）、电子信息（通信工程）。教学周第2～17周，2026年9月7日（第2周）起使用；个别课程延至第18/19周。</li>" +
      "<li>顶部“专业”可切换课表（选择会被记住）；日历按真实时间摆放，午休（11:45–13:20）、晚休（16:50–18:00）间隔已留出。</li>" +
      "<li>“双周/单周”指偶数周/奇数周上课；同一时段并排出现的两门课为“任选其一”安排（如控制科学与工程周日的日语/俄语）。</li>" +
      "<li>因节假日休息而影响的课程，由任课教师自行安排补课；公共课程上课安排以网站发布的《2026～2027学年第一学期研究生公共课表》为准。</li>" +
      "<li>节次时间：①08:00-08:45 ②08:55-09:40 ③10:05-10:50 ④11:00-11:45 ⑤13:20-14:05 ⑥14:10-14:55 ⑦15:15-16:00 ⑧16:05-16:50 ⑨18:00-18:45 ⑩18:55-19:40。</li>" +
      "</ol>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildHeader();
    renderCal();
    renderWeekTable();
    renderAllTable();
    buildLegend();
    buildNotes();
  });
})();
