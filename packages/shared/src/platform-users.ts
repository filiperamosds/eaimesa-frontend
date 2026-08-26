import { z } from "zod";

export const platformUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  active: z.boolean(),
  createdAt: z.string().nullable(),
});

export const platformUserListSchema = z.object({
  users: z.array(platformUserSchema),
});

export const createPlatformUserSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(190)
    .transform((e) => e.toLowerCase()),
  password: z
    .string()
    .min(8, "Senha: mínimo 8 caracteres.")
    .max(128, "Senha: máximo 128 caracteres."),
  name: z.string().trim().min(2, "Nome do operador: mínimo 2 caracteres.").max(80),
  active: z.boolean().optional().default(true),
});

export type PlatformUser = z.infer<typeof platformUserSchema>;
export type PlatformUserList = z.infer<typeof platformUserListSchema>;
export type CreatePlatformUser = z.infer<typeof createPlatformUserSchema>;
