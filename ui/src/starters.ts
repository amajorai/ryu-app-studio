/**
 * Starter documents for a new App Studio app. Each is one self-contained HTML
 * document: inline CSS and JS, no network, and data kept through the Ryu
 * app-scoped storage bridge (`window.ryu.storage`, grant `storage:kv`) when the
 * installed app runs inside Ryu. Outside Ryu (the Studio preview) the script
 * says so instead of pretending to save.
 */
export type StarterId = "blank" | "checklist" | "notes";

export interface Starter {
	description: string;
	id: StarterId;
	label: string;
}

export const STARTERS: readonly Starter[] = [
	{
		id: "blank",
		label: "Blank",
		description: "A heading and some text to build from",
	},
	{
		id: "checklist",
		label: "Checklist",
		description: "Add, tick off and remove items that persist",
	},
	{
		id: "notes",
		label: "Notes",
		description: "A single note that saves as you type",
	},
];

export function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(char) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[char] ?? char
	);
}

const STYLE =
	":root{color-scheme:light dark;font-family:system-ui,sans-serif}body{margin:0;background:light-dark(#fafafa,#171717);color:light-dark(#171717,#fafafa)}main{max-width:720px;margin:0 auto;padding:40px 24px}h1{font-size:32px;letter-spacing:-.02em;margin:0 0 8px}p{line-height:1.6;margin:0 0 16px;opacity:.85}label{display:block;font-size:14px;margin:16px 0 8px}input,textarea{box-sizing:border-box;width:100%;padding:12px;border:1px solid #8886;border-radius:8px;background:transparent;color:inherit;font:inherit}textarea{min-height:240px;resize:vertical}button{border:0;border-radius:8px;padding:10px 16px;background:#0099ff;color:#fff;font:inherit;cursor:pointer}ul{list-style:none;padding:0;margin:16px 0}li{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #8884}li span{flex:1}li button{background:transparent;color:inherit;border:1px solid #8886}:focus-visible{outline:2px solid #0099ff;outline-offset:2px}[role=status]{font-size:13px;opacity:.7}";

// Shared by the starters that persist: the Ryu storage bridge when present,
// and an honest "preview only" state otherwise.
const STORE =
	"const store={async get(key){if(!window.ryu?.storage)throw Error('Saving works after you install the app in Ryu.');const value=await window.ryu.storage.get({key});return value?JSON.parse(value):null},async set(key,value){if(!window.ryu?.storage)throw Error('Saving works after you install the app in Ryu.');await window.ryu.storage.set({key,value:JSON.stringify(value)})}};const status=document.getElementById('status');";

const CHECKLIST_SCRIPT = `${STORE}let items=[];function show(){document.getElementById('items').replaceChildren(...items.map((item,index)=>{const li=document.createElement('li');const box=document.createElement('input');box.type='checkbox';box.checked=item.done;box.style.width='auto';box.setAttribute('aria-label','Done: '+item.text);box.addEventListener('change',()=>{item.done=box.checked;save()});const text=document.createElement('span');text.textContent=item.text;const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',()=>{items.splice(index,1);show();save()});li.append(box,text,remove);return li}))}async function save(){try{await store.set('items',items);status.textContent='Saved'}catch(error){status.textContent=error.message}}document.getElementById('add').addEventListener('submit',event=>{event.preventDefault();const input=document.getElementById('item');const text=input.value.trim();if(!text)return;items.push({text,done:false});input.value='';show();save()});store.get('items').then(saved=>{if(Array.isArray(saved))items=saved;show()}).catch(error=>{show();status.textContent=error.message});`;

const NOTES_SCRIPT = `${STORE}const note=document.getElementById('note');let timer;note.addEventListener('input',()=>{clearTimeout(timer);status.textContent='Saving…';timer=setTimeout(()=>store.set('note',note.value).then(()=>{status.textContent='Saved'}).catch(error=>{status.textContent=error.message}),400)});store.get('note').then(saved=>{if(typeof saved==='string')note.value=saved}).catch(error=>{status.textContent=error.message});`;

export function starterHtml(
	starter: StarterId,
	name: string,
	description: string
): string {
	const title = escapeHtml(name);
	const intro = escapeHtml(description || "Describe what this app does.");
	const body =
		starter === "checklist"
			? `<form id="add"><label for="item">New item</label><input id="item" maxlength="200" placeholder="What needs doing?"><p><button type="submit">Add item</button></p></form><ul id="items"></ul><p id="status" role="status"></p>`
			: starter === "notes"
				? `<label for="note">Note</label><textarea id="note" placeholder="Start writing…"></textarea><p id="status" role="status"></p>`
				: "<section><h2>Start building</h2><p>Drag blocks from the palette onto the canvas, or ask chat to change the layout.</p></section>";
	const script =
		starter === "checklist"
			? `<script>${CHECKLIST_SCRIPT}</script>`
			: starter === "notes"
				? `<script>${NOTES_SCRIPT}</script>`
				: "";
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${STYLE}</style></head><body><main><h1>${title}</h1><p>${intro}</p>${body}</main>${script}</body></html>`;
}
