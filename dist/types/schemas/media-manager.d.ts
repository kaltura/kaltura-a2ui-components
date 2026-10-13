import { z } from 'zod';
export declare const KalturaMediaManagerApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        ks: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
        serverUrl: z.ZodUnion<[z.ZodString, z.ZodObject<{
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
        }>]>;
        theme: z.ZodOptional<z.ZodEnum<["dark", "light"]>>;
        mode: z.ZodOptional<z.ZodEnum<["select", "manage"]>>;
        multiSelect: z.ZodOptional<z.ZodBoolean>;
        contextId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        partnerId: number;
        serverUrl: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        };
        ks?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        mode?: "select" | "manage" | undefined;
        theme?: "dark" | "light" | undefined;
        multiSelect?: boolean | undefined;
        contextId?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
    }, {
        partnerId: number;
        serverUrl: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        };
        ks?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        mode?: "select" | "manage" | undefined;
        theme?: "dark" | "light" | undefined;
        multiSelect?: boolean | undefined;
        contextId?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
    }>;
};
//# sourceMappingURL=media-manager.d.ts.map