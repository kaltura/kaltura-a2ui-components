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
                entryId: z.ZodUnknown;
                startTime: z.ZodNumber;
                endTime: z.ZodNumber;
                title: z.ZodOptional<z.ZodString>;
                thumbnail: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }, {
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
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
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
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
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }[] | undefined;
        }>, "many">;
        partnerId: z.ZodOptional<z.ZodNumber>;
        uiconfId: z.ZodOptional<z.ZodNumber>;
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
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        partnerId?: number | undefined;
        ks?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        summary?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        } | undefined;
        uiconfId?: number | undefined;
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
                startTime: number;
                endTime: number;
                title?: string | undefined;
                entryId?: unknown;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        partnerId?: number | undefined;
        ks?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        summary?: string | {
            path: string;
        } | {
            call: string;
            args: Record<string, any>;
            returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        } | undefined;
        uiconfId?: number | undefined;
    }>;
};
//# sourceMappingURL=flashcards.d.ts.map