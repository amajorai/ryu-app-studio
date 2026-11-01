import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Textarea,
} from "@ryu/blocks/companion/controls";
import { RadioGroup, RadioGroupItem } from "@ryu/ui/components/radio-group.tsx";
import { useEffect, useState } from "react";
import { type AppProject, nameProblem } from "./project.ts";
import { STARTERS, type StarterId } from "./starters.ts";

export function CreateAppDialog({
	busy,
	error,
	onCreate,
	onOpenChange,
	open,
	projects,
}: {
	busy: boolean;
	error: string;
	onCreate: (input: {
		description: string;
		name: string;
		starter: StarterId;
	}) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	projects: readonly AppProject[];
}) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [starter, setStarter] = useState<StarterId>("checklist");
	const problem = name.trim() ? nameProblem(name, projects) : null;
	useEffect(() => {
		if (open) {
			setName("");
			setDescription("");
			setStarter("checklist");
		}
	}, [open]);
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<form
					className="grid gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						if (name.trim() && !problem) {
							onCreate({ name, description, starter });
						}
					}}
				>
					<DialogHeader>
						<DialogTitle>New app</DialogTitle>
						<DialogDescription>
							Start from a template, then drag and drop to make it yours.
						</DialogDescription>
					</DialogHeader>
					<Label htmlFor="new-app-name">Name</Label>
					<Input
						aria-describedby="new-app-name-help"
						aria-invalid={problem ? true : undefined}
						autoFocus
						id="new-app-name"
						maxLength={60}
						onChange={(event) => setName(event.target.value)}
						placeholder="Habit tracker"
						value={name}
					/>
					<p className="text-muted-foreground text-xs" id="new-app-name-help">
						{problem ?? "Names can't contain “Ryu” or “System”."}
					</p>
					<Label htmlFor="new-app-description">Description</Label>
					<Textarea
						id="new-app-description"
						maxLength={500}
						onChange={(event) => setDescription(event.target.value)}
						placeholder="What should the app help with?"
						value={description}
					/>
					<Label id="new-app-template">Template</Label>
					<RadioGroup
						aria-labelledby="new-app-template"
						onValueChange={(value) => {
							const selected = STARTERS.find((item) => item.id === value);
							if (selected) {
								setStarter(selected.id);
							}
						}}
						value={starter}
					>
						{STARTERS.map((item) => (
							<label
								className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
								key={item.id}
							>
								<RadioGroupItem className="mt-0.5" value={item.id} />
								<span>
									<span className="block font-medium">{item.label}</span>
									<span className="block text-muted-foreground">
										{item.description}
									</span>
								</span>
							</label>
						))}
					</RadioGroup>
					{error ? (
						<p className="text-destructive text-sm" role="alert">
							{error}
						</p>
					) : null}
					<DialogFooter>
						<Button
							onClick={() => onOpenChange(false)}
							type="button"
							variant="ghost"
						>
							Cancel
						</Button>
						<Button
							disabled={busy || !name.trim() || Boolean(problem)}
							type="submit"
						>
							Create app
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
