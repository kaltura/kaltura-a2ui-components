import { z } from 'zod';
export declare const KalturaRecorderApi: {
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
        uiconfId: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        partnerId: number;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        uiconfId?: number | undefined;
    }, {
        partnerId: number;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        uiconfId?: number | undefined;
    }>;
};
//# sourceMappingURL=recorder.d.ts.map