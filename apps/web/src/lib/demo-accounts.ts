/** The shared evaluation logins (published in the repository and submission) use this domain. They may explore
 *  everything their role allows but must not change published data: the ML service refuses pipeline runs and
 *  uploads for tokens marked demo. Override with ASCORA_DEMO_EMAIL_DOMAIN; set it to "none" to disable. */
export function isDemoAccount(email: string | null | undefined, domain = process.env.ASCORA_DEMO_EMAIL_DOMAIN ?? "ascora.test") {
  if (!email || domain === "none") return false;
  return email.trim().toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}
