import { useEffect, useState, type SubmitEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Brand } from '@/components/common/brand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const AUTH_FEEDBACK_TOAST_ID = 'auth-feedback';

export function AuthPage({ mode }: AuthPageProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';
  const alternatePath = isRegister ? '/login' : '/register';
  const registrationCompleted =
    !isRegister && Boolean((location.state as AuthLocationState | null)?.registrationCompleted);
  const requestedPath = (location.state as AuthLocationState | null)?.from;

  useEffect(() => {
    if (!registrationCompleted) {
      return;
    }

    toast.success(t('auth.login.registrationSuccess'), {
      id: AUTH_FEEDBACK_TOAST_ID,
    });
    navigate(location.pathname, {
      replace: true,
      state: requestedPath ? ({ from: requestedPath } satisfies AuthLocationState) : null,
    });
  }, [location.pathname, navigate, registrationCompleted, requestedPath, t]);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const credentials = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    toast.dismiss(AUTH_FEEDBACK_TOAST_ID);
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
      toast.error(t(resolveAuthErrorKey(error)), {
        id: AUTH_FEEDBACK_TOAST_ID,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative z-10 grid min-h-[calc(100vh-188px)] place-items-center px-4 py-14">
      <div className="hero-grid absolute inset-0 -z-10 opacity-55" aria-hidden="true" />
      <Card className="w-full max-w-md gap-0 p-6 shadow-[0_24px_70px_color-mix(in_srgb,var(--color-text)_8%,transparent)] sm:p-8">
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

        <form
          key={mode}
          aria-busy={isSubmitting}
          className="mt-7 space-y-4"
          onSubmit={handleSubmit}
        >
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
      </Card>
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
  const { t } = useTranslation();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-semibold" htmlFor={name}>
        {label}
      </Label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 z-1 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className={
            isPassword
              ? 'h-11 bg-background pl-10 pr-11 text-sm'
              : 'h-11 bg-background pl-10 text-sm'
          }
          autoComplete={autoComplete}
          id={name}
          maxLength={isPassword ? 128 : 254}
          minLength={isPassword ? 8 : undefined}
          name={name}
          placeholder={placeholder}
          required
          type={isPassword && isPasswordVisible ? 'text' : type}
        />
        {isPassword && (
          <Button
            aria-label={
              isPasswordVisible ? t('auth.fields.hidePassword') : t('auth.fields.showPassword')
            }
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            size="icon-sm"
            title={
              isPasswordVisible ? t('auth.fields.hidePassword') : t('auth.fields.showPassword')
            }
            type="button"
            variant="ghost"
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
