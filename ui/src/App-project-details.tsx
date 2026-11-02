import { RyuAppField, RyuAppSection } from "@ryu/blocks/companion/app-ui";
import {
	Button,
	Checkbox,
	Input,
	Label,
	Textarea,
} from "@ryu/blocks/companion/controls";
import { useLiteralMessages } from "@ryu/i18n/react";
import { useState } from "react";
import {
	type AppProject,
	appId,
	GRANT_DETAILS,
	nameProblem,
	releaseVersion,
	slugify,
} from "./project.ts";

const GRANT_IDS = Object.keys(GRANT_DETAILS) as (keyof typeof GRANT_DETAILS)[];

export function ProjectDetails({
	busy,
	project,
	projects,
	remove,
	update,
}: {
	busy: boolean;
	project: AppProject;
	projects: readonly AppProject[];
	remove: () => void;
	update: (changes: Partial<AppProject>, debounce?: boolean) => void;
}) {
	const tl = useLiteralMessages();
	const [name, setName] = useState(project.name);
	const installed = project.installedVersion !== null;
	const problem = nameProblem(name, projects, project.id);
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<RyuAppSection title="App details">
				<Label htmlFor="app-name">Name</Label>
				<Input
					aria-describedby="app-name-help"
					aria-invalid={problem ? true : undefined}
					id="app-name"
					maxLength={60}
					onBlur={() => {
						if (!problem && name.trim() !== project.name) {
							update(
								installed
									? { name: name.trim() }
									: { name: name.trim(), slug: slugify(name) },
								false
							);
						}
					}}
					onChange={(event) => setName(event.target.value)}
					value={name}
				/>
				<p className="text-muted-foreground text-xs" id="app-name-help">
					{problem ??
						(installed
							? tl("App id {id} stays the same after install.", {
									id: appId(project.slug),
								})
							: tl("App id {id}", { id: appId(slugify(name)) }))}
				</p>
				<Label htmlFor="app-description">Description</Label>
				<Textarea
					id="app-description"
					maxLength={500}
					onChange={(event) => update({ description: event.target.value })}
					value={project.description}
				/>
				<p className="text-muted-foreground text-xs">
					{tl("Next install: version {version}", {
						version: releaseVersion(project),
					})}
				</p>
			</RyuAppSection>
			<RyuAppSection title="Permissions">
				<p className="text-muted-foreground text-sm">
					Choose what the app may ask for. You approve these again when you
					enable the installed app.
				</p>
				{GRANT_IDS.map((grant) => {
					const checked = project.grants.includes(grant);
					const id = `grant-${grant.replace(/[^a-z]/g, "-")}`;
					return (
						<RyuAppField
							description={GRANT_DETAILS[grant].description}
							key={grant}
							label={
								<span className="flex items-center gap-2">
									<Checkbox
										checked={checked}
										id={id}
										onCheckedChange={(value) =>
											update(
												{
													grants:
														value === true
															? [...project.grants, grant]
															: project.grants.filter((item) => item !== grant),
												},
												false
											)
										}
									/>
									<label htmlFor={id}>{GRANT_DETAILS[grant].label}</label>
								</span>
							}
						/>
					);
				})}
			</RyuAppSection>
			<RyuAppSection title="Delete draft">
				<p className="text-muted-foreground text-sm">
					Deleting removes the draft from App Studio. An installed copy stays in
					your Ryu apps until you remove it there.
				</p>
				<div>
					<Button disabled={busy} onClick={remove} variant="destructive">
						Delete draft
					</Button>
				</div>
			</RyuAppSection>
		</div>
	);
}
