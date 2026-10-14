import { z } from 'zod';
export declare const KalturaContentLabApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        serverUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        uiconfId: z.ZodNumber;
        entryId: z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>;
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
        entryId: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall;
        partnerId: number;
        uiconfId: number;
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        serverUrl?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
    }, {
        entryId: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall;
        partnerId: number;
        uiconfId: number;
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        serverUrl?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
    }>;
};
//# sourceMappingURL=content-lab.d.ts.map