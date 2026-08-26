import { z } from "zod";

export const INTEGRATION_EVENT_STATUSES = [
  "received",
  "processed",
  "ignored",
  "failed",
] as const;

export type IntegrationEventStatus = (typeof INTEGRATION_EVENT_STATUSES)[number];

export const INTEGRATION_EVENT_LIMIT_OPTIONS = [25, 50, 100] as const;
export const INTEGRATION_EVENT_LIMIT_DEFAULT = 50;
export const INTEGRATION_EVENT_LIMIT_MAX = 100;
export const INTEGRATION_EVENT_Q_MAX = 200;

/** Integrações conhecidas na UI (filtro). A API aceita qualquer string. */
export const INTEGRATION_EVENT_INTEGRATIONS = ["asaas"] as const;

export const INTEGRATION_EVENT_KINDS = ["webhook"] as const;
export const INTEGRATION_EVENT_DIRECTIONS = ["inbound", "outbound"] as const;

export const integrationEventMetaSchema = z
  .object({
    ip: z.string().nullable().optional(),
    headers: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const integrationEventListItemSchema = z.object({
  id: z.string().min(1),
  integration: z.string().min(1),
  kind: z.string().min(1),
  direction: z.string().min(1),
  event: z.string().nullable(),
  externalId: z.string().nullable(),
  status: z.enum(INTEGRATION_EVENT_STATUSES),
  errorMessage: z.string().nullable(),
  createdAt: z.string().nullable(),
});

export const integrationEventListSchema = z.object({
  events: z.array(integrationEventListItemSchema),
});

export const integrationEventDetailSchema = integrationEventListItemSchema.extend({
  payload: z.unknown(),
  meta: integrationEventMetaSchema.nullable(),
});

export type IntegrationEventListItem = z.infer<typeof integrationEventListItemSchema>;
export type IntegrationEventList = z.infer<typeof integrationEventListSchema>;
export type IntegrationEventDetail = z.infer<typeof integrationEventDetailSchema>;
export type IntegrationEventMeta = z.infer<typeof integrationEventMetaSchema>;
