import { afterEach, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { type AppBundle, checkAppBundle } from "@ryu/app-host/app-bundle";
import type { Root } from "react-dom/client";
import { STORAGE_KEY, STORAGE_NAMESPACE } from "./bridge.ts";
import { APP_STUDIO_PLUGIN_ID, projectListSchema } from "./project.ts";
import type { RyuBridge } from "./ryu.d.ts";

if (!GlobalRegistrator.isRegistered) {
	GlobalRegistrator.register();
}
Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { AppStudio } = await import("./App.tsx");

const mounted: { container: HTMLDivElement; root: Root }[] = [];

afterEach(async () => {
	for (const { container, root } of mounted.splice(0)) {
		await act(async () => root.unmount());
		container.remove();
	}
	Reflect.deleteProperty(window, "ryu");
});

async function tick(delay = 0): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, delay));
}

interface FakeHost {
	installed: AppBundle[];
	stored: Map<string, string>;
}

function installFakeHost(options: { failInstall?: string } = {}): FakeHost {
	const host: FakeHost = { installed: [], stored: new Map() };
	const bridge: RyuBridge = {
		storage: {
			get: async ({ key, namespace }) =>
				host.stored.get(`${namespace}:${key}`) ?? null,
			set: async ({ key, namespace, value }) => {
				host.stored.set(`${namespace}:${key}`, value);
			},
		},
		apps: {
			installBundle: async (bundle) => {
				// The real host validates against the caller's id before Core sees it.
				const check = checkAppBundle(APP_STUDIO_PLUGIN_ID, bundle);
				if (!check.ok) {
					throw new Error(check.error);
				}
				if (options.failInstall) {
					throw new Error(options.failInstall);
				}
				host.installed.push(check.bundle);
				return {
					id: check.bundle.id,
					installed: true,
					updated: check.bundle.update === true,
					version: check.bundle.version,
				};
			},
		},
	};
	Reflect.set(window, "ryu", bridge);
	return host;
}

async function mount(): Promise<HTMLDivElement> {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	mounted.push({ container, root });
	await act(async () => {
		root.render(<AppStudio />);
		await tick();
	});
	return container;
}

function button(label: string): HTMLButtonElement {
	const match = [...document.querySelectorAll("button")].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	if (!match) {
		throw new Error(`No button labelled ${label}`);
	}
	return match;
}

async function click(target: HTMLElement): Promise<void> {
	await act(async () => {
		target.click();
		await tick();
	});
}

async function type(selector: string, value: string): Promise<void> {
	const input = document.querySelector<HTMLInputElement>(selector);
	if (!input) {
		throw new Error(`No input ${selector}`);
	}
	await act(async () => {
		const setter = Object.getOwnPropertyDescriptor(
			Object.getPrototypeOf(input),
			"value"
		)?.set;
		setter?.call(input, value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		await tick();
	});
}

function storedProjects(host: FakeHost) {
	const value = host.stored.get(`${STORAGE_NAMESPACE}:${STORAGE_KEY}`);
	return projectListSchema.parse(JSON.parse(value ?? "[]"));
}

async function createApp(name: string): Promise<void> {
	await click(button("New app"));
	await type("#new-app-name", name);
	await click(button("Create app"));
}

test("creates an app, opens the visual editor, installs, then updates it", async () => {
	const host = installFakeHost();
	const container = await mount();
	expect(container.textContent).toContain("Build your first app");

	await createApp("Habit Tracker");
	expect(container.textContent).toContain("Habit Tracker");
	expect(container.querySelector('[aria-label="App sections"]')).not.toBeNull();
	expect(storedProjects(host)).toHaveLength(1);

	await click(button("Install app"));
	expect(host.installed).toHaveLength(1);
	expect(host.installed[0]?.id).toBe("com.local.app-studio.habit-tracker");
	expect(host.installed[0]?.update).toBeUndefined();
	expect(container.textContent).toContain("Habit Tracker is installed.");
	expect(storedProjects(host)[0]?.installedVersion).toBe("1.0.0");

	await click(button("Update to 1.0.1"));
	expect(host.installed).toHaveLength(2);
	expect(host.installed[1]?.update).toBe(true);
	expect(host.installed[1]?.version).toBe("1.0.1");
	expect(storedProjects(host)[0]?.installedVersion).toBe("1.0.1");
});

test("refuses a reserved or duplicate name before creating", async () => {
	installFakeHost();
	await mount();
	await click(button("New app"));
	await type("#new-app-name", "Ryu Tools");
	expect(document.body.textContent).toContain("cannot contain");
	expect(button("Create app").disabled).toBe(true);
});

test("reports a failed install and keeps the draft uninstalled", async () => {
	const host = installFakeHost({ failInstall: "App install was denied" });
	const container = await mount();
	await createApp("Reading List");
	await click(button("Install app"));
	expect(container.querySelector('[role="alert"]')?.textContent).toContain(
		"App install was denied"
	);
	expect(storedProjects(host)[0]?.installedVersion).toBeNull();
	expect(button("Install app")).toBeDefined();
});

test("keeps the dialog open and the list empty when a draft cannot be saved", async () => {
	const host = installFakeHost();
	const storage = window.ryu?.storage;
	if (storage) {
		storage.set = async () => {
			throw new Error("Storage is full");
		};
	}
	const container = await mount();
	await createApp("Habit Tracker");
	expect(container.querySelector('[role="alert"]')?.textContent).toContain(
		"Storage is full"
	);
	expect(document.querySelector("#new-app-name")).not.toBeNull();
	expect(container.textContent).toContain("Build your first app");
	expect(host.stored.size).toBe(0);
});

test("edits grants from the details panel", async () => {
	const host = installFakeHost();
	await mount();
	await createApp("Notes Box");
	await click(button("Details"));
	const grant = document.querySelector<HTMLElement>("#grant-hook-side-model");
	if (!grant) {
		throw new Error("No model grant checkbox");
	}
	await click(grant);
	expect(storedProjects(host)[0]?.grants).toContain("hook:side-model");
	await click(button("Install app"));
	expect(host.installed[0]?.permission_grants).toContain("hook:side-model");
});
