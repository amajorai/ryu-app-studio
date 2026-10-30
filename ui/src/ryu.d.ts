import type { RyuAppBridge } from "@ryu/app-host/app-bridge";
import type {
	AppBundle,
	AppBundleInstallResult,
} from "@ryu/app-host/app-bundle";
import type { ToastShowInput } from "@ryu/app-host/rpc";

export interface RyuBridge extends RyuAppBridge {
	apps?: {
		installBundle(bundle: AppBundle): Promise<AppBundleInstallResult>;
	};
	storage?: {
		get(input: { key: string; namespace?: string }): Promise<string | null>;
		set(input: {
			key: string;
			namespace?: string;
			value: string;
		}): Promise<void>;
	};
	ui?: {
		toast?: {
			show(input: ToastShowInput): Promise<string>;
		};
	};
}

declare global {
	interface Window {
		ryu?: RyuBridge;
	}
}
