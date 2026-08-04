import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/common/brand';
import { Button } from '@/components/ui/button';
import { login, register } from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/context/auth-context';
import { API_ERROR_CODE } from '@/lib/api-error-codes';
import { ApiError } from '@/lib/api-client';

interface AuthPageProps {
  mode: 'login' | 'register';
}

interface AuthLocationState {
  from?: string;
  registrationCompleted?: boolean;
}

const authErrorKeys = new Map<number, string>([
  [API_ERROR_CODE.INVALID_REQUEST, 'auth.errors.invalidRequest'],
  [API_ERROR_CODE.INVALID_EMAIL, 'auth.errors.invalidEmail'],
  [API_ERROR_CODE.INVALID_PASSWORD, 'auth.errors.invalidPassword'],
  [API_ERROR_CODE.EMAIL_ALREADY_EXISTS, 'auth.errors.emailAlreadyExists'],
  [API_ERROR_CODE.INVALID_CREDENTIALS, 'auth.errors.invalidCredentials'],
]);

export function AuthPage({ mode }: AuthPageProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const [errorKey, setErrorKey] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';
  const alternatePath = isRegister ? '/login' : '/register';
  const registrationCompleted =
    !isRegister && Boolean((location.state as AuthLocationState | null)?.registrationCompleted);
  const requestedPath = (location.state as AuthLocationState | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const credentials = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    setErrorKey(undefined);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(credentials);
        navigate('/login', {
          replace: true,
          state: {
            from: requestedPath,
            registrationCompleted: true,
          } satisfies AuthLocationState,
        });
        return;
      } else {
        const user = await login(credentials);
        setAuthenticatedUser(user);
      }

      navigate(resolvePostLoginPath(requestedPath), { replace: true });
    } catch (error) {
      setErrorKey(resolveAuthErrorKey(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 grid min-h-[calc(100vh-188px)] place-items-center px-4 py-14">
      <div className="hero-grid absolute inset-0 -z-10 opacity-55" aria-hidden="true" />
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-[0_24px_70px_color-mix(in_srgb,var(--color-text)_8%,transparent)] sm:p-8">
        <Brand compact />
        <div className="mt-8">
          <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-primary">
            {t(`auth.${mode}.eyebrow`)}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-[-0.04em]">{t(`auth.${mode}.title`)}</h1>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {t(`auth.${mode}.description`)}
          </p>
        </div>

        <form aria-busy={isSubmitting} className="mt-7 space-y-4" onSubmit={handleSubmit}>
          {registrationCompleted && (
            <p
              className="rounded-md border border-success/25 bg-success/8 px-3 py-2.5 text-[11px] leading-5 text-success"
              role="status"
            >
              {t('auth.login.registrationSuccess')}
            </p>
          )}

          <AuthField
            autoComplete="email"
            icon={Mail}
            label={t('auth.fields.email')}
            name="email"
            placeholder={t('auth.fields.emailPlaceholder')}
            type="email"
          />
          <AuthField
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            icon={LockKeyhole}
            label={t('auth.fields.password')}
            name="password"
            placeholder={
              isRegister
                ? t('auth.fields.newPasswordPlaceholder')
                : t('auth.fields.passwordPlaceholder')
            }
            type="password"
          />

          {errorKey && (
            <p
              className="rounded-md border border-danger/25 bg-danger/8 px-3 py-2.5 text-[11px] leading-5 text-danger"
              role="alert"
            >
              {t(errorKey)}
            </p>
          )}

          <Button className="mt-2 w-full" disabled={isSubmitting} size="lg" type="submit">
            {isSubmitting ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                {t('auth.submitting')}
              </>
            ) : (
              <>
                {t(`auth.${mode}.action`)}
                <ArrowRight aria-hidden="true" className="size-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t(`auth.${mode}.alternate`)}{' '}
          <Link
            className="font-semibold text-primary hover:underline"
            state={
              requestedPath ? ({ from: requestedPath } satisfies AuthLocationState) : undefined
            }
            to={alternatePath}
          >
            {t(`auth.${mode}.alternateAction`)}
          </Link>
        </p>
      </div>
    </section>
  );
}

function resolvePostLoginPath(requestedPath: string | undefined): string {
  if (requestedPath?.startsWith('/') && !requestedPath.startsWith('//')) {
    return requestedPath;
  }

  return '/account';
}

function resolveAuthErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    return (
      (error.code === undefined ? undefined : authErrorKeys.get(error.code)) ??
      'auth.errors.general'
    );
  }

  return 'auth.errors.unavailable';
}

interface AuthFieldProps {
  autoComplete: string;
  icon: typeof Mail;
  label: string;
  name: string;
  placeholder: string;
  type: 'email' | 'password';
}

function AuthField({ autoComplete, icon: Icon, label, name, placeholder, type }: AuthFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold">{label}</span>
      <span className="flex h-11 items-center gap-2.5 rounded-md border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          autoComplete={autoComplete}
          maxLength={type === 'password' ? 128 : 254}
          minLength={type === 'password' ? 8 : undefined}
          name={name}
          placeholder={placeholder}
          required
          type={type}
        />
      </span>
    </label>
  );
}
