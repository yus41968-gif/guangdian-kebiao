/* 信息学院 26级电子信息（光电信息工程） 2026～2027学年第一学期课表数据 */
/* 节次时间表 */
const PERIODS = [
  { no: 1,  start: "08:00", end: "08:45" },
  { no: 2,  start: "08:55", end: "09:40" },
  { no: 3,  start: "10:05", end: "10:50" },
  { no: 4,  start: "11:00", end: "11:45" },
  { no: 5,  start: "13:20", end: "14:05" },
  { no: 6,  start: "14:10", end: "14:55" },
  { no: 7,  start: "15:15", end: "16:00" },
  { no: 8,  start: "16:05", end: "16:50" },
  { no: 9,  start: "18:00", end: "18:45" },
  { no: 10, start: "18:55", end: "19:40" },
];
const DAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

/* 教学周信息：第2周从 2026-09-07（周一）起
 * weekIndex(w) = 2026-08-31 + (w-1)*7 天 */
const FIRST_MONDAY = new Date(2026, 7, 31); // 2026-08-31 = 第1周周一

/*
 * 每条安排：
 *   name, short(卡片显示名), cat(类别), hours(总学时), teachers, room,
 *   day(1=周一 … 7=周日), secA, secB(起止节次), weeks(具体周次数组),
 *   wdesc(卡片/表格显示周次文字), eval(是否100%形成性评价)
 */
const SCHEDULE = [
  {
    name: "英语听力（双周）", cat: "学位课", hours: "16", teachers: "路雅琴", room: "A642",
    day: 1, secA: 5, secB: 6,
    weeks: [2, 4, 8, 10, 12, 14, 16, 18],
    wdesc: "双周·第2-4、8-18周",
  },
  {
    name: "优化分析与实验设计（第2-4周）", cat: "学位课", hours: "32", teachers: "刘超 林爽 崔慧", room: "综A227",
    day: 1, secA: 7, secB: 10,
    weeks: [2, 3, 4],
    wdesc: "第2-4周",
  },
  {
    name: "光学原理", cat: "必修课", hours: "32", teachers: "张云翠、梁静、王午登", room: "B303", eva: "是",
    day: 2, secA: 1, secB: 4,
    weeks: rangeW(2, 9),
    wdesc: "第2-9周",
  },
  {
    name: "现代光学信息处理技术导论", cat: "必修课", hours: "24", teachers: "张云翠、梁静", room: "B303",
    day: 2, secA: 5, secB: 8,
    weeks: rangeW(2, 7),
    wdesc: "第2-7周",
  },
  {
    name: "优化分析与实验设计（第7-16周）", cat: "学位课", hours: "32", teachers: "刘超 林爽 崔慧", room: "综A227",
    day: 2, secA: 9, secB: 10,
    weeks: rangeW(7, 16),
    wdesc: "第7-16周",
  },
  {
    name: "英语精读", cat: "学位课", hours: "32", teachers: "路雅琴", room: "A312",
    day: 3, secA: 3, secB: 4,
    weeks: rangeW(2, 5).concat(rangeW(7, 18)),
    wdesc: "第2-5、7-18周",
  },
  {
    name: "新时代中国特色社会主义理论与实践（第2-4、7周）", cat: "学位课", hours: "32", teachers: "刘艳婷", room: "综A227",
    day: 3, secA: 7, secB: 9,
    weeks: rangeW(2, 4).concat([7]),
    wdesc: "第2-4、7周",
  },
  {
    name: "新时代中国特色社会主义理论与实践（第8-12周）", cat: "学位课", hours: "32", teachers: "刘艳婷", room: "综A332",
    day: 3, secA: 7, secB: 10,
    weeks: rangeW(8, 12),
    wdesc: "第8-12周",
  },
  {
    name: "知识产权、科学道德与伦理", cat: "专业必修课", hours: "16", teachers: "于晶杰", room: "综A321",
    day: 4, secA: 5, secB: 8,
    weeks: rangeW(10, 13),
    wdesc: "第10-13周",
  },
  {
    name: "工程伦理", cat: "公共必修课", hours: "8", teachers: "于晶杰、姚春龙、姜珊、李鹏", room: "综A618",
    day: 4, secA: 7, secB: 8,
    weeks: rangeW(14, 17),
    wdesc: "第14-17周",
  },
  {
    name: "光电信息工程科技讲座", cat: "必修课", hours: "16", teachers: "王志胜", room: "B303", eva: "是",
    day: 5, secA: 5, secB: 6,
    weeks: rangeW(3, 10),
    wdesc: "第3-10周",
  },
  {
    name: "高等光学工程实验", cat: "专业必修课", hours: "16", teachers: "张云翠、张宇航", room: "综A404", eva: "是",
    day: 6, secA: 1, secB: 8,
    weeks: rangeW(15, 16),
    wdesc: "第15、16周（全天）",
  },
  {
    name: "日语", cat: "学位课", hours: "48", teachers: "周首能", room: "综A118",
    day: 7, secA: 1, secB: 4,
    weeks: rangeW(2, 4).concat(rangeW(6, 14)),
    wdesc: "第2-4、6-14周",
  },
];

function rangeW(a, b) {
  const out = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

/* 卡片显示名：去掉 “（周次说明）” 尾巴，只保留课程名主体 */
function stripWeeks(n) {
  return String(n).replace(/（[^（）]*周[^（）]*）$/, "").replace(/\([^()]*周[^()]*\)$/, "");
}
function shortName(entry) {
  return stripWeeks(entry.name) || entry.name;
}

/* 为每个课程分配一种颜色（按出现顺序，稳定；同名课程同色） */
const PALETTE = [
  { bg: "#fde7e9", line: "#f0b3b9", fg: "#a33341" }, // 红
  { bg: "#fef0d8", line: "#f3d190", fg: "#9a6a12" }, // 橙黄
  { bg: "#e3f4e6", line: "#b3dcbb", fg: "#1e7a34" }, // 绿
  { bg: "#e2eefa", line: "#aecdf5", fg: "#1c5da8" }, // 蓝
  { bg: "#ece5f9", line: "#c9b8ec", fg: "#5e3fa3" }, // 紫
  { bg: "#fdeaf2", line: "#f3bcd3", fg: "#a02c63" }, // 粉
  { bg: "#ddf2f0", line: "#a6dcd6", fg: "#0e6e63" }, // 青
  { bg: "#f5f0de", line: "#dcd0a0", fg: "#7d6a1f" }, // 米黄
  { bg: "#f0ebe7", line: "#d3c4b8", fg: "#6b4a2e" }, // 棕
  { bg: "#e4e8f7", line: "#bcc6ee", fg: "#33408f" }, // 靛蓝
  { bg: "#e9f4fa", line: "#c0e0f0", fg: "#22688f" }, // 浅蓝
];
const COURSE_COLORS = {};
let paletteIdx = 0;
function colorOf(entry) {
  const key = stripWeeks(entry.name);
  if (!(key in COURSE_COLORS)) {
    COURSE_COLORS[key] = PALETTE[paletteIdx % PALETTE.length];
    paletteIdx++;
  }
  return COURSE_COLORS[key];
}
