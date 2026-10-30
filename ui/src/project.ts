/**
 * App Studio's project model. A project is a draft Ryu App: its details, the
 * grants it asks for, and one self-contained HTML document that becomes the
 * app's Companion UI. `buildAppBundle` turns a project into the companion-only
 * bundle the host's `apps.installBundle` bridge accepts (see
 * `@ryu/app-host/app-bundle`).
 */
import {
	APP_BUNDLE_GRANTS,
	type AppBundle,
	type AppBundleGrant,
	appBundleIdPrefix,
	callerSegment,
} from "@ryu/app-host/app-bundle";
import { z } from "zod";

export const APP_STUDIO_PLUGIN_ID = "@ryu/app-studio";
export const MAX_PROJECTS = 50;
export const MAX_HTML_BYTES = 2_000_000;

export const GRANT_DETAILS: Record<
	AppBundleGrant,
	{ description: string; label: string }
> = {
	"storage:kv": {
		label: "Save its own data",
		description: "Keep data in storage that only this app can read.",
	},
	"ui:toast": {
		label: "Show notifications",
		description: "Show short messages in Ryu.",
	},
	"hook:side-model": {
		label: "Use your model",
		description: "Send prompts to your connected Ryu model.",
	},
	"files:download": {
		label: "Download files",
		description: "Save files it creates to your computer when you ask.",
	},
};

const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const projectSchema = z
	.object({
		id: z.string().min(1).max(64),
		name: z.string().trim().min(1).max(60),
		slug: z.string().regex(SLUG).max(40),
		description: z.string().max(500),
		icon: z.string().regex(/^[a-z0-9-]{1,48}$/),
		grants: z.array(z.enum(APP_BUNDLE_GRANTS)).max(APP_BUNDLE_GRANTS.length),
		html: z.string().min(1).max(MAX_HTML_BYTES),
		version: z.string().regex(/^\d+\.\d+\.\d+$/),
		installedVersion: z
			.string()
			.regex(/^\d+\.\d+\.\d+$/)
			.nullable(),
		updatedAt: z.string(),
	})
	.strict();

export type AppProject = z.output<typeof projectSchema>;

export const projectListSchema = z.array(projectSchema).max(MAX_PROJECTS);

/** A lowercase, hyphenated slug from a display name, or `""` if none fits. */
export function slugify(name: string): string {
	const slug = name
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^[^a-z]+/, "")
		.replace(/-+$/, "")
		.slice(0, 40)
		.replace(/-+$/, "");
	return SLUG.test(slug) ? slug : "";
}

/** Why a display name cannot be used, or `null` when it can. */
export function nameProblem(
	name: string,
	projects: readonly AppProject[],
	ignoreId?: string
): string | null {
	const trimmed = name.trim();
	if (!trimmed) {
		return "Give the app a name.";
	}
	if (/ryu|system/i.test(trimmed)) {
		return "App names cannot contain “Ryu” or “System”.";
	}
	const slug = slugify(trimmed);
	if (!slug) {
		return "Start the name with a letter.";
	}
	if (
		projects.some((project) => project.id !== ignoreId && project.slug === slug)
	) {
		return "Another app already uses that name.";
	}
	return null;
}

export function appId(slug: string): string {
	return `${appBundleIdPrefix(APP_STUDIO_PLUGIN_ID) ?? ""}${slug}`;
}

export function runnableId(slug: string): string {
	return `${callerSegment(APP_STUDIO_PLUGIN_ID) ?? ""}-${slug}`;
}

/** The next patch version: `1.0.4` → `1.0.5`. */
export function nextPatch(version: string): string {
	const [major = 1, minor = 0, patch = 0] = version.split(".").map(Number);
	return `${major}.${minor}.${patch + 1}`;
}

/** The version the next install will carry: the draft version on a first
 *  install, and a patch above the installed one on every update. */
export function releaseVersion(project: AppProject): string {
	return project.installedVersion === null
		? project.version
		: nextPatch(project.installedVersion);
}

export function buildAppBundle(project: AppProject): AppBundle {
	const name = project.name.trim();
	const description = project.description.trim();
	return {
		id: appId(project.slug),
		name,
		version: releaseVersion(project),
		...(description ? { description } : {}),
		category: "Made with App Studio",
		icon: project.icon,
		engines: { ryu: ">=0.1.0" },
		permission_grants: [...project.grants],
		runnables: [
			{
				id: runnableId(project.slug),
				name,
				kind: "companion",
				config: {
					label: name,
					ui_entry: "./dist/index.html",
					ui_format: "html",
				},
			},
		],
		companion: { label: name, icon: project.icon },
		ui_code: project.html,
		...(project.installedVersion === null ? {} : { update: true }),
	};
}

export function newProject(input: {
	description: string;
	html: string;
	id: string;
	name: string;
	now: string;
}): AppProject {
	return {
		id: input.id,
		name: input.name.trim(),
		slug: slugify(input.name),
		description: input.description.trim(),
		icon: "dashboard-square-02",
		grants: ["storage:kv", "ui:toast"],
		html: input.html,
		version: "1.0.0",
		installedVersion: null,
		updatedAt: input.now,
	};
}
