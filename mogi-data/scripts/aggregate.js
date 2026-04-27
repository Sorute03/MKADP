const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "../data");
const outFile = path.join(__dirname, "../public/aggregate.json");

let all = [];

for (const file of fs.readdirSync(dataDir)) {
  if (!file.endsWith(".json")) continue;
  const json = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  all = all.concat(json);
}

fs.writeFileSync(outFile, JSON.stringify(all, null, 2));
console.log("aggregate complete:", all.length, "records");
