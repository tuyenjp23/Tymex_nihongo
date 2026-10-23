"use client";
import { useActionState } from "react";
import { signInAction, signUpAction, type AuthState } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/states";

function Form({ title, action, submit, idp, autoComplete }: { title: string; action: (p: AuthState, f: FormData) => Promise<AuthState>; submit: string; idp: string; autoComplete: string }) {
  const [state, run, pending] = useActionState<AuthState, FormData>(action, {});
  return (
    <Card className="space-y-3">
      <CardTitle>{title}</CardTitle>
      <form action={run} className="space-y-3" noValidate>
        <Field label="Email" htmlFor={`${idp}-email`} required>
          <Input id={`${idp}-email`} name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="Mật khẩu" htmlFor={`${idp}-pw`} required hint={idp === "su" ? "Ít nhất 8 ký tự" : undefined}>
          <Input id={`${idp}-pw`} name="password" type="password" autoComplete={autoComplete} required minLength={idp === "su" ? 8 : undefined} />
        </Field>
        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        {state.info ? <Alert tone="success">{state.info}</Alert> : null}
        <Button type="submit" disabled={pending}>{pending ? "Đang xử lý…" : submit}</Button>
      </form>
    </Card>
  );
}

export function AuthForms() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Form title="Đăng nhập" action={signInAction} submit="Đăng nhập" idp="si" autoComplete="current-password" />
      <Form title="Tạo tài khoản" action={signUpAction} submit="Đăng ký" idp="su" autoComplete="new-password" />
    </div>
  );
}
