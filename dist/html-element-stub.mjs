import "@a2ui/web_core/v0_9/basic_catalog";
//#region src/adapters/react/html-element-stub.ts
var e = globalThis, t = class {
	constructor() {
		throw TypeError("HTMLElement is a server stub: custom elements render only in a browser (a2ui-project/a2ui#3158).");
	}
}, n = e.HTMLElement === void 0 ? t : void 0;
n && Object.defineProperty(globalThis, "HTMLElement", {
	value: n,
	configurable: !0,
	writable: !0
});
function r() {
	n && e.HTMLElement === n && delete e.HTMLElement;
}
//#endregion
export { r as t };

//# sourceMappingURL=html-element-stub.mjs.map