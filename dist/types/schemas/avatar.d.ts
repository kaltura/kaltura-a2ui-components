import { z } from 'zod';
export declare const KalturaAvatarApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        region: z.ZodOptional<z.ZodString>;
        serverUrl: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
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
        autoConnect: z.ZodOptional<z.ZodBoolean>;
        openingPhrase: z.ZodOptional<z.ZodString>;
        captions: z.ZodOptional<z.ZodBoolean>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark", "studio"]>>;
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
        partnerId: number;
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
        serverUrl?: any;
        autoConnect?: boolean | undefined;
        openingPhrase?: string | undefined;
        captions?: boolean | undefined;
        theme?: "dark" | "light" | "studio" | undefined;
    }, {
        partnerId: number;
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
        serverUrl?: any;
        autoConnect?: boolean | undefined;
        openingPhrase?: string | undefined;
        captions?: boolean | undefined;
        theme?: "dark" | "light" | "studio" | undefined;
    }>;
};
//# sourceMappingURL=avatar.d.ts.map