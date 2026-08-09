import { Link2, Mail, Save, Trash2, Upload } from 'lucide-react';
import { useState, type ChangeEvent, type ComponentType, type SubmitEvent } from 'react';
import { SiGithub, SiGoogle, SiWechat } from 'react-icons/si';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/common/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ProfileDetailsCardsProps {
  avatarUrl?: string;
  displayName: string;
  email: string;
  onAvatarChange: (avatarUrl: string | undefined) => void;
}

const profileActionToastId = 'profile-action-feedback';
const avatarSizeLimit = 20 * 1024;
const avatarMaxDimension = 512;

const externalProviders = [
  { icon: SiGithub, key: 'github', tone: 'bg-secondary text-foreground' },
  { icon: SiGoogle, key: 'google', tone: 'bg-primary/10 text-primary' },
  { icon: SiWechat, key: 'wechat', tone: 'bg-success/10 text-success' },
] as const;

export function ProfileDetailsCards({
  avatarUrl,
  displayName,
  email,
  onAvatarChange,
}: ProfileDetailsCardsProps) {
  const { t } = useTranslation();
  const [nameDraft, setNameDraft] = useState(displayName);
  function showUnavailableFeedback() {
    toast.info(t('pages.account.sections.profile.feedback.notConnected'), {
      id: profileActionToastId,
    });
  }

  async function handleAvatarFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (
      !file.type.startsWith('image/') ||
      (file.type === 'image/gif' && file.size > avatarSizeLimit)
    ) {
      toast.error(t('pages.account.sections.profile.details.avatar.invalidFile'), {
        id: profileActionToastId,
      });
      input.value = '';
      return;
    }

    try {
      const avatarDataUrl =
        file.type === 'image/gif'
          ? await readBlobAsDataUrl(file)
          : await compressStaticAvatar(file);
      onAvatarChange(avatarDataUrl);
    } catch {
      toast.error(t('pages.account.sections.profile.details.avatar.invalidFile'), {
        id: profileActionToastId,
      });
    } finally {
      input.value = '';
    }
  }

  function handleProfileSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    showUnavailableFeedback();
  }

  return (
    <>
      <Card className="gap-0 py-0 shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{t('pages.account.sections.profile.details.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.profile.details.description')}
          </p>
        </div>
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
          <div className="flex min-h-64 flex-col items-start rounded-xl bg-secondary/35 p-5">
            <UserAvatar
              avatarUrl={avatarUrl}
              className="size-18"
              fallbackClassName="text-lg"
              name={displayName}
            />
            <h3 className="mt-4 text-base font-semibold">
              {t('pages.account.sections.profile.details.avatar.title')}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t('pages.account.sections.profile.details.avatar.hint')}
            </p>
            <Input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              id="profile-avatar-upload"
              onChange={handleAvatarFile}
              type="file"
            />
            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              <Button asChild size="sm" type="button" variant="outline">
                <Label className="cursor-pointer" htmlFor="profile-avatar-upload">
                  <Upload aria-hidden="true" className="size-3.5" />
                  {t('pages.account.sections.profile.details.avatar.upload')}
                </Label>
              </Button>
              <Button
                disabled={!avatarUrl}
                onClick={showUnavailableFeedback}
                size="sm"
                type="button"
              >
                <Save aria-hidden="true" className="size-3.5" />
                {t('pages.account.sections.profile.details.avatar.save')}
              </Button>
              <Button
                disabled={!avatarUrl}
                onClick={() => onAvatarChange(undefined)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                {t('pages.account.sections.profile.details.avatar.remove')}
              </Button>
            </div>
          </div>

          <form
            className="flex min-h-64 flex-col rounded-xl bg-secondary/35 p-5"
            onSubmit={handleProfileSubmit}
          >
            <h3 className="text-sm font-semibold">
              {t('pages.account.sections.profile.details.edit.title')}
            </h3>
            <div className="mt-5 grid gap-2">
              <Label htmlFor="profile-display-name">
                {t('pages.account.sections.profile.details.edit.displayName')}
              </Label>
              <Input
                id="profile-display-name"
                maxLength={64}
                onChange={(event) => setNameDraft(event.target.value)}
                required
                value={nameDraft}
              />
            </div>
            <div className="mt-auto flex justify-end pt-6">
              <Button type="submit">
                <Save aria-hidden="true" className="size-4" />
                {t('pages.account.sections.profile.details.edit.update')}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">
            {t('pages.account.sections.profile.loginMethods.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.profile.loginMethods.description')}
          </p>
        </div>
        <div className="grid gap-2 p-3 sm:p-4">
          <LoginMethodRow
            bound
            detail={email}
            icon={Mail}
            name={t('pages.account.sections.profile.loginMethods.providers.email')}
            onAction={showUnavailableFeedback}
          />
          {externalProviders.map((provider) => (
            <LoginMethodRow
              detail={t('pages.account.sections.profile.loginMethods.unboundDescription')}
              icon={provider.icon}
              iconClassName={provider.tone}
              key={provider.key}
              name={t(`pages.account.sections.profile.loginMethods.providers.${provider.key}`)}
              onAction={showUnavailableFeedback}
            />
          ))}
        </div>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="p-5 sm:p-6">
          <h2 className="font-semibold">{t('pages.account.sections.profile.sources.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pages.account.sections.profile.sources.description')}
          </p>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Link2 aria-hidden="true" className="size-4" />
            </span>
            <span className="text-sm">{t('pages.account.sections.profile.sources.email')}</span>
          </div>
        </div>
      </Card>
    </>
  );
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('error', () => reject(reader.error));
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unable to read avatar image'));
    });
    reader.readAsDataURL(blob);
  });
}

function loadAvatarImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode avatar image'));
    });
    image.addEventListener('load', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    });
    image.src = objectUrl;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Unable to compress avatar image'));
      },
      'image/webp',
      quality,
    );
  });
}

async function compressStaticAvatar(file: File): Promise<string> {
  const image = await loadAvatarImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context || image.naturalWidth === 0 || image.naturalHeight === 0) {
    throw new Error('Unable to prepare avatar image');
  }

  const initialScale = Math.min(
    1,
    avatarMaxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
  let height = Math.max(1, Math.round(image.naturalHeight * initialScale));
  const qualitySteps = [0.88, 0.72, 0.56, 0.4, 0.28];

  for (let iteration = 0; iteration < 16; iteration += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualitySteps) {
      const blob = await canvasToWebp(canvas, quality);
      if (blob.size <= avatarSizeLimit) {
        return readBlobAsDataUrl(blob);
      }
    }

    const longestEdge = Math.max(width, height);
    if (longestEdge <= 32) {
      break;
    }
    const nextLongestEdge = Math.max(32, Math.round(longestEdge * 0.78));
    const resizeScale = nextLongestEdge / longestEdge;
    width = Math.max(1, Math.round(width * resizeScale));
    height = Math.max(1, Math.round(height * resizeScale));
  }

  throw new Error('Unable to compress avatar image below the size limit');
}

interface LoginMethodRowProps {
  bound?: boolean;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
  name: string;
  onAction: () => void;
}

function LoginMethodRow({
  bound = false,
  detail,
  icon: Icon,
  iconClassName,
  name,
  onAction,
}: LoginMethodRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 sm:p-4">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground',
          iconClassName,
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-sm">{name}</strong>
          <Badge
            className={
              bound
                ? 'border-success/20 bg-success/10 text-success'
                : 'border-border bg-secondary text-muted-foreground'
            }
            variant="outline"
          >
            {t(
              bound
                ? 'pages.account.sections.profile.loginMethods.bound'
                : 'pages.account.sections.profile.loginMethods.unbound',
            )}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <Button onClick={onAction} size="sm" type="button" variant="outline">
        {t(
          bound
            ? 'pages.account.sections.profile.loginMethods.manage'
            : 'pages.account.sections.profile.loginMethods.bind',
        )}
      </Button>
    </div>
  );
}
