import { z } from 'zod';
export declare const KalturaFlashcardsApi: {
    name: string;
    schema: z.ZodObject<{
        title: z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
            '@path': z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path?: string | undefined;
            '@path'?: string | undefined;
        }, {
            path?: string | undefined;
            '@path'?: string | undefined;
        }>, {
            path?: string | undefined;
            '@path'?: string | undefined;
        }, {
            path?: string | undefined;
            '@path'?: string | undefined;
        }>, z.ZodIntersection<z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodIntersection<z.ZodEffects<z.ZodObject<{
            '@call': z.ZodOptional<z.ZodString>;
            call: z.ZodOptional<z.ZodString>;
            catalogId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            call?: string | undefined;
            '@call'?: string | undefined;
            catalogId?: string | undefined;
        }, {
            call?: string | undefined;
            '@call'?: string | undefined;
            catalogId?: string | undefined;
        }>, {
            call?: string | undefined;
            '@call'?: string | undefined;
            catalogId?: string | undefined;
        }, {
            call?: string | undefined;
            '@call'?: string | undefined;
            catalogId?: string | undefined;
        }>, z.ZodAny>>]>;
        summary: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
            '@path': z.ZodOptional<z.ZodString>;
            path: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path?: string | undefined;
            '@path'?: string | undefined;
        }, {
            path?: string | undefined;
            '@path'?: string | undefined;
        }>, {
            path?: string | undefined;
            '@path'?: string | undefined;
        }, {
            path?: string | undefined;
            '@path'?: string | undefined;
        }>, z.ZodIntersection<z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodIntersection<z.ZodEffects<z.ZodObject<{
            '@call': z.ZodOptional<z.ZodString>;
            call: z.ZodOptional<z.ZodString>;
            catalogId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            call?: string | undefined;
            '@call'?: string | undefined;
            catalogId?: string | undefined;
        }, {
            call?: string | undefined;
            '@call'?: string | undefined;
            catalogId?: string | undefined;
        }>, {
            call?: string | undefined;
            '@call'?: string | undefined;
            catalogId?: string | undefined;
        }, {
            call?: string | undefined;
            '@call'?: string | undefined;
            catalogId?: string | undefined;
        }>, z.ZodAny>>]>>;
        cards: z.ZodArray<z.ZodObject<{
            title: z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
                '@path': z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }>, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }>, z.ZodIntersection<z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodIntersection<z.ZodEffects<z.ZodObject<{
                '@call': z.ZodOptional<z.ZodString>;
                call: z.ZodOptional<z.ZodString>;
                catalogId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }>, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }>, z.ZodAny>>]>;
            subtitle: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
                '@path': z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }>, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }>, z.ZodIntersection<z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodIntersection<z.ZodEffects<z.ZodObject<{
                '@call': z.ZodOptional<z.ZodString>;
                call: z.ZodOptional<z.ZodString>;
                catalogId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }>, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }>, z.ZodAny>>]>>;
            content: z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
                '@path': z.ZodOptional<z.ZodString>;
                path: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }>, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }, {
                path?: string | undefined;
                '@path'?: string | undefined;
            }>, z.ZodIntersection<z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodIntersection<z.ZodEffects<z.ZodObject<{
                '@call': z.ZodOptional<z.ZodString>;
                call: z.ZodOptional<z.ZodString>;
                catalogId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }>, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }, {
                call?: string | undefined;
                '@call'?: string | undefined;
                catalogId?: string | undefined;
            }>, z.ZodAny>>]>;
            clips: z.ZodOptional<z.ZodArray<z.ZodObject<{
                entryId: z.ZodUnknown;
                startTime: z.ZodNumber;
                endTime: z.ZodNumber;
                title: z.ZodOptional<z.ZodString>;
                thumbnail: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                startTime: number;
                endTime: number;
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }, {
                startTime: number;
                endTime: number;
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            title?: any;
            subtitle?: any;
            content?: any;
            clips?: {
                startTime: number;
                endTime: number;
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }, {
            title?: any;
            subtitle?: any;
            content?: any;
            clips?: {
                startTime: number;
                endTime: number;
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }>, "many">;
        partnerId: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodString>;
        uiconfId: z.ZodOptional<z.ZodNumber>;
        action: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            event: z.ZodObject<{
                name: z.ZodString;
                userMessage: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
                    "@path": z.ZodOptional<z.ZodString>;
                    path: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    path?: string | undefined;
                    "@path"?: string | undefined;
                }, {
                    path?: string | undefined;
                    "@path"?: string | undefined;
                }>, {
                    path?: string | undefined;
                    "@path"?: string | undefined;
                }, {
                    path?: string | undefined;
                    "@path"?: string | undefined;
                }>, z.ZodIntersection<z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodIntersection<z.ZodEffects<z.ZodObject<{
                    "@call": z.ZodOptional<z.ZodString>;
                    call: z.ZodOptional<z.ZodString>;
                    catalogId: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    call?: string | undefined;
                    "@call"?: string | undefined;
                    catalogId?: string | undefined;
                }, {
                    call?: string | undefined;
                    "@call"?: string | undefined;
                    catalogId?: string | undefined;
                }>, {
                    call?: string | undefined;
                    "@call"?: string | undefined;
                    catalogId?: string | undefined;
                }, {
                    call?: string | undefined;
                    "@call"?: string | undefined;
                    catalogId?: string | undefined;
                }>, z.ZodAny>>]>>;
                context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodAny, "many">, z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>, z.ZodEffects<z.ZodObject<{
                    "@path": z.ZodOptional<z.ZodString>;
                    path: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    path?: string | undefined;
                    "@path"?: string | undefined;
                }, {
                    path?: string | undefined;
                    "@path"?: string | undefined;
                }>, {
                    path?: string | undefined;
                    "@path"?: string | undefined;
                }, {
                    path?: string | undefined;
                    "@path"?: string | undefined;
                }>, z.ZodIntersection<z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodIntersection<z.ZodEffects<z.ZodObject<{
                    "@call": z.ZodOptional<z.ZodString>;
                    call: z.ZodOptional<z.ZodString>;
                    catalogId: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    call?: string | undefined;
                    "@call"?: string | undefined;
                    catalogId?: string | undefined;
                }, {
                    call?: string | undefined;
                    "@call"?: string | undefined;
                    catalogId?: string | undefined;
                }>, {
                    call?: string | undefined;
                    "@call"?: string | undefined;
                    catalogId?: string | undefined;
                }, {
                    call?: string | undefined;
                    "@call"?: string | undefined;
                    catalogId?: string | undefined;
                }>, z.ZodAny>>]>>>;
            }, "strict", z.ZodTypeAny, {
                name: string;
                context?: Record<string, any> | undefined;
                userMessage?: any;
            }, {
                name: string;
                context?: Record<string, any> | undefined;
                userMessage?: any;
            }>;
        }, "strict", z.ZodTypeAny, {
            event: {
                name: string;
                context?: Record<string, any> | undefined;
                userMessage?: any;
            };
        }, {
            event: {
                name: string;
                context?: Record<string, any> | undefined;
                userMessage?: any;
            };
        }>, z.ZodObject<{
            functionCall: z.ZodIntersection<z.ZodRecord<z.ZodString, z.ZodAny>, z.ZodIntersection<z.ZodEffects<z.ZodObject<{
                "@call": z.ZodOptional<z.ZodString>;
                call: z.ZodOptional<z.ZodString>;
                catalogId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                call?: string | undefined;
                "@call"?: string | undefined;
                catalogId?: string | undefined;
            }, {
                call?: string | undefined;
                "@call"?: string | undefined;
                catalogId?: string | undefined;
            }>, {
                call?: string | undefined;
                "@call"?: string | undefined;
                catalogId?: string | undefined;
            }, {
                call?: string | undefined;
                "@call"?: string | undefined;
                catalogId?: string | undefined;
            }>, z.ZodAny>>;
        }, "strict", z.ZodTypeAny, {
            functionCall?: any;
        }, {
            functionCall?: any;
        }>]>>;
    }, "strip", z.ZodTypeAny, {
        cards: {
            title?: any;
            subtitle?: any;
            content?: any;
            clips?: {
                startTime: number;
                endTime: number;
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        partnerId?: number | undefined;
        region?: string | undefined;
        action?: {
            event: {
                name: string;
                context?: Record<string, any> | undefined;
                userMessage?: any;
            };
        } | {
            functionCall?: any;
        } | undefined;
        uiconfId?: number | undefined;
        summary?: any;
        title?: any;
    }, {
        cards: {
            title?: any;
            subtitle?: any;
            content?: any;
            clips?: {
                startTime: number;
                endTime: number;
                entryId?: unknown;
                title?: string | undefined;
                thumbnail?: string | undefined;
            }[] | undefined;
        }[];
        partnerId?: number | undefined;
        region?: string | undefined;
        action?: {
            event: {
                name: string;
                context?: Record<string, any> | undefined;
                userMessage?: any;
            };
        } | {
            functionCall?: any;
        } | undefined;
        uiconfId?: number | undefined;
        summary?: any;
        title?: any;
    }>;
};
//# sourceMappingURL=flashcards.d.ts.map