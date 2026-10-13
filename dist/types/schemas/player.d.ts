import { z } from 'zod';
export declare const KalturaPlayerApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>;
        uiconfId: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>;
        entryId: z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>;
        ks: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        partnerId: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        };
        uiconfId: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        };
        entryId: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        aspectRatio?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        startTime?: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        autoplay?: boolean | import("@a2ui/web_core/v0_9").FunctionCall | {
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
        partnerId: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        };
        uiconfId: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        };
        entryId: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall;
        ks?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        aspectRatio?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        startTime?: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        autoplay?: boolean | import("@a2ui/web_core/v0_9").FunctionCall | {
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