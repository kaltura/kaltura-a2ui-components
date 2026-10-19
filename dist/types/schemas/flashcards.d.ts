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
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }, {
                startTime: number;
                endTime: number;
                entryId?: unknown;
                title?: string | undefined;
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
                entryId?: unknown;
                title?: string | undefined;
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
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }>, "many">;
        partnerId: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodString>;
        uiconfId: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            event: z.ZodObject<{
                name: z.ZodString;
                context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("@a2ui/web_core/v0_9").DynamicValue, z.ZodTypeDef, import("@a2ui/web_core/v0_9").DynamicValue>>>;
            }, "strict", z.ZodTypeAny, {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            }, {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            }>;
        }, "strict", z.ZodTypeAny, {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        }, {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        }>, z.ZodObject<{
            functionCall: z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>;
        }, "strict", z.ZodTypeAny, {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        }, {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        }>]>>;
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
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        partnerId?: number | undefined;
        region?: string | undefined;
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        uiconfId?: number | undefined;
        summary?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
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
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        partnerId?: number | undefined;
        region?: string | undefined;
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        uiconfId?: number | undefined;
        summary?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
    }>;
};
//# sourceMappingURL=flashcards.d.ts.map