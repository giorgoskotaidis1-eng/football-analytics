import { Auth0Client } from "@auth0/nextjs-auth0/server";
import {
  AUTH0_CALLBACK_PATH,
  AUTH0_LOGIN_PATH,
  AUTH0_LOGOUT_PATH,
  SSO_COMPLETE_PATH,
} from "./auth0-routes";

let auth0Client: Auth0Client | null | undefined;

function hasRequiredAuth0Env() {
  return Boolean(
    process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_SECRET &&
      process.env.APP_BASE_URL
  );
}

export function getAuth0Client() {
  if (auth0Client !== undefined) {
    return auth0Client;
  }

  if (!hasRequiredAuth0Env()) {
    auth0Client = null;
    return auth0Client;
  }

  try {
    auth0Client = new Auth0Client({
      routes: {
        login: AUTH0_LOGIN_PATH,
        callback: AUTH0_CALLBACK_PATH,
        logout: AUTH0_LOGOUT_PATH,
      },
      signInReturnToPath: SSO_COMPLETE_PATH,
    });
  } catch (error) {
    console.error("[auth0] Failed to initialize Auth0 client:", error);
    auth0Client = null;
  }

  return auth0Client;
}
