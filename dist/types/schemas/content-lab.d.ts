import { z } from 'zod';
export declare const KalturaContentLabApi: {
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
        serverUrl: z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>;
        entryId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
    }, "strip", z.ZodTypeAny, {
        partnerId: number;
        serverUrl: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        entryId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
    }, {
        partnerId: number;
        serverUrl: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        entryId?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
    }>;
};
//# sourceMappingURL=content-lab.d.ts.map