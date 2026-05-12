'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';

import { ApiError, authApi } from '../api/client';
import type { AuthSession } from '../api/types';
import { Button, FeedbackMessage, Field, fieldControlClass } from '../components/ui';

const authSchema = z.object({
  email: z.string().trim().email('E-mail inválido').max(320),
  password: z.string().min(8, 'Mínimo de 8 caracteres').max(128)
});

type AuthForm = z.infer<typeof authSchema>;

type AuthPageProps = {
  initialMessage?: string | null;
  onAuthenticated: (response: AuthSession) => void;
};

export function AuthPage({ initialMessage = null, onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [apiMessage, setApiMessage] = useState<string | null>(initialMessage);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' }
  });

  const mutation = useMutation({
    mutationFn: (values: AuthForm) =>
      mode === 'login'
        ? authApi.login(values.email, values.password)
        : authApi.register(values.email, values.password),
    onSuccess: onAuthenticated,
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        setApiMessage('Credenciais inválidas.');
        return;
      }
      if (error instanceof ApiError && error.status === 409) {
        setApiMessage('Este e-mail já está cadastrado.');
        return;
      }
      setApiMessage('Não foi possível concluir a autenticação.');
    }
  });

  const onSubmit = (values: AuthForm) => {
    setApiMessage(null);
    mutation.mutate(values);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(90deg,rgb(18_108_99_/_12%),transparent_42%),linear-gradient(180deg,var(--color-aurum-surface),var(--color-aurum-page-strong))] p-6">
      <section
        className="grid w-full max-w-[430px] gap-[22px] rounded-lg border border-aurum-border bg-white p-8 shadow-aurum-panel max-[520px]:p-6"
        aria-labelledby="auth-title"
      >
        <div
          className="grid h-[52px] w-[52px] place-items-center rounded-lg border border-aurum-accent/80 bg-aurum-accent text-aurum-text"
          aria-hidden="true"
        >
          <KeyRound size={26} />
        </div>
        <div>
          <p className="mb-1.5 mt-0 text-[0.76rem] font-bold uppercase tracking-normal text-aurum-muted">
            Aurum Reservas Brasil
          </p>
          <h1 className="m-0 text-[clamp(1.65rem,3vw,2.25rem)] leading-[1.1] tracking-normal text-aurum-text" id="auth-title">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h1>
        </div>

        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
          <Field label="E-mail" controlId="auth-email" error={errors.email?.message} errorId="auth-email-error">
            <input
              id="auth-email"
              aria-describedby={errors.email ? 'auth-email-error' : undefined}
              aria-invalid={errors.email ? 'true' : undefined}
              className={fieldControlClass}
              autoComplete="email"
              type="email"
              {...register('email')}
            />
          </Field>

          <Field label="Senha" controlId="auth-password" error={errors.password?.message} errorId="auth-password-error">
            <input
              id="auth-password"
              aria-describedby={errors.password ? 'auth-password-error' : undefined}
              aria-invalid={errors.password ? 'true' : undefined}
              className={fieldControlClass}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              type="password"
              {...register('password')}
            />
          </Field>

          {apiMessage ? <FeedbackMessage>{apiMessage}</FeedbackMessage> : null}

          <Button className="w-full" type="submit" disabled={mutation.isPending}>
            {mode === 'login' ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
            {mutation.isPending ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </Button>
        </form>

        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            setApiMessage(null);
            setMode((current) => (current === 'login' ? 'register' : 'login'));
          }}
        >
          {mode === 'login' ? 'Criar nova conta' : 'Voltar para login'}
        </Button>
      </section>
    </main>
  );
}
