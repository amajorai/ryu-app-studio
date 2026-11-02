import { RyuAppEmpty } from "@ryu/blocks/companion/app-ui";
import { Badge, Button } from "@ryu/blocks/companion/controls";
import { useLiteralMessages } from "@ryu/i18n/react";
import { formatDateTime } from "@ryu/ui/lib/timezone.ts";
import type { AppProject } from "./project.ts";

export function ProjectList({
	onCreate,
	onOpen,
	projects,
}: {
	onCreate: () => void;
	onOpen: (id: string) => void;
	projects: readonly AppProject[];
}) {
	const tl = useLiteralMessages();
	if (projects.length === 0) {
		return (
			<RyuAppEmpty
				actions={<Button onClick={onCreate}>New app</Button>}
				description="Drag and drop blocks, or describe changes in chat, to build a Ryu app. Install it to open it like any other app."
				title="Build your first app"
			/>
		);
	}
	return (
		<div className="grid gap-4">
			<div className="flex items-end justify-between gap-3">
				<div>
					<h2 className="font-medium text-2xl">Your apps</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Design an app visually, then install it into Ryu.
					</p>
				</div>
				<Badge variant="outline">
					{tl("{length} apps", { length: projects.length })}
				</Badge>
			</div>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{projects.map((item) => (
					<section className="rounded-lg border bg-card p-5" key={item.id}>
						<Badge variant="outline">
							{item.installedVersion === null
								? "Draft"
								: tl("Installed {installedVersion}", {
										installedVersion: item.installedVersion,
									})}
						</Badge>
						<h3 className="mt-4 font-medium text-lg">{item.name}</h3>
						<p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
							{item.description || "No description yet."}
						</p>
						<p className="mt-2 text-muted-foreground text-xs">
							{tl("Edited {date}", { date: formatDateTime(item.updatedAt) })}
						</p>
						<div className="mt-5">
							<Button onClick={() => onOpen(item.id)} variant="outline">
								Open app
							</Button>
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
