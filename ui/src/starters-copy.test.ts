import { afterEach, describe, expect, test } from "bun:test";
import { formatMessage } from "@ryu/i18n/core";
import {
	type ActiveI18nRuntime,
	registerActiveI18nRuntime,
	unregisterActiveI18nRuntime,
} from "../../../../packages/i18n/src/active-locale.ts";
import { STARTERS, starterHtml } from "./starters.ts";

const ENGLISH_SEEDS = [
	"Describe what this app does.",
	"Start building",
	"Drag blocks from the palette",
	"New item",
	"What needs doing?",
	"Add item",
	">Note<",
	"Start writing…",
	"Saving works after you install the app in Ryu.",
	"'Remove'",
	"Saved",
	"Saving…",
	"Done: ",
];

/** A host whose catalog gives every message a distinct string in `locale`. */
function host(
	locale: string,
	direction: "ltr" | "rtl",
	prefix: string
): ActiveI18nRuntime {
	const seen = new Map<string, string>();
	return {
		direction,
		locale,
		translate: (_id, values, fallback = "") => {
			const placeholder = fallback.includes("{item}") ? " {item}" : "";
			const known =
				seen.get(fallback) ?? `${prefix}${seen.size + 1}${placeholder}`;
			seen.set(fallback, known);
			return formatMessage(known, values ?? {}, locale);
		},
	};
}

let active: ActiveI18nRuntime | null = null;

function use(runtime: ActiveI18nRuntime): void {
	active = runtime;
	registerActiveI18nRuntime(runtime);
}

afterEach(() => {
	if (active) {
		unregisterActiveI18nRuntime(active);
		active = null;
	}
});

describe("starter documents follow the UI language", () => {
	for (const [locale, direction, prefix] of [
		["ja", "ltr", "見本"],
		["ar", "rtl", "نموذج"],
		["de", "ltr", "Muster"],
	] as const) {
		test(`seed no English copy and declare ${locale}`, () => {
			use(host(locale, direction, prefix));
			for (const starter of STARTERS) {
				const html = starterHtml(starter.id, "App", "");
				expect(html).toContain(`<html lang="${locale}" dir="${direction}">`);
				for (const english of ENGLISH_SEEDS) {
					expect(html).not.toContain(english);
				}
			}
		});
	}

	test("the checklist script reads its runtime copy from the injected object", () => {
		use(host("ja", "ltr", "見本"));
		const html = starterHtml("checklist", "App", "");
		const declaration = html.match(/<script>const T=(\{.*?\});/)?.[1] ?? "";
		const copy = JSON.parse(declaration) as Record<string, string>;
		expect(Object.keys(copy).sort()).toEqual([
			"done",
			"preview",
			"remove",
			"saved",
			"saving",
		]);
		expect(copy.done).toContain("{item}");
		expect(html).toContain("T.done.split('{item}').join(item.text)");
	});

	test("a translation cannot close the script element or inject markup", () => {
		use({
			direction: "ltr",
			locale: "ja",
			translate: () => "</script><img src=x onerror=alert(1)>",
		});
		const html = starterHtml("checklist", "App", "");
		expect(html.match(/<\/script>/g)?.length).toBe(1);
		expect(html).not.toContain("<img");
	});

	test("an English UI keeps lang=en and the English copy", () => {
		const html = starterHtml("notes", "App", "");
		expect(html).toContain('<html lang="en" dir="ltr">');
		expect(html).toContain('placeholder="Start writing…"');
		expect(html).toContain("status.textContent=T.saving");
		expect(html).toContain('"saving":"Saving…"');
	});
});
