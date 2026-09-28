import { prisma } from "@/lib/prisma";

// Mirrors a Supabase auth user into our own Profile table, called right after
// login/signup/OAuth-callback (see src/app/auth/) rather than via a DB trigger,
// so the sync logic stays in application code we can read and change directly.
export async function ensureProfile(id: string, email: string) {
  await prisma.profile.upsert({
    where: { id },
    create: { id, email },
    update: { email },
  });
}
