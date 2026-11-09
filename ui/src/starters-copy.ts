import { activeDirection, activeLocale, translate as tl } from "@ryu/i18n/core";

/**
 * The visible copy of a new starter document, in the language App Studio
 * shows when the app is created. It is written into the user's document once
 * and then belongs to it like typed text (it does not follow later language
 * changes).
 */
export interface StarterCopy {
	addItem: string;
	blankBody: string;
	blankHeading: string;
	describe: string;
	itemLabel: string;
	itemPlaceholder: string;
	noteLabel: string;
	notePlaceholder: string;
}

/** Strings the starter scripts set at runtime inside the user's app. */
export interface StarterScriptCopy {
	/** Accessible name of an item's checkbox; `{item}` is the item text. */
	done: string;
	preview: string;
	remove: string;
	saved: string;
	saving: string;
}

export function starterCopy(): StarterCopy {
	return {
		addItem: tl("Add item"),
		blankBody: tl(
			"Drag blocks from the palette onto the canvas, or ask chat to change the layout."
		),
		blankHeading: tl("Start building"),
		describe: tl("Describe what this app does."),
		itemLabel: tl("New item"),
		itemPlaceholder: tl("What needs doing?"),
		noteLabel: tl("Note"),
		notePlaceholder: tl("Start writing…"),
	};
}

export function starterScriptCopy(): StarterScriptCopy {
	return {
		// The placeholder survives translation so the script can fill it.
		done: tl("Done: {item}", { item: "{item}" }),
		preview: tl("Saving works after you install the app in Ryu."),
		remove: tl("Remove"),
		saved: tl("Saved"),
		saving: tl("Saving…"),
	};
}

/**
 * `const T={…};` for an inline script. `<` is escaped so a translation can
 * never close the `<script>` element.
 */
export function scriptCopyDeclaration(copy: StarterScriptCopy): string {
	return `const T=${JSON.stringify(copy).replaceAll("<", "\\u003c")};`;
}

/** The `lang` and `dir` attributes of a new starter's `<html>` element. */
export function starterDocumentAttributes(): string {
	const lang = activeLocale().replace(/[^A-Za-z0-9-]/g, "") || "en";
	return `lang="${lang}" dir="${activeDirection() === "rtl" ? "rtl" : "ltr"}"`;
}
