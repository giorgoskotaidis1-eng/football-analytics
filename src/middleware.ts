import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { getAuth0Client } from "@/lib/auth0";

export async function middleware(request: NextRequest) {
  const auth0 = getAuth0Client();
  if (!auth0) {
    return updateSession(request);
  }

  const auth0Response = await auth0.middleware(request);

  const location = auth0Response.headers.get("location");
  if (location) {
    return auth0Response;
  }

  const response = await updateSession(request);
  auth0Response.cookies.getAll().forEach((cookie) => {
    try {
      response.cookies.set(cookie);
    } catch (error) {
      console.error("[middleware] Failed to merge Auth0 cookie:", cookie.name, error);
    }
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
