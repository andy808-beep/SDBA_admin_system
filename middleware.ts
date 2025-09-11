import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/admin", "/dashboard"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasAccess = req.cookies.get("sb-access-token")?.value;
  if (!hasAccess) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/dashboard/:path*"] };
