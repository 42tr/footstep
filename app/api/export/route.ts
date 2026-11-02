import { getDb } from "@/db";
import { children, firsts, growth, media, moments } from "@/db/schema";
import { serverError } from "@/lib/api";
import { todayYmd } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 一键导出全站的 JSON，方便以后搬家或做备份。 */
export async function GET() {
  try {
    const db = getDb();
    const [kids, allMedia, allMoments, allGrowth, allFirsts] = await Promise.all([
      db.select().from(children).all(),
      db.select().from(media).all(),
      db.select().from(moments).all(),
      db.select().from(growth).all(),
      db.select().from(firsts).all(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      app: "小脚印 · 宝宝成长纪念站",
      children: kids,
      media: allMedia,
      moments: allMoments,
      growth: allGrowth,
      firsts: allFirsts,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="little-steps-${todayYmd()}.json"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
