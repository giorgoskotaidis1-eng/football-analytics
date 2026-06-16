import { NextRequest, NextResponse } from "next/server";
import { getAuth0Client } from "@/lib/auth0";

async function handleRequest(req: NextRequest): Promise<NextResponse> {
  const auth0 = getAuth0Client();
  if (!auth0) {
    return NextResponse.json(
      { error: "Auth0 is not configured on this server. Please set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, and APP_BASE_URL." },
      { status: 503 }
    );
  }
  return auth0.middleware(req) as Promise<NextResponse>;
}

export const GET = handleRequest;
export const POST = handleRequest;
