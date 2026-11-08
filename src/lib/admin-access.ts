import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAdminRole(...allowedRoles: string[]) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!allowedRoles.includes(session.user.role)) {
    redirect(session.user.role === "EDITOR" ? "/admin/blog" : "/admin");
  }

  return session;
}
