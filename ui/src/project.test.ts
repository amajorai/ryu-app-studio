import { describe, expect, it } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { checkAppBundle } from "@ryu/app-host/app-bundle";
import { editHtml, outline, prepareHtml } from "@ryu/blocks/visual-editor/core";
import { formatMessage, type LiteralMessage } from "@ryu/i18n";
import {
	APP_STUDIO_PLUGIN_ID,
	type AppProject,
	buildAppBundle,
	nameProblem,
	newProject,
	nextPatch,
	projectListSchema,
	releaseVersion,
	slugify,
} from "./project.ts";
import { STARTERS, starterHtml } from "./starters.ts";

const tl: LiteralMessage = (source, values) =>
	formatMessage(source, values ?? {});

if (!GlobalRegistrator.isRegistered) {
	GlobalRegistrator.register();
}
const parser = new DOMParser();

function project(overrides: Partial<AppProject> = {}): AppProject {
	return {
		...newProject({
			id: "p1",
			name: "Habit Tracker",
			description: "Track habits",
			html: starterHtml("checklist", "Habit Tracker", "Track habits"),
			now: "2026-10-13T00:00:00.000Z",
		}),
		...overrides,
	};
}

describe("slugify", () => {
	it("makes an id-safe slug", () => {
		expect(slugify("Habit Tracker!")).toBe("habit-tracker");
		expect(slugify("  Café   Orders 2 ")).toBe("cafe-orders-2");
		expect(slugify("42 things")).toBe("things");
		expect(slugify("!!!")).toBe("");
	});
});

describe("nameProblem", () => {
	it("refuses empty, reserved and duplicate names", () => {
		const existing = [project()];
		expect(nameProblem(" ", existing)).not.toBeNull();
		expect(nameProblem("Ryu Helper", existing)).not.toBeNull();
		expect(nameProblem("123", existing)).not.toBeNull();
		expect(nameProblem("habit tracker", existing)).not.toBeNull();
		expect(nameProblem("habit tracker", existing, "p1")).toBeNull();
		expect(nameProblem("Reading list", existing)).toBeNull();
	});
});

describe("versions", () => {
	it("bumps the patch above the installed version", () => {
		expect(nextPatch("1.0.9")).toBe("1.0.10");
		expect(releaseVersion(project())).toBe("1.0.0");
		expect(releaseVersion(project({ installedVersion: "1.0.3" }))).toBe(
			"1.0.4"
		);
	});
});

describe("buildAppBundle", () => {
	it("produces a first install the host accepts", () => {
		const bundle = buildAppBundle(project());
		expect(bundle.id).toBe("com.local.app-studio.habit-tracker");
		expect(bundle.runnables[0]?.id).toBe("app-studio-habit-tracker");
		expect(bundle.update).toBeUndefined();
		expect(checkAppBundle(APP_STUDIO_PLUGIN_ID, bundle).ok).toBe(true);
	});

	it("produces an update after an install", () => {
		const bundle = buildAppBundle(project({ installedVersion: "1.0.0" }));
		expect(bundle.update).toBe(true);
		expect(bundle.version).toBe("1.0.1");
		expect(checkAppBundle(APP_STUDIO_PLUGIN_ID, bundle).ok).toBe(true);
	});

	it("keeps only the grants the project asks for", () => {
		const bundle = buildAppBundle(project({ grants: [] }));
		expect(bundle.permission_grants).toEqual([]);
		expect(checkAppBundle(APP_STUDIO_PLUGIN_ID, bundle).ok).toBe(true);
	});
});

describe("starters", () => {
	for (const starter of STARTERS) {
		it(`${starter.id} is an editable, installable document`, () => {
			const html = starterHtml(starter.id, "My <App>", "Says & does");
			expect(html).toStartWith("<!doctype html>");
			expect(html).toContain("My &lt;App&gt;");
			const prepared = prepareHtml(html, parser);
			const document = parser.parseFromString(prepared, "text/html");
			expect(outline(document).length).toBeGreaterThan(1);
			const edited = editHtml(
				prepared,
				[
					{
						kind: "insertHtml",
						parentId: "root",
						index: 0,
						html: "<p>Added</p>",
					},
				],
				parser,
				tl
			);
			expect(edited.ok).toBe(true);
			const bundle = buildAppBundle(project({ html }));
			expect(checkAppBundle(APP_STUDIO_PLUGIN_ID, bundle).ok).toBe(true);
		});
	}
});

describe("projectListSchema", () => {
	it("round-trips saved projects and rejects foreign data", () => {
		const saved = JSON.parse(JSON.stringify([project()]));
		expect(projectListSchema.parse(saved)).toEqual([project()]);
		expect(projectListSchema.safeParse([{ id: "x" }]).success).toBe(false);
	});
});
