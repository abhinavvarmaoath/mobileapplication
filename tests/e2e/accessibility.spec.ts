import { readFileSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../support/app";
import { pages } from "../support/pages";

// Findings per page and rule, as a count of affected elements. A page may not
// get worse than its baseline. To record the current numbers after a fix:
//   UPDATE_BASELINES=1 npx playwright test accessibility
type Baseline = Record<string, Record<string, number>>;

const baselineFile = new URL("../baselines/axe.json", import.meta.url);
const record = Boolean(process.env.UPDATE_BASELINES);
const tags = [
	"wcag2a",
	"wcag2aa",
	"wcag21a",
	"wcag21aa",
	"wcag22aa",
	"best-practice",
];

function readBaseline(): Baseline {
	return JSON.parse(readFileSync(baselineFile, "utf8"));
}

for (const path of pages) {
	test(`${path} has no new accessibility problems`, async ({
		app,
	}, testInfo) => {
		await app.open(path);
		await app.idle();
		const results = await new AxeBuilder({ page: app.page })
			.withTags(tags)
			.analyze();
		const found: Record<string, number> = {};
		for (const violation of results.violations) {
			found[violation.id] = violation.nodes.length;
		}

		if (record) {
			const baseline = readBaseline();
			baseline[path] = found;
			const sorted = Object.fromEntries(
				Object.entries(baseline)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([page, rules]) => [
						page,
						Object.fromEntries(
							Object.entries(rules).sort(([a], [b]) => a.localeCompare(b)),
						),
					]),
			);
			writeFileSync(baselineFile, `${JSON.stringify(sorted, null, 2)}\n`);
			return;
		}

		const allowed = readBaseline()[path] ?? {};
		const worse = Object.entries(found).filter(
			([rule, count]) => count > (allowed[rule] ?? 0),
		);
		expect(worse, "rules that got worse").toEqual([]);
		const better = Object.entries(allowed)
			.filter(([rule, count]) => (found[rule] ?? 0) < count)
			.map(([rule]) => rule);
		if (better.length > 0) {
			testInfo.annotations.push({
				type: "baseline",
				description: `Lower the baseline for: ${better.join(", ")}`,
			});
		}
	});
}
