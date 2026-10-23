"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/states";

export function LoginForm({ mode, next }: { mode: "local" | "supabase"; next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {mode === "supabase" ? (
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </Field>
      ) : null}
      <Field label="Mật khẩu" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}
