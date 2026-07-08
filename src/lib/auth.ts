import { prisma } from "@/lib/prisma";

// Auth-ready single-user layer.
//
// Every query in the app goes through getCurrentUser(), so swapping in real
// authentication (NextAuth/Auth.js, Clerk, Supabase Auth) later only requires
// changing this one function to resolve the session user instead of the
// default user. All data is already scoped by userId.

const DEFAULT_EMAIL = process.env.DEFAULT_USER_EMAIL ?? "owner@knowledge-map.local";

export async function getCurrentUser() {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_EMAIL },
    update: {},
    create: { email: DEFAULT_EMAIL, name: "Owner" },
  });
  return user;
}
