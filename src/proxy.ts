import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session cookie on navigation.
export async function proxy(request: NextRequest) {
  // Em produção, força o domínio oficial (NEXT_PUBLIC_APP_URL). A Vercel serve o mesmo deploy em vários
  // domínios (*.vercel.app) e cada um tem seus próprios cookies: logar em um e voltar da Twitch em outro
  // (callback do bot usa APP_URL) parecia "deslogar".
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_ENV === "production" && appUrl) {
    const canonical = new URL(appUrl);
    if (request.nextUrl.host !== canonical.host) {
      const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical);
      return NextResponse.redirect(target, 308);
    }
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!api/twitch/eventsub|api/tips/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
