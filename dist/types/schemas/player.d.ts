import { z } from 'zod';
export declare const KalturaPlayerApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        region: z.ZodOptional<z.ZodString>;
        uiconfId: z.ZodNumber;
        entryId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        playlistId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        autoplay: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        muted: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        startTime: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        clipTo: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        aspectRatio: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        entryName: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        entryDescription: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
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
        partnerId: number;
        uiconfId: number;
        region?: string | undefined;
        entryId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        playlistId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        aspectRatio?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        autoplay?: boolean | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        startTime?: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        muted?: boolean | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        clipTo?: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        entryName?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        entryDescription?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
    }, {
        partnerId: number;
        uiconfId: number;
        region?: string | undefined;
        entryId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        playlistId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        aspectRatio?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        autoplay?: boolean | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        startTime?: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        muted?: boolean | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        clipTo?: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        entryName?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        entryDescription?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
    }>;
};
//# sourceMappingURL=player.d.ts.map