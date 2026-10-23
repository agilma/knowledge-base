/**
 * Who may sign in, and who becomes an admin. Pure so the rules can be tested:
 * a slip here either locks the team out or lets an outsider read the
 * knowledge base.
 */

export interface AccessConfig {
  allowedDomain?: string;
  allowedEmails?: string;
  adminEmails?: string;
}

/** Splits a comma-separated env value into trimmed, lower-cased entries. */
export function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function readAccessConfig(env: NodeJS.ProcessEnv = process.env): AccessConfig {
  return {
    allowedDomain: env.AUTH_ALLOWED_DOMAIN,
    allowedEmails: env.AUTH_ALLOWED_EMAILS,
    adminEmails: env.AUTH_ADMIN_EMAILS,
  };
}

/**
 * An email is allowed when it matches the domain exactly (so `@evil-example.com`
 * does not pass for `example.com`) or is listed explicitly. An empty domain
 * leaves the explicit list as the only way in; it never means "everyone".
 */
export function isEmailAllowed(email: string, config: AccessConfig): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const domain = config.allowedDomain?.trim().toLowerCase().replace(/^@/, "");
  if (domain && normalized.endsWith(`@${domain}`)) return true;

  return parseEmailList(config.allowedEmails).includes(normalized);
}

export function isAdminEmail(email: string, config: AccessConfig): boolean {
  return parseEmailList(config.adminEmails).includes(email.trim().toLowerCase());
}
