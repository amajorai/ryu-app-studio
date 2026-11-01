import { Badge, Button, Label, Textarea } from "@ryu/blocks/companion/controls";
import { VisualEditor } from "@ryu/blocks/visual-editor";
import { useLiteralMessages } from "@ryu/i18n/react";
import { useState } from "react";
import { ProjectDetails } from "./App-project-details.tsx";
import type { modelComplete } from "./bridge.ts";
import { PREVIEW_SANDBOX, previewDocument } from "./preview.ts";
import { type AppProject, MAX_HTML_BYTES } from "./project.ts";

export type Panel = "design" | "preview" | "source" | "details";
const PANELS: readonly { id: Panel; label: string }[] = [
	{ id: "design", label: "Design" },
	{ id: "preview", label: "Preview" },
	{ id: "source", label: "Source" },
	{ id: "details", label: "Details" },
];

export function ProjectEditor({
	busy,
	complete,
	panel,
	project,
	projects,
	remove,
	saveState,
	setPanel,
	update,
}: {
	busy: boolean;
	complete: ReturnType<typeof modelComplete>;
	panel: Panel;
	project: AppProject;
	projects: readonly AppProject[];
	remove: () => void;
	saveState: "saved" | "saving" | "failed";
	setPanel: (panel: Panel) => void;
	update: (changes: Partial<AppProject>, debounce?: boolean) => void;
}) {
	const tl = useLiteralMessages();
	const [mobile, setMobile] = useState(false);
	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">
						{project.installedVersion === null
							? "Not installed"
							: tl("Installed {installedVersion}", {
									installedVersion: project.installedVersion,
								})}
					</Badge>
					<span className="text-muted-foreground text-xs" role="status">
						{saveState === "saving"
							? "Saving…"
							: saveState === "failed"
								? "Not saved"
								: "Saved"}
					</span>
				</div>
				<div aria-label="App sections" className="flex flex-wrap gap-1">
					{PANELS.map((item) => (
						<Button
							aria-pressed={panel === item.id}
							key={item.id}
							onClick={() => setPanel(item.id)}
							variant={panel === item.id ? "secondary" : "ghost"}
						>
							{item.label}
						</Button>
					))}
				</div>
			</div>
			{panel === "design" ? (
				<VisualEditor
					complete={complete}
					disabled={busy}
					html={project.html}
					key={project.id}
					onChange={(html) => update({ html })}
				/>
			) : null}
			{panel === "preview" ? (
				<section className="flex min-w-0 flex-col gap-2">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="text-muted-foreground text-xs">
							Sandbox preview · Ryu services such as storage work after you
							install the app
						</p>
						<Button
							aria-pressed={mobile}
							onClick={() => setMobile((value) => !value)}
							size="sm"
							variant="outline"
						>
							{mobile ? "Desktop width" : "Mobile width"}
						</Button>
					</div>
					<iframe
						className="app-studio-preview mx-auto min-h-[600px] w-full rounded-lg border bg-white"
						data-preview-width={mobile ? "mobile" : "desktop"}
						sandbox={PREVIEW_SANDBOX}
						srcDoc={previewDocument(project.html)}
						title={tl("{name} preview", { name: project.name })}
					/>
				</section>
			) : null}
			{panel === "source" ? (
				<section className="flex min-w-0 flex-col gap-2">
					<Label htmlFor="app-html">App HTML</Label>
					<Textarea
						className="min-h-[560px] font-mono text-xs"
						id="app-html"
						maxLength={MAX_HTML_BYTES}
						onChange={(event) => {
							if (/^\s*<!doctype html/i.test(event.target.value)) {
								update({ html: event.target.value });
							}
						}}
						spellCheck={false}
						value={project.html}
					/>
					<p className="text-muted-foreground text-xs">
						The app is one HTML document with inline CSS and JavaScript. It must
						start with &lt;!doctype html&gt;.
					</p>
				</section>
			) : null}
			{panel === "details" ? (
				<ProjectDetails
					busy={busy}
					key={project.id}
					project={project}
					projects={projects}
					remove={remove}
					update={update}
				/>
			) : null}
		</>
	);
}
