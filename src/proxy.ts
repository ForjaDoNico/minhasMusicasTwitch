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

  // Se o Supabase não reconhecer o redirectTo (lista de Redirect URLs), ele volta para a Site URL com
  // ?code=… em vez de /auth/callback. Encaminha para o callback para concluir o login mesmo assim.
  const { pathname, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (code && !pathname.startsWith("/api/") && !pathname.startsWith("/auth/")) {
    const target = new URL("/auth/callback", request.nextUrl);
    target.searchParams.set("code", code);
    target.searchParams.set("next", pathname === "/" ? "/dashboard" : pathname);
    return NextResponse.redirect(target);
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
  // getClaims verifica o JWT localmente (chaves assimétricas) e só renova a sessão quando precisa,
  // evitando uma ida ao servidor de Auth a cada clique.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!api/twitch/eventsub|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
