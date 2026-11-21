// Fails when a page shell in app/ has any HTML problem.
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FileSystemConfigLoader, HtmlValidate } from "html-validate/node";

const pagesDir = new URL("../app/", import.meta.url);
const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader());
const files = (await readdir(pagesDir))
	.filter((name) => name.endsWith(".html"))
	.sort();

let failed = false;
for (const file of files) {
	const report = await htmlvalidate.validateFile(
		fileURLToPath(new URL(file, pagesDir)),
	);
	for (const result of report.results) {
		for (const message of result.messages) {
			failed = true;
			console.error(
				`${file}:${message.line}: ${message.message} (${message.ruleId})`,
			);
		}
	}
}
if (failed) process.exit(1);
console.log(`No HTML problems in ${files.length} pages.`);
