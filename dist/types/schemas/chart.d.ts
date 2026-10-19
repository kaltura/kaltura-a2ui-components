import { z } from 'zod';
export declare const KalturaChartApi: {
    name: string;
    schema: z.ZodObject<{
        chartType: z.ZodEnum<["line", "bar", "area", "pie", "scatter", "geo", "wordcloud", "treemap", "heatmap", "radar", "sankey", "funnel"]>;
        data: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">;
        sourceData: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">>;
        title: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        xKey: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        yKeys: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        yLabels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        xLabel: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        yLabel: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        colors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            path: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodType<import("@a2ui/web_core/v0_9").FunctionCall, z.ZodTypeDef, import("@a2ui/web_core/v0_9").FunctionCall>]>>;
        annotations: z.ZodOptional<z.ZodArray<z.ZodObject<{
            x: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            x: string | number;
            color?: string | undefined;
        }, {
            label: string;
            x: string | number;
            color?: string | undefined;
        }>, "many">>;
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
        data: Record<string, any>[];
        chartType: "area" | "line" | "bar" | "pie" | "scatter" | "geo" | "wordcloud" | "treemap" | "heatmap" | "radar" | "sankey" | "funnel";
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        title?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        height?: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        sourceData?: Record<string, any>[] | undefined;
        xKey?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        yKeys?: string[] | undefined;
        yLabels?: string[] | undefined;
        xLabel?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        yLabel?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        colors?: string[] | undefined;
        annotations?: {
            label: string;
            x: string | number;
            color?: string | undefined;
        }[] | undefined;
    }, {
        data: Record<string, any>[];
        chartType: "area" | "line" | "bar" | "pie" | "scatter" | "geo" | "wordcloud" | "treemap" | "heatmap" | "radar" | "sankey" | "funnel";
        action?: {
            event: {
                name: string;
                context?: Record<string, import("@a2ui/web_core/v0_9").DynamicValue> | undefined;
            };
        } | {
            functionCall: import("@a2ui/web_core/v0_9").FunctionCall;
        } | undefined;
        title?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        height?: number | import("@a2ui/web_core/v0_9").FunctionCall | {
            path: string;
        } | undefined;
        sourceData?: Record<string, any>[] | undefined;
        xKey?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        yKeys?: string[] | undefined;
        yLabels?: string[] | undefined;
        xLabel?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        yLabel?: string | {
            path: string;
        } | import("@a2ui/web_core/v0_9").FunctionCall | undefined;
        colors?: string[] | undefined;
        annotations?: {
            label: string;
            x: string | number;
            color?: string | undefined;
        }[] | undefined;
    }>;
};
//# sourceMappingURL=chart.d.ts.map