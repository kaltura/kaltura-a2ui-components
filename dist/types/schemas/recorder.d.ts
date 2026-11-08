import { z } from 'zod';
export declare const KalturaRecorderApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        region: z.ZodOptional<z.ZodString>;
        uiconfId: z.ZodNumber;
        entryName: z.ZodOptional<z.ZodString>;
        allowVideo: z.ZodOptional<z.ZodBoolean>;
        allowAudio: z.ZodOptional<z.ZodBoolean>;
        allowScreenShare: z.ZodOptional<z.ZodBoolean>;
        maxRecordingTime: z.ZodOptional<z.ZodNumber>;
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
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        entryName?: string | undefined;
        allowVideo?: boolean | undefined;
        allowAudio?: boolean | undefined;
        allowScreenShare?: boolean | undefined;
        maxRecordingTime?: number | undefined;
    }, {
        partnerId: number;
        uiconfId: number;
        region?: string | undefined;
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        entryName?: string | undefined;
        allowVideo?: boolean | undefined;
        allowAudio?: boolean | undefined;
        allowScreenShare?: boolean | undefined;
        maxRecordingTime?: number | undefined;
    }>;
};
//# sourceMappingURL=recorder.d.ts.map