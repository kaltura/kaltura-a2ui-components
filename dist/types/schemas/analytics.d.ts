import { z } from 'zod';
export declare const KalturaAnalyticsApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        ks: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        entryId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        partnerId: number;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        entryId?: string | {
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
    }, {
        partnerId: number;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        entryId?: string | {
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
    }>;
};
//# sourceMappingURL=analytics.d.ts.map