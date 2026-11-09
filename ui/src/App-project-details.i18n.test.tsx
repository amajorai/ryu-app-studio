import { afterEach, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { AppProject } from "./project.ts";

// Register the DOM before any UI module loads, as the interaction suite does.
// Loading the shared controls without one first breaks that suite's dialogs
// when both files run in one `bun test` process.
if (!GlobalRegistrator.isRegistered) {
	GlobalRegistrator.register();
}
const { registerLiteralCatalogLoader } = await import("@ryu/i18n/core");
const { I18nProvider } = await import("@ryu/i18n/react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { ProjectDetails } = await import("./App-project-details.tsx");
const { newProject } = await import("./project.ts");
const { starterHtml } = await import("./starters.ts");

// The name errors under the App details field were English literals returned
// by `nameProblem`, which the extractor never read and nothing translated.

const RESERVED = "App names cannot contain “Ryu” or “System”.";
const DUPLICATE = "Another app already uses that name.";

const CATALOGS: Record<string, Record<string, string>> = {
	ar: { [DUPLICATE]: "يستخدم تطبيق آخر هذا الاسم بالفعل." },
	de: { [RESERVED]: "App-Namen dürfen „Ryu“ oder „System“ nicht enthalten." },
	ja: {
		[DUPLICATE]: "その名前はすでに別のアプリで使われています。",
		[RESERVED]: "アプリ名に「Ryu」や「System」は使えません。",
	},
};

function project(id: string, name: string): AppProject {
	return newProject({
		description: "Track habits",
		html: starterHtml("checklist", name, "Track habits"),
		id,
		name,
		now: "2026-10-13T00:00:00.000Z",
	});
}

function render(locale: string, name: string): string {
	registerLiteralCatalogLoader((requested) =>
		requested.startsWith(locale) ? (CATALOGS[locale] ?? {}) : {}
	);
	const current = project("p1", name);
	return renderToStaticMarkup(
		<I18nProvider
			autoLocalizeDom={false}
			initialLocale={locale}
			initialPackId={null}
		>
			<ProjectDetails
				busy={false}
				project={current}
				projects={[current, project("p2", "Reading list")]}
				remove={() => undefined}
				update={() => undefined}
			/>
		</I18nProvider>
	);
}

afterEach(() => registerLiteralCatalogLoader(null));

describe("App Studio name errors", () => {
	test("explain the problem in English", () => {
		expect(render("en", "Ryu Helper")).toContain(RESERVED);
	});

	test("translate the reserved and duplicate name errors in Japanese", () => {
		const reserved = render("ja", "Ryu Helper");
		expect(reserved).toContain("アプリ名に「Ryu」や「System」は使えません。");
		expect(reserved).not.toContain(RESERVED);
		expect(render("ja", "Reading list")).toContain(
			"その名前はすでに別のアプリで使われています。"
		);
	});

	test("translate them in Arabic and German", () => {
		expect(render("ar", "Reading list")).toContain(
			"يستخدم تطبيق آخر هذا الاسم بالفعل."
		);
		expect(render("de", "System tools")).toContain(
			"App-Namen dürfen „Ryu“ oder „System“ nicht enthalten."
		);
	});
});
