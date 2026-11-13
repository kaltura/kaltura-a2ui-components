import { z } from 'zod';
/** Dashboard views `reportType` can name. Each one is `/analytics/<name>` in the Analytics app. */
export declare const ANALYTICS_REPORT_TYPES: readonly ["engagement", "content-interactions", "technology", "geo-location", "contributors", "overview", "publisher", "enduser", "live"];
export type AnalyticsReportType = (typeof ANALYTICS_REPORT_TYPES)[number];
export declare const KalturaAnalyticsApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        region: z.ZodOptional<z.ZodString>;
        entryId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
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
        categoryId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
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
        playlistId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
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
        virtualEventId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
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
        reportType: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
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
        fromDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
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
        toDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodObject<{
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
        entryId?: any;
        categoryId?: any;
        playlistId?: any;
        virtualEventId?: any;
        reportType?: any;
        fromDate?: any;
        toDate?: any;
        action?: {
            event: {
                name: string;
                context?: Record<string, any> | undefined;
                userMessage?: any;
            };
        } | {
            functionCall?: any;
        } | undefined;
    }, {
        partnerId: number;
        region?: string | undefined;
        entryId?: any;
        categoryId?: any;
        playlistId?: any;
        virtualEventId?: any;
        reportType?: any;
        fromDate?: any;
        toDate?: any;
        action?: {
            event: {
                name: string;
                context?: Record<string, any> | undefined;
                userMessage?: any;
            };
        } | {
            functionCall?: any;
        } | undefined;
    }>;
};
//# sourceMappingURL=analytics.d.ts.map