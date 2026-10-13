/** Removes everything but plain formatting tags, safe links and allowed images. */
export declare function sanitizeMarkdownHtml(html: string): string;
/** renderMarkdown plus a second, stricter pass. Safe to put in innerHTML. */
export declare function renderSafeMarkdown(text: string): Promise<string>;
//# sourceMappingURL=safe-markdown.d.ts.map