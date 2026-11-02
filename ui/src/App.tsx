import { RyuAppMain, RyuAppToolbar } from "@ryu/blocks/companion/app-ui";
import { Button } from "@ryu/blocks/companion/controls";
import { useLiteralMessages } from "@ryu/i18n/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreateAppDialog } from "./App-create-dialog.tsx";
import { type Panel, ProjectEditor } from "./App-project-editor.tsx";
import { ProjectList } from "./App-project-list.tsx";
import {
	canInstall,
	installProject,
	loadProjects,
	modelComplete,
	notify,
	type StudioMode,
	saveProjects,
} from "./bridge.ts";
import {
	type AppProject,
	MAX_PROJECTS,
	newProject,
	releaseVersion,
} from "./project.ts";
import { type StarterId, starterHtml } from "./starters.ts";

const SAVE_DELAY_MS = 600;

const errorMessage = (cause: unknown) =>
	cause instanceof Error ? cause.message : "The operation failed";

const newId = () =>
	globalThis.crypto?.randomUUID?.() ??
	`app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function AppStudio() {
	const tl = useLiteralMessages();
	const [projects, setProjects] = useState<AppProject[]>([]);
	const [mode, setMode] = useState<StudioMode>("live");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [busy, setBusy] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [panel, setPanel] = useState<Panel>("design");
	const [createOpen, setCreateOpen] = useState(false);
	const [saveState, setSaveState] = useState<"saved" | "saving" | "failed">(
		"saved"
	);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const saveChain = useRef<Promise<void>>(Promise.resolve());
	const project = projects.find((item) => item.id === selectedId) ?? null;

	const reload = useCallback(async () => {
		setLoading(true);
		setError("");
		try {
			const loaded = await loadProjects();
			setProjects(loaded.projects);
			setMode(loaded.mode);
		} catch (cause) {
			setError(errorMessage(cause));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	useEffect(
		() => () => {
			if (saveTimer.current) {
				clearTimeout(saveTimer.current);
			}
		},
		[]
	);

	/** Persist one snapshot after any write already in flight, in order. */
	const persist = useCallback((next: AppProject[]) => {
		setSaveState("saving");
		const write = saveChain.current.then(() => saveProjects(next));
		saveChain.current = write.catch(() => undefined);
		return write.then(
			() => setSaveState("saved"),
			(cause: unknown) => {
				setSaveState("failed");
				throw cause;
			}
		);
	}, []);

	const commit = useCallback(
		(next: AppProject[], options: { debounce?: boolean } = {}) => {
			setProjects(next);
			if (saveTimer.current) {
				clearTimeout(saveTimer.current);
				saveTimer.current = null;
			}
			if (options.debounce) {
				setSaveState("saving");
				saveTimer.current = setTimeout(() => {
					saveTimer.current = null;
					persist(next).catch((cause: unknown) =>
						setError(errorMessage(cause))
					);
				}, SAVE_DELAY_MS);
				return Promise.resolve();
			}
			return persist(next);
		},
		[persist]
	);

	/** Save first, then show: a create or delete that fails to save leaves the
	 *  list unchanged instead of showing a draft that is not stored. */
	const saveThenShow = useCallback(
		async (next: AppProject[]) => {
			if (saveTimer.current) {
				clearTimeout(saveTimer.current);
				saveTimer.current = null;
			}
			await persist(next);
			setProjects(next);
		},
		[persist]
	);

	const update = (changes: Partial<AppProject>, debounce = true) => {
		if (!project) {
			return;
		}
		setNotice("");
		const next = projects.map((item) =>
			item.id === project.id
				? { ...item, ...changes, updatedAt: new Date().toISOString() }
				: item
		);
		commit(next, { debounce }).catch((cause: unknown) =>
			setError(errorMessage(cause))
		);
	};

	const run = async (work: () => Promise<void>) => {
		setBusy(true);
		setError("");
		setNotice("");
		try {
			await work();
		} catch (cause) {
			setError(errorMessage(cause));
		} finally {
			setBusy(false);
		}
	};

	const create = (input: {
		description: string;
		name: string;
		starter: StarterId;
	}) =>
		run(async () => {
			const created = newProject({
				id: newId(),
				name: input.name,
				description: input.description,
				html: starterHtml(input.starter, input.name.trim(), input.description),
				now: new Date().toISOString(),
			});
			await saveThenShow([created, ...projects]);
			setCreateOpen(false);
			setSelectedId(created.id);
			setPanel("design");
		});

	const remove = (target: AppProject) =>
		run(async () => {
			await saveThenShow(projects.filter((item) => item.id !== target.id));
			setSelectedId(null);
			setNotice(
				target.installedVersion === null
					? "Draft deleted."
					: "Draft deleted. The installed app stays until you remove it from your Ryu apps."
			);
		});

	const install = (target: AppProject) =>
		run(async () => {
			const result = await installProject(target);
			// The install already happened, so show it even if recording it fails.
			await commit(
				projects.map((item) =>
					item.id === target.id
						? {
								...item,
								installedVersion: result.version,
								version: result.version,
							}
						: item
				)
			);
			const message = result.updated
				? tl("{name} {version} is updated.", {
						name: target.name,
						version: result.version,
					})
				: tl(
						"{name} is installed. Enable it from your Ryu apps to review its permissions and open it.",
						{ name: target.name }
					);
			setNotice(message);
			await notify(message, "success");
		});

	const complete = modelComplete();
	const installAvailable = canInstall();

	return (
		<div className="flex h-full min-h-0 flex-col" data-testid="app-studio">
			<RyuAppToolbar
				actions={
					project ? (
						<>
							<Button
								onClick={() => {
									setSelectedId(null);
									setNotice("");
								}}
								variant="ghost"
							>
								All apps
							</Button>
							<Button
								disabled={busy || !installAvailable}
								onClick={() => void install(project)}
								title={
									installAvailable
										? undefined
										: "Open App Studio in Ryu to install apps"
								}
							>
								{project.installedVersion === null
									? "Install app"
									: tl("Update to {version}", {
											version: releaseVersion(project),
										})}
							</Button>
						</>
					) : (
						<Button
							disabled={busy || loading || projects.length >= MAX_PROJECTS}
							onClick={() => setCreateOpen(true)}
						>
							New app
						</Button>
					)
				}
				title={project ? project.name : "App Studio"}
			/>
			<RyuAppMain>
				{error ? (
					<div
						className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 p-3 text-sm"
						role="alert"
					>
						<span>{error}</span>
						<Button
							disabled={busy}
							onClick={() => {
								setError("");
								if (!project) {
									void reload();
								}
							}}
							variant="outline"
						>
							{project ? "Dismiss" : "Reload"}
						</Button>
					</div>
				) : null}
				{notice ? (
					<p className="text-sm text-status-success" role="status">
						{notice}
					</p>
				) : null}
				{mode === "preview" ? (
					<p className="text-muted-foreground text-xs" role="note">
						Preview mode: apps are kept in this browser and cannot be installed
						until App Studio runs inside Ryu.
					</p>
				) : null}
				{loading ? (
					<p role="status">Loading your apps…</p>
				) : project ? (
					<ProjectEditor
						busy={busy}
						complete={complete}
						panel={panel}
						project={project}
						projects={projects}
						remove={() => void remove(project)}
						saveState={saveState}
						setPanel={setPanel}
						update={update}
					/>
				) : (
					<ProjectList
						onCreate={() => setCreateOpen(true)}
						onOpen={(id) => {
							setSelectedId(id);
							setPanel("design");
							setNotice("");
						}}
						projects={projects}
					/>
				)}
			</RyuAppMain>
			<CreateAppDialog
				busy={busy}
				error={error}
				onCreate={(input) => void create(input)}
				onOpenChange={setCreateOpen}
				open={createOpen}
				projects={projects}
			/>
		</div>
	);
}
