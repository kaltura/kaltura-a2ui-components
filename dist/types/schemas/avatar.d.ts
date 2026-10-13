import { z } from 'zod';
export declare const KalturaAvatarApi: {
    name: string;
    schema: z.ZodObject<{
        partnerId: z.ZodNumber;
        serverUrl: z.ZodString;
        autoConnect: z.ZodOptional<z.ZodBoolean>;
        openingPhrase: z.ZodOptional<z.ZodString>;
        captions: z.ZodOptional<z.ZodBoolean>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark", "studio"]>>;
    }, "strip", z.ZodTypeAny, {
        partnerId: number;
        serverUrl: string;
        autoConnect?: boolean | undefined;
        openingPhrase?: string | undefined;
        captions?: boolean | undefined;
        theme?: "dark" | "light" | "studio" | undefined;
    }, {
        partnerId: number;
        serverUrl: string;
        autoConnect?: boolean | undefined;
        openingPhrase?: string | undefined;
        captions?: boolean | undefined;
        theme?: "dark" | "light" | "studio" | undefined;
    }>;
};
//# sourceMappingURL=avatar.d.ts.map