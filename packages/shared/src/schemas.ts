import { z } from "zod";
import { ORDER_STATUSES } from "./orders";
import { isCep, isCpfOrCnpj, normalizeCep, normalizeCpfCnpj } from "./payer";
import { normalizePhone } from "./phone";
import { isReservedSlug, normalizeSlug, SLUG_MAX, SLUG_MIN, SLUG_REGEX } from "./slug";
import {
  PAYMENT_METHODS,
  PLAN_ID_MAX,
  PLAN_ID_MIN,
  PLAN_ID_REGEX,
  PLAN_KINDS,
} from "./plans";
import { TABLE_LABEL_MAX } from "./tables";
import { PRINT_GROUP_MAX, PRINT_GROUP_NAME_MAX } from "./print-groups";

export const slugSchema = z
  .string()
  .transform(normalizeSlug)
  .refine((s) => s.length >= SLUG_MIN && s.length <= SLUG_MAX, {
    message: `Slug deve ter entre ${SLUG_MIN} e ${SLUG_MAX} caracteres.`,
  })
  .refine((s) => SLUG_REGEX.test(s), {
    message: "Use só letras minúsculas, números e hífen (ex. seu-estabelecimento).",
  })
  .refine((s) => !isReservedSlug(s), {
    message: "Este caminho é reservado. Altere o nome do estabelecimento.",
  });

/** Nome + CPF no cadastro. Telefone, e-mail, CEP e número entram depois em Configurações → Responsável. */
export const registerRepresentativeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe o nome do responsável (3 a 80 caracteres).")
    .max(80),
  cpfCnpj: z
    .string()
    .transform(normalizeCpfCnpj)
    .refine((d) => d.length === 11, { message: "Informe um CPF válido." }),
});

export const passwordWithConfirmationSchema = z
  .object({
    password: z.string().min(8, "Senha: mínimo 8 caracteres."),
    passwordConfirmation: z.string().min(1, "Confirme a senha."),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export const emailCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Informe o código de 6 dígitos.");

export const registerSchema = z
  .object({
    email: z.string().trim().email("E-mail inválido.").transform((e) => e.toLowerCase()),
    venueName: z.string().trim().min(2, "Nome do estabelecimento: mínimo 2 caracteres.").max(80),
    slug: slugSchema,
    plan: z
      .string()
      .trim()
      .min(PLAN_ID_MIN, "Escolha um plano.")
      .max(PLAN_ID_MAX)
      .regex(PLAN_ID_REGEX, "Plano inválido."),
    representative: registerRepresentativeSchema,
  })
  .and(passwordWithConfirmationSchema);

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("E-mail inválido.").transform((e) => e.toLowerCase()),
  code: emailCodeSchema,
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email("E-mail inválido.").transform((e) => e.toLowerCase()),
});

export const forgotPasswordSchema = resendVerificationSchema;

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("E-mail inválido.").transform((e) => e.toLowerCase()),
    code: emailCodeSchema,
  })
  .and(passwordWithConfirmationSchema);

export const acceptStaffInviteSchema = passwordWithConfirmationSchema;

export const payerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe o nome do pagador (3 a 80 caracteres).")
    .max(80),
  cpfCnpj: z
    .string()
    .transform(normalizeCpfCnpj)
    .refine(isCpfOrCnpj, { message: "Informe um CPF ou CNPJ válido." }),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .trim()
      .email("Informe um e-mail de cobrança válido.")
      .transform((e) => e.toLowerCase())
      .optional(),
  ),
  phone: z.preprocess((v) => {
    if (typeof v !== "string" || v.trim() === "") return undefined;
    const digits = normalizePhone(v);
    return digits === "" ? undefined : digits;
  }, z.string().min(10, "Telefone inválido.").max(13, "Telefone inválido.").optional()),
  postalCode: z.preprocess((v) => {
    if (typeof v !== "string" || v.trim() === "") return undefined;
    const digits = normalizeCep(v);
    return digits === "" ? undefined : digits;
  }, z.string().refine(isCep, { message: "Informe um CEP válido." }).optional()),
  addressNumber: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1, "Informe o número do endereço.").max(20).optional(),
  ),
});

export type CheckoutPayer = z.infer<typeof payerSchema>;

/** Responsável do estabelecimento (ADR-025) — mesmo shape camelCase do pagador, campos obrigatórios no form. */
export const representativeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe o nome do responsável (3 a 80 caracteres).")
    .max(80),
  cpfCnpj: z
    .string()
    .transform(normalizeCpfCnpj)
    .refine(isCpfOrCnpj, { message: "Informe um CPF ou CNPJ válido." }),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .transform((e) => e.toLowerCase()),
  phone: z
    .string()
    .transform((v) => normalizePhone(v))
    .refine((d) => d.length >= 10 && d.length <= 11, {
      message: "Telefone: DDD + número (10 ou 11 dígitos).",
    }),
  postalCode: z
    .string()
    .transform(normalizeCep)
    .refine(isCep, { message: "Informe um CEP válido." }),
  addressNumber: z.string().trim().min(1, "Informe o número do endereço.").max(20),
});

export type RepresentativeInput = z.infer<typeof representativeSchema>;

export const creditCardSchema = z.object({
  holderName: z
    .string()
    .trim()
    .min(3, "Informe o nome impresso no cartão.")
    .max(80),
  number: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 13 && v.length <= 19, {
      message: "Informe o número do cartão.",
    }),
  expiryMonth: z
    .string()
    .regex(/^(0[1-9]|1[0-2])$/, "Validade no formato MM/AA."),
  expiryYear: z.string().regex(/^\d{4}$/, "Validade no formato MM/AA."),
  ccv: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 3 && v.length <= 4, { message: "Informe o CVV." }),
});

export type CheckoutCreditCard = z.infer<typeof creditCardSchema>;

export const checkoutSchema = z.object({
  plan: z
    .string()
    .trim()
    .min(PLAN_ID_MIN, "Escolha um plano.")
    .max(PLAN_ID_MAX)
    .regex(PLAN_ID_REGEX, "Plano inválido."),
  method: z
    .enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Escolha cartão ou PIX." }) })
    .optional()
    .default("card"),
  payer: payerSchema.optional(),
  creditCard: creditCardSchema.optional(),
});

export const scheduleDowngradeSchema = z.object({
  plan: z
    .string()
    .trim()
    .min(PLAN_ID_MIN, "Escolha um plano.")
    .max(PLAN_ID_MAX)
    .regex(PLAN_ID_REGEX, "Plano inválido."),
});

export type ScheduleDowngradeInput = z.infer<typeof scheduleDowngradeSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido.").transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Informe a senha."),
});

export const patchVenueSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    slug: slugSchema.optional(),
    staffCanCloseTabs: z.boolean().optional(),
    requireShiftOnOpenCash: z.boolean().optional(),
    representative: representativeSchema.optional(),
    waiterCallEnabled: z.boolean().optional(),
    waiterCallTtlMinutes: z
      .number()
      .int("Validade em minutos inteiros.")
      .min(15, "Mínimo 15 minutos.")
      .max(480, "Máximo 480 minutos (8h).")
      .optional(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.slug !== undefined ||
      b.staffCanCloseTabs !== undefined ||
      b.requireShiftOnOpenCash !== undefined ||
      b.representative !== undefined ||
      b.waiterCallEnabled !== undefined ||
      b.waiterCallTtlMinutes !== undefined,
    {
      message: "Envie ao menos um campo para atualizar.",
    },
  );

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome da categoria.").max(60),
  sortOrder: z.number().int().min(0).optional(),
});

export const patchCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const imageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .nullable()
  .optional()
  .transform((s) => (s ? s : null))
  .refine(
    (s) => s === null || s === undefined || s.startsWith("/v1/uploads/") || /^https?:\/\//i.test(s),
    { message: "Imagem: URL http(s) ou arquivo enviado." },
  );

export const createItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional().nullable(),
  imageUrl: imageUrlSchema,
  priceCents: z.number().int().min(0).max(10_000_000),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const patchItemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(280).optional().nullable(),
  imageUrl: imageUrlSchema,
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const createOrderSchema = z
  .object({
    tabId: z.string().uuid().optional(),
    tableId: z.string().uuid().optional(),
    tableLabel: z.string().trim().min(1, "Informe a mesa ou o balcão.").max(40).optional(),
    note: z.string().trim().max(280).optional().nullable(),
    items: z
      .array(
        z.object({
          catalogItemId: z.string().uuid(),
          qty: z.number().int().min(1).max(99),
          note: z.string().trim().max(80).optional().nullable(),
        }),
      )
      .min(1, "Inclua pelo menos um item."),
  })
  .refine((b) => Boolean(b.tabId || b.tableId || b.tableLabel), {
    message: "Escolha a mesa ou a comanda.",
  });

export const patchOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const createTableSchema = z.object({
  label: z.string().trim().min(1, "Informe o nome da mesa.").max(TABLE_LABEL_MAX),
  sortOrder: z.number().int().min(0).optional(),
});

export const patchTableSchema = z
  .object({
    label: z.string().trim().min(1).max(TABLE_LABEL_MAX).optional(),
    sortOrder: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .refine((b) => b.label !== undefined || b.sortOrder !== undefined || b.active !== undefined, {
    message: "Envie label, sortOrder e/ou active.",
  });

export const memberRoleSchema = z.enum(["staff", "cashier", "panel"]);

export const categoryIdsSchema = z.array(z.string().uuid()).max(40);

export const printGroupInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do grupo.").max(PRINT_GROUP_NAME_MAX),
  categoryIds: categoryIdsSchema.min(1, "Selecione ao menos uma categoria."),
});

export const putPrintGroupsSchema = z.object({
  groups: z.array(printGroupInputSchema).max(PRINT_GROUP_MAX, "No máximo 12 grupos de impressão."),
});

function assertPanelCategories(
  role: "staff" | "cashier" | "panel" | undefined,
  categoryIds: string[] | undefined,
  ctx: z.RefinementCtx,
) {
  if (role === "panel" && (!categoryIds || categoryIds.length < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoryIds"],
      message: "Selecione ao menos uma categoria do cardápio.",
    });
  }
}

export const createStaffSchema = z
  .object({
    name: z.string().trim().min(2, "Nome: mínimo 2 caracteres.").max(80),
    email: z.string().trim().email("E-mail inválido.").transform((e) => e.toLowerCase()),
    role: memberRoleSchema.optional(),
    categoryIds: categoryIdsSchema.optional(),
    printViaGroups: z.boolean().optional(),
  })
  .superRefine((b, ctx) => assertPanelCategories(b.role, b.categoryIds, ctx));

export const patchStaffSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    active: z.boolean().optional(),
    password: z.string().min(8).optional(),
    role: memberRoleSchema.optional(),
    categoryIds: categoryIdsSchema.optional(),
    printViaGroups: z.boolean().optional(),
  })
  .superRefine((b, ctx) => {
    if (
      b.name === undefined &&
      b.active === undefined &&
      b.password === undefined &&
      b.role === undefined &&
      b.categoryIds === undefined &&
      b.printViaGroups === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Envie name, active, password, role, categoryIds e/ou printViaGroups.",
      });
    }
    assertPanelCategories(b.role, b.categoryIds, ctx);
  });

export const joinTabSchema = z.object({
  slug: slugSchema,
  pin: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "PIN: informe os 4 dígitos."),
});

export const openComandaSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((p) => p.length >= 10 && p.length <= 11, {
      message: "Telefone: DDD + número (10 ou 11 dígitos).",
    }),
});

const orderItemLineSchema = z.object({
  catalogItemId: z.string().uuid(),
  qty: z.number().int().min(1).max(99),
  note: z.string().trim().max(80).optional().nullable(),
});

export const createGuestOrderSchema = z.object({
  note: z.string().trim().max(280).optional().nullable(),
  items: z.array(orderItemLineSchema).min(1, "Inclua pelo menos um item."),
});

export const idempotencyKeySchema = z
  .string()
  .trim()
  .uuid("Idempotency-Key: informe um UUID.");

function refinePromoVsPrice(
  priceCents: number | undefined,
  promoPriceCents: number | null | undefined,
  ctx: z.RefinementCtx,
) {
  if (promoPriceCents == null || priceCents === undefined) return;
  if (promoPriceCents >= priceCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "O preço promocional deve ser menor que o preço cheio.",
      path: ["promoPriceCents"],
    });
  }
}

export const createPlanCatalogSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    kind: z.enum(PLAN_KINDS),
    priceCents: z.number().int().min(0).max(10_000_000),
    promoPriceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
    blurb: z.string().trim().min(1).max(280),
    features: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
    listed: z.boolean().optional(),
  })
  .superRefine((b, ctx) => refinePromoVsPrice(b.priceCents, b.promoPriceCents, ctx));

export const patchPlanCatalogSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    kind: z.enum(PLAN_KINDS).optional(),
    priceCents: z.number().int().min(0).max(10_000_000).optional(),
    promoPriceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
    blurb: z.string().trim().min(1).max(280).optional(),
    features: z.array(z.string().trim().min(1).max(120)).min(1).max(12).optional(),
    listed: z.boolean().optional(),
  })
  .refine(
    (b) =>
      b.name !== undefined ||
      b.kind !== undefined ||
      b.priceCents !== undefined ||
      b.promoPriceCents !== undefined ||
      b.blurb !== undefined ||
      b.features !== undefined ||
      b.listed !== undefined,
    { message: "Envie ao menos um campo do plano." },
  )
  .superRefine((b, ctx) => refinePromoVsPrice(b.priceCents, b.promoPriceCents, ctx));

export const patchPlatformSettingsSchema = z
  .object({
    trialDays: z.number().int().min(0).max(90).optional(),
    paidPeriodDays: z.number().int().min(1).max(366).optional(),
  })
  .refine((b) => b.trialDays !== undefined || b.paidPeriodDays !== undefined, {
    message: "Envie trialDays e/ou paidPeriodDays.",
  });
