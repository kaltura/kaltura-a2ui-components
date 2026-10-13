import { z } from 'zod';
export declare const KalturaFlashcardsApi: {
    name: string;
    schema: z.ZodObject<{
        title: z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>;
        summary: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        cards: z.ZodArray<z.ZodObject<{
            title: z.ZodUnion<[z.ZodString, z.ZodObject<{
                path: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                path: string;
            }, {
                path: string;
            }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>;
            subtitle: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
                path: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                path: string;
            }, {
                path: string;
            }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
            content: z.ZodUnion<[z.ZodString, z.ZodObject<{
                path: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                path: string;
            }, {
                path: string;
            }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>;
            clips: z.ZodOptional<z.ZodArray<z.ZodObject<{
                entryId: z.ZodUnknown;
                startTime: z.ZodNumber;
                endTime: z.ZodNumber;
                title: z.ZodOptional<z.ZodString>;
                thumbnail: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }, {
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            title: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall;
            content: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall;
            subtitle?: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
            clips?: {
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }[] | undefined;
        }, {
            title: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall;
            content: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall;
            subtitle?: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
            clips?: {
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }[] | undefined;
        }>, "many">;
        partnerId: z.ZodOptional<z.ZodNumber>;
        uiconfId: z.ZodOptional<z.ZodNumber>;
        ks: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
    }, "strip", z.ZodTypeAny, {
        title: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall;
        cards: {
            title: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall;
            content: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall;
            subtitle?: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
            clips?: {
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        partnerId?: number | undefined;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        summary?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        uiconfId?: number | undefined;
    }, {
        title: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall;
        cards: {
            title: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall;
            content: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall;
            subtitle?: string | {
                path: string;
            } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
            clips?: {
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        partnerId?: number | undefined;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        summary?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        uiconfId?: number | undefined;
    }>;
};
//# sourceMappingURL=flashcards.d.ts.map