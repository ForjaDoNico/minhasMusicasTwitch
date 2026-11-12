"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui";

export function DevLoginForm() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("streamer@demo.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
        if (error) return setError(error.message);
        const next = sp.get("next") ?? "/dashboard";
        window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      }}
    >
      <Field label="Email"><Input name="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><Input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" data-testid="dev-login-submit">Login</Button>
    </form>
  );
}
