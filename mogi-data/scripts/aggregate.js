const fs = require("fs");
const path = require("path");

function readAllUserData() {
  const base = path.join(__dirname, "..", "users");
  const result = [];

  if (!fs.existsSync(base)) return result;

  const users = fs.readdirSync(base);
  for (const user of users) {
    const userDir = path.join(base, user);
    if (!fs.statSync(userDir).isDirectory()) continue;

    const files = fs.readdirSync(userDir);
    for (const f of files) {
      const full = path.join(userDir, f);
      try {
        const json = JSON.parse(fs.readFileSync(full, "utf8"));
        result.push(json);
      } catch (e) {
        console.error("JSON parse error:", full);
      }
    }
  }
  return result;
}

function avg(arr) {
  return arr.length === 0 ? 0 : arr.reduce((a,b)=>a+b,0) / arr.length;
}

function ensure(obj, key, init) {
  if (!obj[key]) obj[key] = init;
  return obj[key];
}

function aggregate(records) {
  const summary = {
    totalCount: records.length,
    overall: {},
    byCourse: {},
    byCourseTier: {},
    byCourseSeason: {},
    byTier: {},
    bySeason: {},
    daily: {},
    monthly: {},
    dailyCourse: {},
    monthlyCourse: {},
    rankings: {}
  };

  if (records.length === 0) return summary;

  const ranks  = records.map(r => r.rank);
  const scores = records.map(r => r.score);

  summary.overall = {
    avgRank: avg(ranks),
    avgScore: avg(scores)
  };

  for (const r of records) {
    const course = r.course;
    const tier   = r.tier;
    const season = r.season;
    const date   = new Date(r.timestamp);
    const day    = date.toISOString().slice(0, 10);
    const month  = date.toISOString().slice(0, 7);

    // --- byCourse ---
    const c = ensure(summary.byCourse, course, { count: 0, ranks: [], scores: [] });
    c.count++;
    c.ranks.push(r.rank);
    c.scores.push(r.score);

    // --- byCourseTier ---
    const ct = ensure(summary.byCourseTier, course, {});
    const ctTier = ensure(ct, tier, { count: 0, ranks: [] });
    ctTier.count++;
    ctTier.ranks.push(r.rank);

    // --- byCourseSeason ---
    const cs = ensure(summary.byCourseSeason, course, {});
    const csSeason = ensure(cs, season, { count: 0, scores: [] });
    csSeason.count++;
    csSeason.scores.push(r.score);

    // --- byTier ---
    const t = ensure(summary.byTier, tier, { count: 0, ranks: [] });
    t.count++;
    t.ranks.push(r.rank);

    // --- bySeason ---
    const s = ensure(summary.bySeason, season, { count: 0, scores: [] });
    s.count++;
    s.scores.push(r.score);

    // --- daily ---
    const d = ensure(summary.daily, day, { count: 0 });
    d.count++;

    // --- monthly ---
    const m = ensure(summary.monthly, month, { count: 0 });
    m.count++;

    // --- dailyCourse（★新規追加） ---
    const dc = ensure(summary.dailyCourse, day, {});
    const dcCourse = ensure(dc, course, { count: 0, ranks: [] });
    dcCourse.count++;
    dcCourse.ranks.push(r.rank);

    // --- monthlyCourse（★新規追加） ---
    const mc = ensure(summary.monthlyCourse, month, {});
    const mcCourse = ensure(mc, course, { count: 0, ranks: [] });
    mcCourse.count++;
    mcCourse.ranks.push(r.rank);
  }

  // 平均値を計算して整形
  for (const c of Object.values(summary.byCourse)) {
    c.avgRank  = avg(c.ranks);
    c.avgScore = avg(c.scores);
    delete c.ranks;
    delete c.scores;
  }

  for (const course of Object.keys(summary.byCourseTier)) {
    for (const tier of Object.keys(summary.byCourseTier[course])) {
      const ct = summary.byCourseTier[course][tier];
      ct.avgRank = avg(ct.ranks);
      delete ct.ranks;
    }
  }

  for (const course of Object.keys(summary.byCourseSeason)) {
    for (const season of Object.keys(summary.byCourseSeason[course])) {
      const cs = summary.byCourseSeason[course][season];
      cs.avgScore = avg(cs.scores);
      delete cs.scores;
    }
  }

  for (const t of Object.values(summary.byTier)) {
    t.avgRank = avg(t.ranks);
    delete t.ranks;
  }

  for (const s of Object.values(summary.bySeason)) {
    s.avgScore = avg(s.scores);
    delete s.scores;
  }

  // --- dailyCourse 平均値 ---
  for (const day of Object.keys(summary.dailyCourse)) {
    for (const course of Object.keys(summary.dailyCourse[day])) {
      const dc = summary.dailyCourse[day][course];
      dc.avgRank = avg(dc.ranks);
      delete dc.ranks;
    }
  }

  // --- monthlyCourse 平均値 ---
  for (const month of Object.keys(summary.monthlyCourse)) {
    for (const course of Object.keys(summary.monthlyCourse[month])) {
      const mc = summary.monthlyCourse[month][course];
      mc.avgRank = avg(mc.ranks);
      delete mc.ranks;
    }
  }

  // --- ランキング生成 ---
  summary.rankings.mostPlayedCourses =
    Object.entries(summary.byCourse)
      .sort((a,b)=>b[1].count - a[1].count)
      .slice(0, 20)
      .map(([course, data]) => ({ course, count: data.count }));

  return summary;
}

const all = readAllUserData();
const summary = aggregate(all);

fs.writeFileSync(
  path.join(__dirname, "..", "public", "summary.json"),
  JSON.stringify(summary, null, 2)
);

console.log("summary.json updated:", summary.totalCount, "records");
