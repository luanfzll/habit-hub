import { todayIn } from "@/domain/calendar-date";
import { exportAccount } from "@/server/account/service";
import { getCurrentUser } from "@/server/session";

/** Downloads everything the person put into the app, as JSON (data portability, LGPD). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  const data = await exportAccount(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="habithub-${todayIn(user.timezone)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
