import {Window} from "happy-dom";

const window = new Window();
globalThis.document = window.document as any;
globalThis.window = window as any;
globalThis.navigator = window.navigator as any;
globalThis.HTMLElement = window.HTMLElement as any;
globalThis.Element = window.Element as any;
globalThis.Node = window.Node as any;

// happy-dom does not implement ResizeObserver, which several components use.
if (!globalThis.ResizeObserver) {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as any;
}

