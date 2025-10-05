// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

function isAdminUser(user: any) {
  const roles = (user?.app_metadata?.roles ?? user?.user_metadata?.roles ?? []) as string[];
  const role = (user?.app_metadata?.role ?? user?.user_metadata?.role) as string | undefined;
  return roles?.includes("admin") || role === "admin" || user?.user_metadata?.is_admin === true;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl;

  if (url.pathname.startsWith("/admin")) {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/auth", req.url);
      loginUrl.searchParams.set("redirectedFrom", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdminUser(user)) {
      const denied = new URL("/auth", req.url);
      denied.searchParams.set("error", "forbidden");
      denied.searchParams.set("redirectedFrom", url.pathname);
      return NextResponse.redirect(denied);
    }
    return res;
  }

  if (url.pathname === "/auth") {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (user && isAdminUser(user)) {
      const to = url.searchParams.get("redirectedFrom") || "/admin";
      return NextResponse.redirect(new URL(to, req.url));
    }
  }

  return res;
}

export const config = { matcher: ["/admin/:path*", "/auth"] };
