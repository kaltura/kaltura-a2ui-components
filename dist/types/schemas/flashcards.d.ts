import { z } from 'zod';
export declare const KalturaFlashcardsApi: {
    name: string;
    schema: z.ZodObject<{
        title: z.ZodUnion<[z.ZodString, z.ZodObject<{
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
        summary: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
        cards: z.ZodArray<z.ZodObject<{
            title: z.ZodUnion<[z.ZodString, z.ZodObject<{
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
            subtitle: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{
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
            content: z.ZodUnion<[z.ZodString, z.ZodObject<{
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
            clips: z.ZodOptional<z.ZodArray<z.ZodObject<{
                entryId: z.ZodString;
                startTime: z.ZodNumber;
                endTime: z.ZodNumber;
                title: z.ZodOptional<z.ZodString>;
                thumbnail: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                entryId: string;
                startTime: number;
                endTime: number;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }, {
                entryId: string;
                startTime: number;
                endTime: number;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            title: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
            };
            content: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
            };
            subtitle?: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
            } | undefined;
            clips?: {
                entryId: string;
                startTime: number;
                endTime: number;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }, {
            title: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
            };
            content: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
            };
            subtitle?: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
            } | undefined;
            clips?: {
                entryId: string;
                startTime: number;
                endTime: number;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }>, "many">;
        partnerId: z.ZodOptional<z.ZodNumber>;
        uiconfId: z.ZodOptional<z.ZodNumber>;
        ks: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        };
        cards: {
            title: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
            };
            content: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
            };
            subtitle?: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
            } | undefined;
            clips?: {
                entryId: string;
                startTime: number;
                endTime: number;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        summary?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        partnerId?: number | undefined;
        uiconfId?: number | undefined;
        ks?: string | undefined;
    }, {
        title: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        };
        cards: {
            title: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
            };
            content: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
            };
            subtitle?: string | {
                path: string;
            } | {
                call: string;
                args: Record<string, any>;
                returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
            } | undefined;
            clips?: {
                entryId: string;
                startTime: number;
                endTime: number;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        summary?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        partnerId?: number | undefined;
        uiconfId?: number | undefined;
        ks?: string | undefined;
    }>;
};
//# sourceMappingURL=flashcards.d.ts.map