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
                context?: Record<string, any> | undefined;
                userMessage?: any;
            };
        } | {
            functionCall?: any;
        } | undefined;
        serverUrl?: any;
        initialView?: "videoLibrary" | "editVideo" | "projectBuilder" | undefined;
        additionalEsearchFilters?: {
            fieldName: string;
            itemType: number;
            searchTerm: string | number;
        }[] | undefined;
    }>;
};
//# sourceMappingURL=vod-avatar.d.ts.map