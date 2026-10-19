import { z } from 'zod';
export declare const KalturaVodAvatarApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        region: z.ZodOptional<z.ZodString>;
        initialView: z.ZodOptional<z.ZodEnum<["videoLibrary", "editVideo", "projectBuilder"]>>;
        additionalEsearchFilters: z.ZodOptional<z.ZodArray<z.ZodObject<{
            fieldName: z.ZodString;
            itemType: z.ZodNumber;
            searchTerm: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        }, "strip", z.ZodTypeAny, {
            fieldName: string;
            itemType: number;
            searchTerm: string | number;
        }, {
            fieldName: string;
            itemType: number;
            searchTerm: string | number;
        }>, "many">>;
        serverUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
        initialView?: "videoLibrary" | "editVideo" | "projectBuilder" | undefined;
        additionalEsearchFilters?: {
            fieldName: string;
            itemType: number;
            searchTerm: string | number;
        }[] | undefined;
    }, {
        partnerId: number;
        region?: string | undefined;
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
        initialView?: "videoLibrary" | "editVideo" | "projectBuilder" | undefined;
        additionalEsearchFilters?: {
            fieldName: string;
            itemType: number;
            searchTerm: string | number;
        }[] | undefined;
    }>;
};
//# sourceMappingURL=vod-avatar.d.ts.map