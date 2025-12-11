// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminUser } from "@/lib/auth";
import { env } from "@/lib/env";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl;

  if (url.pathname.startsWith("/admin")) {
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );
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
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user && isAdminUser(user)) {
      const to = url.searchParams.get("redirectedFrom") || "/admin";
      return NextResponse.redirect(new URL(to, req.url));
    }
  }

  return res;
}

export const config = { matcher: ["/admin/:path*", "/auth"] };
