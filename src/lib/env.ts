import { z } from "zod";

/**
 * Environment variables the running app cannot work without. A missing Google
 * credential otherwise surfaces as a bare "There was a problem with the server
 * configuration" from Auth.js, with nothing pointing at the cause.
 */
const authEnvSchema = z.object({
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function parseAuthEnv(env: NodeJS.ProcessEnv): AuthEnv {
  const result = authEnvSchema.safeParse(env);
  if (result.success) return result.data;

  const missing = result.error.issues.map((issue) => issue.path.join("."));
  throw new Error(
    `Environment variable belum diisi: ${missing.join(", ")}. ` +
      "Lihat bagian Autentikasi di README.md."
  );
}
