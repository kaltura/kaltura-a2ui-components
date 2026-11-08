import { z } from 'zod';
/** Dashboard views `reportType` can name. Each one is `/analytics/<name>` in the Analytics app. */
export declare const ANALYTICS_REPORT_TYPES: readonly ["engagement", "content-interactions", "technology", "geo-location", "contributors", "overview", "publisher", "enduser", "live"];
export type AnalyticsReportType = (typeof ANALYTICS_REPORT_TYPES)[number];
export declare const KalturaAnalyticsApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        region: z.ZodOptional<z.ZodString>;
        entryId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        categoryId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
        virtualEventId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        reportType: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        fromDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        toDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
        region?: string | undefined;
        entryId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        categoryId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        playlistId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        virtualEventId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        reportType?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        fromDate?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        toDate?: string | {
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
    }, {
        partnerId: number;
        region?: string | undefined;
        entryId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        categoryId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        playlistId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        virtualEventId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        reportType?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        fromDate?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        toDate?: string | {
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
    }>;
};
//# sourceMappingURL=analytics.d.ts.map