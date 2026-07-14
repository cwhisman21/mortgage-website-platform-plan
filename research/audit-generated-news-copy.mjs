import fs from "node:fs";

const index = JSON.parse(fs.readFileSync("mock-data/location-news-index.json", "utf8"));
const bundles = new Map();
const wordCount = (value) => (String(value || "").match(/[A-Za-z0-9%$]+/g) || []).length;
const placeholderPattern = /dummy|placeholder|prototype|wireframe|scaffold|this article connects|a useful mortgage article|the reader can understand|read this with the market/i;

function visibleStrings(article) {
  const strings = [article.dek, ...(article.keyTakeaways || [])];
  for (const section of article.sections || []) {
    strings.push(section.heading || section.title || "");
    strings.push(...(Array.isArray(section.body) ? section.body : [section.body || section.text || ""]));
  }
  for (const table of article.tables || []) {
    strings.push(table.caption || "");
    strings.push(...(table.headers || table.columns || []));
    strings.push(...(table.rows || []).flat().map(String));
  }
  strings.push(article.methodology || "", article.limitations || "", article.disclosure || "");
  return strings.filter(Boolean);
}

const counts = [];
const flagged = [];
const paragraphFrequency = new Map();

for (const item of index.articles) {
  let bundle = bundles.get(item.contentPath);
  if (!bundle) {
    bundle = JSON.parse(fs.readFileSync(item.contentPath, "utf8"));
    bundles.set(item.contentPath, bundle);
  }
  const article = bundle.articles.find(({ id }) => id === item.id);
  const strings = visibleStrings(article);
  const words = wordCount(strings.join(" "));
  const placeholderHits = strings.filter((text) => placeholderPattern.test(text));
  counts.push(words);
  if (words < 500 || placeholderHits.length) {
    flagged.push({ id: article.id, route: article.route, words, placeholderHits });
  }
  for (const section of article.sections || []) {
    const paragraphs = Array.isArray(section.body) ? section.body : [section.body || section.text || ""];
    for (const paragraph of paragraphs.filter(Boolean)) {
      paragraphFrequency.set(paragraph, (paragraphFrequency.get(paragraph) || 0) + 1);
    }
  }
}

counts.sort((a, b) => a - b);
const report = {
  collectedAt: new Date().toISOString(),
  articles: counts.length,
  bundleFiles: bundles.size,
  wordCounts: {
    minimum: counts[0],
    median: counts[Math.floor(counts.length / 2)],
    maximum: counts.at(-1),
    under500: counts.filter((count) => count < 500).length,
    from500To749: counts.filter((count) => count >= 500 && count < 750).length,
    from750To999: counts.filter((count) => count >= 750 && count < 1000).length,
    atLeast1000: counts.filter((count) => count >= 1000).length,
  },
  flagged,
  exactRepeatedParagraphs: [...paragraphFrequency]
    .filter(([, count]) => count > 1)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 25)
    .map(([text, count]) => ({ count, words: wordCount(text), sample: text.slice(0, 240) })),
};

console.log(JSON.stringify(report, null, 2));
