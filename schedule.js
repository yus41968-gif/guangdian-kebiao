/* 课表渲染：按真实时间的周历视图（学习通/日历样式） */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  /* ---------------- 时间轴 ---------------- */
  const DAY_START_MIN = 8 * 60;      // 00:00 起的分钟数：08:00
  const DAY_END_MIN = 19 * 60 + 40;  // 19:40
  const PXM = 1.2;                   // 每分钟像素
  const H = Math.round((DAY_END_MIN - DAY_START_MIN) * PXM); // 日历总高

  const hm = (t) => { const p = t.split(":"); return +p[0] * 60 + +p[1]; };

  /* 教学周：第1周 = 2026-08-31 周一；第2周 = 2026-09-07 起使用 */
  const FIRST_MONDAY = new Date(2026, 7, 31);
  function mondayOfWeek(w) { const d = new Date(FIRST_MONDAY); d.setDate(d.getDate() + (w - 1) * 7); return d; }
  function fmtDate(d) { return (d.getMonth() + 1) + "月" + d.getDate() + "日"; }
  function fmtShort(d) { return (d.getMonth() + 1) + "/" + d.getDate(); }
  function weekOfMonday(m) { return Math.round((m - FIRST_MONDAY) / 86400000 / 7) + 1; }

  let currentWeek = null;

  /* ---------------- 顶部：周次选择 ---------------- */
  function buildHeader() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7));
    const tw = weekOfMonday(monday);

    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="head-row">' +
      '  <div class="head-left">' +
      '    <div class="t-main">2026～2027学年第一学期 · 硕士研究生课表</div>' +
      '    <div class="t-sub">信息学院 · 26级电子信息（光电信息工程）· 教学周第2～17周（2026年9月7日第2周起使用）</div>' +
      '  </div>' +
      '  <div class="head-right">' +
      '    <span id="weekRange" class="week-range"></span>' +
      '    <button id="btnPrev" class="mini-btn" title="上一周">‹ 上周</button>' +
      '    <button id="btnBack" class="mini-btn accent" title="回到本周">本周</button>' +
      '    <button id="btnNext" class="mini-btn" title="下一周">下周 ›</button>' +
      '  </div>' +
      '</div>' +
      '<div class="week-strip-wrap"><div id="weekStrip" class="week-strip"></div></div>';
    const host = document.querySelector("#topBar .inner") || $("#topBar");
    host.appendChild(wrap);

    /* 周次药丸 1..18 */
    const strip = $("#weekStrip");
    for (let w = 1; w <= 18; w++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wpill" + (w < 2 || w > 17 ? " off" : "");
      b.dataset.w = w;
      b.innerHTML = "第<b>" + w + "</b>周";
      b.title = fmtDate(mondayOfWeek(w)) + " 起";
      b.addEventListener("click", () => { setWeek(w); });
      strip.appendChild(b);
    }

    /* 当前周初始值 */
    const init = (tw >= 2 && tw <= 17) ? tw : 2;
    setWeek(init, true);

    $("#btnPrev").addEventListener("click", () => nav(-1));
    $("#btnNext").addEventListener("click", () => nav(1));
    $("#btnBack").addEventListener("click", () => {
      setWeek(tw >= 2 && tw <= 17 ? tw : 2);
    });

    function nav(d) {
      let w = currentWeek + d;
      if (w < 1) w = 1;
      if (w > 18) w = 18;
      setWeek(w);
    }
  }

  function setWeek(w, silent) {
    currentWeek = w;
    document.querySelectorAll("#weekStrip .wpill").forEach((b) => {
      b.classList.toggle("on", +b.dataset.w === w);
    });
    const m = mondayOfWeek(w);
    const end = new Date(m);
    end.setDate(end.getDate() + 6);
    const label = "第" + w + "周 · " + fmtDate(m) + " — " + fmtDate(end);
    const rr = $("#weekRange");
    if (rr) rr.textContent = label;
    const tt = $("#weekRangeTitle");
    if (tt) tt.textContent = label + " 课程日历";
    if (!silent) {
      renderCal();
      renderWeekTable();
    }
  }

  /* ---------------- 时间轴几何 ---------------- */
  const topOf = (hmins) => Math.round((hmins - DAY_START_MIN) * PXM);

  /* ---------------- 日历 ---------------- */
  function renderCal() {
    const cal = $("#cal");
    cal.innerHTML = "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7));
    const isCurrentWeek = weekOfMonday(monday) === currentWeek;
    const entries = SCHEDULE.filter((e) => e.weeks.indexOf(currentWeek) >= 0);

    /* —— 头部星期行 —— */
    const head = document.createElement("div");
    head.className = "cal-head";
    const corner = document.createElement("div");
    corner.className = "head-cell corner-cell";
    corner.textContent = "时间";
    head.appendChild(corner);
    for (let d = 1; d <= 7; d++) {
      const dc = document.createElement("div");
      dc.className = "head-cell day-cell" + (d >= 6 ? " wkend" : "");
      const dm = new Date(monday);
      dm.setDate(dm.getDate() + (d - 1));
      const isToday = isCurrentWeek && (today.getDay() + 6) % 7 === d - 1;
      dc.innerHTML = '<span class="dn">' + DAYS[d - 1] + "</span>" +
        '<span class="dd' + (isToday ? " tday" : "") + '">' + fmtShort(dm) + "</span>";
      head.appendChild(dc);
    }
    cal.appendChild(head);

    if (!entries.length) {
      const tip = document.createElement("div");
      tip.className = "no-course";
      tip.textContent = "本周（第" + currentWeek + "周）没有课程安排，可点击上方“本周/下周”查看其他周";
      cal.appendChild(tip);
    }

    /* —— 主体（时间轴 + 7 天） —— */
    const body = document.createElement("div");
    body.className = "cal-body";
    body.style.height = H + "px";

    /* 时间轨道（左列） */
    const rail = document.createElement("div");
    rail.className = "rail";
    PERIODS.forEach((p) => {
      const t0 = hm(p.start), t1 = hm(p.end);
      const el = document.createElement("div");
      el.className = "peri";
      el.style.top = (topOf(t0) + 1) + "px";
      el.style.height = Math.max(24, Math.round((t1 - t0) * PXM) - 2) + "px";
      el.innerHTML = '<span class="pn">' + p.no + "</span>" + p.start;
      rail.appendChild(el);
    });
    body.appendChild(rail);

    /* 各天列 */
    for (let d = 1; d <= 7; d++) {
      const col = document.createElement("div");
      col.className = "day-col" + (d >= 6 ? " wkend" : "") +
        (isCurrentWeek && (today.getDay() + 6) % 7 === d - 1 ? " tday" : "");
      const dayEntries = entries.filter((e) => e.day === d);

      dayEntries.forEach((e) => {
        const colo = colorOf(e);
        const t0 = hm(PERIODS[e.secA - 1].start);
        const t1 = hm(PERIODS[e.secB - 1].end);
        const card = document.createElement("div");
        card.className = "c-card";
        card.style.background = colo.bg;
        card.style.borderLeftColor = colo.line;
        card.style.top = (topOf(t0) + 1) + "px";
        card.style.height = Math.round((t1 - t0) * PXM) - 3 + "px";
        card.style.color = colo.fg;
        card.dataset.course = e.name;
        card.innerHTML =
          '<div class="cc-name">' + shortName(e) + "</div>" +
          '<div class="cc-meta">' + e.room + " · " + firstTeacher(e) + "</div>" +
          (e.eva ? '<div class="cc-eva">100%形成性评价</div>' : "") +
          '<div class="cc-sec">' + e.secA + (e.secB === e.secA ? "" : "–" + e.secB) + "节</div>";
        card.addEventListener("click", () => selectEntry(e));
        col.appendChild(card);
      });
      body.appendChild(col);
    }

    /* 网格线放最上层以免被日列背景遮住：整点线 + 午休/晚休带（不挡点击） */
    const gl = document.createElement("div");
    gl.className = "grid-lines";
    for (let h = 9; h <= 19; h++) {
      const ln = document.createElement("div");
      ln.className = "hour";
      ln.style.top = topOf(h * 60) + "px";
      gl.appendChild(ln);
    }
    [["11:45", "13:20"], ["16:50", "18:00"]].forEach((z) => {
      const zo = document.createElement("div");
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
    const pane = $("#detail");
    const colo = colorOf(e);
    pane.style.display = "block";
    const sec1 = PERIODS[e.secA - 1], sec2 = PERIODS[e.secB - 1];
    pane.innerHTML =
      '<div class="det-close">×</div>' +
      '<div class="det-head" style="background:' + colo.bg + ";border-left:6px solid " + colo.line + '">' +
      '  <div class="det-name">' + e.name + "</div>" +
      '  <div class="det-cat">' + e.cat + " · 总学时 " + e.hours + (e.eva ? " · 100%形成性评价" : "") + "</div>" +
      "</div>" +
      '<div class="det-row"><span>星期</span>' + DAYS[e.day - 1] + "</div>" +
      '<div class="det-row"><span>节次</span>第' + e.secA + (e.secB === e.secA ? "" : "～" + e.secB) +
      "节（" + sec1.start + "–" + sec2.end + "）</div>" +
      '<div class="det-row"><span>周次</span>' + e.wdesc + "</div>" +
      '<div class="det-row"><span>教室</span>' + e.room + "</div>" +
      '<div class="det-row"><span>教师</span>' + e.teachers + "</div>";
    pane.querySelector(".det-close").addEventListener("click", () => { pane.style.display = "none"; });
    pane.addEventListener("click", (ev) => { if (ev.target === pane) pane.style.display = "none"; });
  }

  /* ---------------- 本周明细表 ---------------- */
  function renderWeekTable() {
    const list = SCHEDULE.filter((e) => e.weeks.indexOf(currentWeek) >= 0);
    $("#weekListTitle").textContent = "本周（第" + currentWeek + "周）课程明细 —— " +
      list.map((e) => shortName(e)).join("、");
    const tb = $("#weekBody");
    tb.innerHTML = "";
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="7" class="empty">本周没有课程安排</td></tr>';
      return;
    }
    const sorted = list.slice().sort((a, b) => a.day - b.day || a.secA - b.secA);
    sorted.forEach((e) => {
      const sec1 = PERIODS[e.secA - 1], sec2 = PERIODS[e.secB - 1];
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td>' + DAYS[e.day - 1] + " 第" + e.secA + (e.secB === e.secA ? "" : "~" + e.secB) + "节</td>" +
        "<td>" + sec1.start + "–" + sec2.end + "</td>" +
        "<td>" + e.name + "</td>" +
        "<td>" + e.room + "</td>" +
        "<td>" + e.teachers + "</td>" +
        "<td>" + e.cat + " / " + e.hours + "学时</td>" +
        "<td>" + (e.eva ? "是" : "—") + "</td>";
      tr.addEventListener("click", () => selectEntry(e));
      tb.appendChild(tr);
    });
  }

  /* ---------------- 学期总览表 ---------------- */
  function renderAllTable() {
    const tb = $("#allBody");
    SCHEDULE.slice().sort((a, b) => a.day - b.day || a.secA - b.secA).forEach((e) => {
      const colo = colorOf(e);
      const sec1 = PERIODS[e.secA - 1], sec2 = PERIODS[e.secB - 1];
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td><span class="dot" style="background:' + colo.fg + '"></span>' + e.name + "</td>" +
        "<td>" + e.cat + "</td>" +
        "<td>" + e.hours + "</td>" +
        "<td>" + DAYS[e.day - 1] + " 第" + e.secA + (e.secB === e.secA ? "" : "~" + e.secB) + "节</td>" +
        "<td>" + sec1.start + "–" + sec2.end + "</td>" +
        "<td>" + e.wdesc + "</td>" +
        "<td>" + e.room + "</td>" +
        "<td>" + e.teachers + "</td>" +
        "<td>" + (e.eva ? "是" : "—") + "</td>";
      tr.addEventListener("click", () => selectEntry(e));
      tb.appendChild(tr);
    });
  }

  /* ---------------- 图例 ---------------- */
  function buildLegend() {
    const el = $("#legend");
    const seen = {};
    SCHEDULE.forEach((e) => {
      const key = shortName(e);
      if (seen[key]) return;
      seen[key] = true;
      const colo = colorOf(e);
      const s = document.createElement("span");
      s.className = "lg";
      s.innerHTML = '<i style="background:' + colo.bg + ";border:1px solid " + colo.line + '"></i>' + key;
      el.appendChild(s);
    });
  }

  /* ---------------- 说明 ---------------- */
  function buildNotes() {
    $("#notes").innerHTML =
      '<div class="note-title">说明</div><ol>' +
      "<li>本课表数据来源：《信息学院-2026～2027学年第一学期硕士研究生专业课程表.pdf》（年级专业：26级电子信息（光电信息工程））。教学周第2～17周，2026年9月7日（第2周）起使用；个别课程延至第18周。</li>" +
      "<li>日历按真实时间摆放：午休（11:45–13:20）、晚饭（16:50–18:00）等课间间隔均已留出，课程卡片顶到哪一节、几点开始一目了然。</li>" +
      "<li>“双周”指偶数周；英语听力（双周）在第2、4周及第8～18周的偶数周上课。</li>" +
      "<li>因节假日休息而影响的课程，由任课教师自行安排补课；公共课程上课安排以网站发布的《2026～2027学年第一学期研究生公共课表》为准。</li>" +
      "<li>节次时间：①08:00-08:45 ②08:55-09:40 ③10:05-10:50 ④11:00-11:45 ⑤13:20-14:05 ⑥14:10-14:55 ⑦15:15-16:00 ⑧16:05-16:50 ⑨18:00-18:45 ⑩18:55-19:40。</li>" +
      "</ol>";
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildHeader();
    buildLegend();
    renderCal();
    renderWeekTable();
    renderAllTable();
    buildNotes();
    window.addEventListener("resize", () => { /* no-op */ });
  });
})();
