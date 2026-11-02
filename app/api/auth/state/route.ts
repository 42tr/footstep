import { countAccounts } from "@/lib/platform/auth-node";
import { isNodePlatform } from "@/lib/platform/target";
import { serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isNodePlatform()) return Response.json({ node: false, hasAccounts: true });
    return Response.json({ node: true, hasAccounts: (await countAccounts()) > 0 });
  } catch (error) {
    return serverError(error);
  }
}
