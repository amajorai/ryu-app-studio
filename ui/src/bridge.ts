/**
 * The App Studio side of the host bridge. Projects live in the app's own
 * storage (`storage:kv`); outside Ryu (a standalone preview) they fall back to
 * browser storage and the UI says so. A missing or failing live bridge is never
 * reported as a successful save or install.
 */
import {
	type AppBundleInstallResult,
	appBundleInstallResultSchema,
} from "@ryu/app-host/app-bundle";
import {
	type AppProject,
	buildAppBundle,
	projectListSchema,
} from "./project.ts";

export const STORAGE_NAMESPACE = "app-studio";
export const STORAGE_KEY = "projects";
const LOCAL_KEY = `${STORAGE_NAMESPACE}:${STORAGE_KEY}`;

export type StudioMode = "live" | "preview";

function parseProjects(value: string | null): AppProject[] {
	if (!value) {
		return [];
	}
	const parsed = projectListSchema.safeParse(JSON.parse(value));
	if (!parsed.success) {
		throw new Error("Saved apps could not be read.");
	}
	return parsed.data;
}

export async function loadProjects(): Promise<{
	mode: StudioMode;
	projects: AppProject[];
}> {
	const storage = window.ryu?.storage;
	if (storage) {
		const value = await storage.get({
			key: STORAGE_KEY,
			namespace: STORAGE_NAMESPACE,
		});
		return { mode: "live", projects: parseProjects(value) };
	}
	if (window.ryu) {
		throw new Error("App storage is unavailable on this host.");
	}
	try {
		return {
			mode: "preview",
			projects: parseProjects(window.localStorage.getItem(LOCAL_KEY)),
		};
	} catch {
		return { mode: "preview", projects: [] };
	}
}

export async function saveProjects(projects: AppProject[]): Promise<void> {
	const value = JSON.stringify(projectListSchema.parse(projects));
	const storage = window.ryu?.storage;
	if (storage) {
		await storage.set({
			key: STORAGE_KEY,
			namespace: STORAGE_NAMESPACE,
			value,
		});
		return;
	}
	if (window.ryu) {
		throw new Error("App storage is unavailable on this host.");
	}
	try {
		window.localStorage.setItem(LOCAL_KEY, value);
	} catch (cause) {
		throw new Error("Browser storage is unavailable.", { cause });
	}
}

export function canInstall(): boolean {
	return Boolean(window.ryu?.apps?.installBundle);
}

export async function installProject(
	project: AppProject
): Promise<AppBundleInstallResult> {
	const install = window.ryu?.apps?.installBundle;
	if (!install) {
		throw new Error("Open App Studio in Ryu to install apps.");
	}
	return appBundleInstallResultSchema.parse(
		await install(buildAppBundle(project))
	);
}

export function modelComplete():
	| ((input: { prompt: string; system: string }) => Promise<string>)
	| undefined {
	const model = window.ryu?.model;
	return model ? (input) => model.complete(input) : undefined;
}

export async function notify(
	title: string,
	variant: "info" | "success" | "error" = "info"
): Promise<void> {
	try {
		await window.ryu?.ui?.toast?.show({ title, variant });
	} catch {
		// Toasts are optional; the inline status stays authoritative.
	}
}
