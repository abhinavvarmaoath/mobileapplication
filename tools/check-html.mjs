// Fails when a page has more HTML problems than its recorded baseline, so the
// count can only go down. Run with --update to record the current counts.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FileSystemConfigLoader, HtmlValidate } from "html-validate/node";

const root = new URL("../", import.meta.url);
const baselineFile = new URL("tests/baselines/html-validate.json", root);
const update = process.argv.includes("--update");

const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader());
const files = (await readdir(root))
	.filter((name) => name.endsWith(".html"))
	.sort();

/** @type {Record<string, number>} */
const counts = {};
/** @type {Record<string, Record<string, number>>} */
const rules = {};
for (const file of files) {
	const report = await htmlvalidate.validateFile(
		fileURLToPath(new URL(file, root)),
	);
	counts[file] = report.errorCount + report.warningCount;
	rules[file] = {};
	for (const result of report.results) {
		for (const message of result.messages) {
			const id = message.ruleId ?? "parse-error";
			rules[file][id] = (rules[file][id] ?? 0) + 1;
		}
	}
}

if (update) {
	await writeFile(baselineFile, `${JSON.stringify(counts, null, 2)}\n`);
	console.log(
		`Recorded ${files.length} pages in tests/baselines/html-validate.json`,
	);
	process.exit(0);
}

/** @type {Record<string, number>} */
const baseline = JSON.parse(await readFile(baselineFile, "utf8"));
let failed = false;
for (const file of files) {
	const allowed = baseline[file] ?? 0;
	const found = counts[file] ?? 0;
	if (found > allowed) {
		failed = true;
		console.error(`${file}: ${found} problems, baseline is ${allowed}`);
		console.error(`  ${JSON.stringify(rules[file])}`);
	} else if (found < allowed) {
		console.log(
			`${file}: ${found} problems, baseline is ${allowed}; lower it with --update`,
		);
	}
}
for (const file of Object.keys(baseline)) {
	if (!files.includes(file))
		console.log(`${file}: gone; remove it with --update`);
}
if (failed) process.exit(1);
console.log(`HTML problems are within the baseline for ${files.length} pages.`);
