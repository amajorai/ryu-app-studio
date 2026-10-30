/**
 * The live preview document. It runs the app's own scripts in an
 * `allow-scripts` (opaque-origin) iframe behind a CSP that blocks every network
 * load, so a draft can be tried without touching Ryu. The Ryu bridge is absent
 * here; installed apps get it from the Companion host with their approved grants.
 */
export const PREVIEW_SANDBOX = "allow-scripts allow-forms";

const PREVIEW_POLICY =
	"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

export function previewDocument(html: string): string {
	return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${PREVIEW_POLICY}">${html.replace(/^\s*<!doctype html>/i, "")}`;
}
