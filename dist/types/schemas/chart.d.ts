import { z } from 'zod';
export declare const KalturaChartApi: {
    name: string;
    schema: z.ZodObject<{
        chartType: z.ZodEnum<["line", "bar", "area", "pie", "scatter", "geo", "wordcloud", "treemap", "heatmap", "radar", "sankey", "funnel"]>;
        data: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">;
        sourceData: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>, "many">>;
        title: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodObject<{
            call: z.ZodString;
            args: z.ZodRecord<z.ZodString, z.ZodAny>;
            returnType: z.ZodDefault<z.ZodEnum<["string", "number", "boolean", "array", "object", "any", "void"]>>;
        }, "strip", z.ZodTypeAny, {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        }, {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        }>]>>;
        xKey: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodObject<{
            call: z.ZodString;
            args: z.ZodRecord<z.ZodString, z.ZodAny>;
            returnType: z.ZodDefault<z.ZodEnum<["string", "number", "boolean", "array", "object", "any", "void"]>>;
        }, "strip", z.ZodTypeAny, {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        }, {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        }>]>>;
        yKeys: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        yLabels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        xLabel: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodObject<{
            call: z.ZodString;
            args: z.ZodRecord<z.ZodString, z.ZodAny>;
            returnType: z.ZodDefault<z.ZodEnum<["string", "number", "boolean", "array", "object", "any", "void"]>>;
        }, "strip", z.ZodTypeAny, {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        }, {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        }>]>>;
        yLabel: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
            path: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodObject<{
            call: z.ZodString;
            args: z.ZodRecord<z.ZodString, z.ZodAny>;
            returnType: z.ZodDefault<z.ZodEnum<["string", "number", "boolean", "array", "object", "any", "void"]>>;
        }, "strip", z.ZodTypeAny, {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        }, {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        }>]>>;
        colors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        height: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            path: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
        }, {
            path: string;
        }>, z.ZodObject<{
            call: z.ZodString;
            args: z.ZodRecord<z.ZodString, z.ZodAny>;
            returnType: z.ZodDefault<z.ZodEnum<["string", "number", "boolean", "array", "object", "any", "void"]>>;
        }, "strip", z.ZodTypeAny, {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        }, {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        }>]>>;
        annotations: z.ZodOptional<z.ZodArray<z.ZodObject<{
            x: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            x: string;
            color?: string | undefined;
        }, {
            label: string;
            x: string;
            color?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        data: Record<string, any>[];
        chartType: "area" | "line" | "bar" | "pie" | "scatter" | "geo" | "wordcloud" | "treemap" | "heatmap" | "radar" | "sankey" | "funnel";
        height?: number | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        title?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        sourceData?: Record<string, any>[] | undefined;
        xKey?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        yKeys?: string[] | undefined;
        yLabels?: string[] | undefined;
        xLabel?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        yLabel?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        colors?: string[] | undefined;
        annotations?: {
            label: string;
            x: string;
            color?: string | undefined;
        }[] | undefined;
    }, {
        data: Record<string, any>[];
        chartType: "area" | "line" | "bar" | "pie" | "scatter" | "geo" | "wordcloud" | "treemap" | "heatmap" | "radar" | "sankey" | "funnel";
        height?: number | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        title?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        sourceData?: Record<string, any>[] | undefined;
        xKey?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        yKeys?: string[] | undefined;
        yLabels?: string[] | undefined;
        xLabel?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        yLabel?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        colors?: string[] | undefined;
        annotations?: {
            label: string;
            x: string;
            color?: string | undefined;
        }[] | undefined;
    }>;
};
//# sourceMappingURL=chart.d.ts.map