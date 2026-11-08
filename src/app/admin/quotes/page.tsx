import { requireAdminRole } from "@/lib/admin-access";
import QuotesPage from "./quotes-page";

export default async function QuotesRoute() {
  await requireAdminRole("ADMIN", "CONSULTANT");
  return <QuotesPage />;
}
