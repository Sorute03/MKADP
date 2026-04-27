const fs = require("fs");
const path = require("path");

function readAllUserData() {
  const base = path.join(__dirname, "..", "users");
  const result = [];

  const users = fs.readdirSync(base);
  for (const user of users) {
    const userDir = path.join(base, user);
    if (!fs.statSync(userDir).isDirectory()) continue;

    const files = fs.readdirSync(userDir);
    for (const f of files) {
      const full = path.join(userDir, f);
      const json = JSON.parse(fs.readFileSync(full, "utf8"));
      result.push(json);
    }
  }
  return result;
}

function aggregate(records) {
  if (records.length === 0) return { count: 0 };

  const avg = arr => arr.reduce((a,b)=>a+b,0) / arr.length;

  const ranks  = records.map(r => r.rank);
  const scores = records.map(r => r.score);

  return {
    count: records.length,
    avgRank: avg(ranks),
    avgScore: avg(scores)
  };
}

const all = readAllUserData();
const summary = aggregate(all);

fs.writeFileSync(
  path.join(__dirname, "..", "public", "summary.json"),
  JSON.stringify(summary, null, 2)
);
