import { useEffect, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RadioCardItem } from '@/components/common/radio-card-item';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ApiKeyDraft, ApiKeyItem } from '@/features/account/components/api-keys/api-key-types';
import { ExpirationDateTimePicker } from '@/features/account/components/api-keys/expiration-date-time-picker';

interface ApiKeyDialogProps {
  apiKey: ApiKeyItem | null;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ApiKeyDraft) => void;
  open: boolean;
}

interface SettingToggleProps {
  checked: boolean;
  description?: string;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

interface MoneyInputProps {
  description?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

const customKeyPattern = /^[A-Za-z0-9_-]{16,}$/;
const expiryPresets = ['7', '30', '90', 'custom'] as const;
type ExpiryPreset = (typeof expiryPresets)[number];

function toDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function expirationAfter(days: number): string {
  return toDateTimeLocalValue(new Date(Date.now() + days * 24 * 60 * 60 * 1_000));
}

function parseMoney(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function normalizeMoneyInput(value: string): string | null {
  if (!/^\d*(?:\.\d{0,6})?$/.test(value)) {
    return null;
  }
  if (!value) {
    return '';
  }

  const [integerPart, fractionalPart] = value.split('.');
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || '0';

  return fractionalPart === undefined
    ? normalizedInteger
    : `${normalizedInteger}.${fractionalPart}`;
}

function SettingToggle({ checked, description, id, label, onCheckedChange }: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <Label className="text-sm font-semibold" htmlFor={id}>
          {label}
        </Label>
        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function MoneyInput({
  description,
  id,
  label,
  onChange,
  placeholder = '0',
  value,
}: MoneyInputProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        >
          $
        </span>
        <Input
          autoComplete="off"
          className="pl-7 font-mono tabular-nums"
          id={id}
          inputMode="decimal"
          onChange={(event) => {
            const normalizedValue = normalizeMoneyInput(event.target.value);
            if (normalizedValue !== null) {
              onChange(normalizedValue);
            }
          }}
          pattern="[0-9]+([.][0-9]{0,6})?"
          placeholder={placeholder}
          type="text"
          value={value}
        />
      </div>
      {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ApiKeyDialog({
  apiKey,
  isSaving = false,
  onOpenChange,
  onSave,
  open,
}: ApiKeyDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [customKeyEnabled, setCustomKeyEnabled] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customKeyError, setCustomKeyError] = useState(false);
  const [ipRestrictionEnabled, setIpRestrictionEnabled] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [ipBlacklist, setIpBlacklist] = useState('');
  const [quotaLimitUsd, setQuotaLimitUsd] = useState('0');
  const [rateLimitEnabled, setRateLimitEnabled] = useState(false);
  const [fiveHourLimitUsd, setFiveHourLimitUsd] = useState('0');
  const [dailyLimitUsd, setDailyLimitUsd] = useState('0');
  const [weeklyLimitUsd, setWeeklyLimitUsd] = useState('0');
  const [validityEnabled, setValidityEnabled] = useState(false);
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('30');
  const [expiresAt, setExpiresAt] = useState(() => expirationAfter(30));

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(apiKey?.name ?? '');
    setCustomKeyEnabled(false);
    setCustomKey('');
    setCustomKeyError(false);
    setIpRestrictionEnabled(apiKey?.ipRestrictionEnabled ?? false);
    setIpWhitelist(apiKey?.ipWhitelist ?? '');
    setIpBlacklist(apiKey?.ipBlacklist ?? '');
    setQuotaLimitUsd(String(apiKey?.quotaLimitUsd ?? 0));
    setRateLimitEnabled(apiKey?.rateLimitEnabled ?? false);
    setFiveHourLimitUsd(String(apiKey?.fiveHourLimitUsd ?? 0));
    setDailyLimitUsd(String(apiKey?.dailyLimitUsd ?? 0));
    setWeeklyLimitUsd(String(apiKey?.weeklyLimitUsd ?? 0));

    if (apiKey) {
      setValidityEnabled(Boolean(apiKey.expiresAt));
      setExpiryPreset('custom');
      setExpiresAt(
        apiKey.expiresAt ? toDateTimeLocalValue(new Date(apiKey.expiresAt)) : expirationAfter(30),
      );
    } else {
      setValidityEnabled(false);
      setExpiryPreset('30');
      setExpiresAt(expirationAfter(30));
    }
  }, [apiKey, open]);

  function handleExpiryPresetChange(preset: ExpiryPreset) {
    setExpiryPreset(preset);

    if (preset !== 'custom') {
      setExpiresAt(expirationAfter(Number(preset)));
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedCustomKey = customKey.trim();
    const hasInvalidCustomKey = customKeyEnabled && !customKeyPattern.test(normalizedCustomKey);

    setCustomKeyError(hasInvalidCustomKey);
    if (!normalizedName || hasInvalidCustomKey) {
      return;
    }

    const parsedExpiration = expiresAt ? new Date(expiresAt) : null;
    if (validityEnabled && (!parsedExpiration || Number.isNaN(parsedExpiration.getTime()))) {
      return;
    }

    onSave({
      customKey: customKeyEnabled ? normalizedCustomKey : null,
      dailyLimitUsd: rateLimitEnabled ? parseMoney(dailyLimitUsd) : 0,
      expiresAt: validityEnabled && parsedExpiration ? parsedExpiration.toISOString() : null,
      fiveHourLimitUsd: rateLimitEnabled ? parseMoney(fiveHourLimitUsd) : 0,
      ipBlacklist: ipRestrictionEnabled ? ipBlacklist.trim() : '',
      ipRestrictionEnabled,
      ipWhitelist: ipRestrictionEnabled ? ipWhitelist.trim() : '',
      name: normalizedName,
      quotaLimitUsd: parseMoney(quotaLimitUsd),
      rateLimitEnabled,
      weeklyLimitUsd: rateLimitEnabled ? parseMoney(weeklyLimitUsd) : 0,
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby="api-key-dialog-description"
        className="h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-h-[820px] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-clip p-0 sm:h-[92vh] sm:max-w-[680px]"
        closeLabel={t('pages.account.sections.apiKeys.dialog.close')}
      >
        <DialogHeader className="border-b border-border px-4 py-4 pr-12 sm:px-6 sm:py-5 sm:pr-14">
          <DialogTitle>
            {t(
              apiKey
                ? 'pages.account.sections.apiKeys.dialog.editTitle'
                : 'pages.account.sections.apiKeys.dialog.createTitle',
            )}
          </DialogTitle>
          <DialogDescription id="api-key-dialog-description">
            {t('pages.account.sections.apiKeys.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="grid gap-2">
              <Label htmlFor="api-key-name">
                {t('pages.account.sections.apiKeys.dialog.name')}
              </Label>
              <Input
                autoComplete="off"
                id="api-key-name"
                maxLength={48}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('pages.account.sections.apiKeys.dialog.namePlaceholder')}
                required
                value={name}
              />
            </div>

            {!apiKey && (
              <section className="grid gap-3">
                <SettingToggle
                  checked={customKeyEnabled}
                  description={t('pages.account.sections.apiKeys.dialog.customKeyDescription')}
                  id="api-key-custom-toggle"
                  label={t('pages.account.sections.apiKeys.dialog.customKey')}
                  onCheckedChange={(checked) => {
                    setCustomKeyEnabled(checked);
                    setCustomKeyError(false);
                  }}
                />
                {customKeyEnabled && (
                  <div className="grid gap-2">
                    <Input
                      aria-describedby="api-key-custom-help"
                      aria-invalid={customKeyError}
                      autoComplete="off"
                      id="api-key-custom-value"
                      minLength={16}
                      onChange={(event) => {
                        setCustomKey(event.target.value);
                        setCustomKeyError(false);
                      }}
                      pattern="[A-Za-z0-9_-]{16,}"
                      placeholder={t('pages.account.sections.apiKeys.dialog.customKeyPlaceholder')}
                      required
                      value={customKey}
                    />
                    <p
                      className={
                        customKeyError
                          ? 'text-xs leading-5 text-destructive'
                          : 'text-xs leading-5 text-muted-foreground'
                      }
                      id="api-key-custom-help"
                    >
                      {t(
                        customKeyError
                          ? 'pages.account.sections.apiKeys.dialog.customKeyError'
                          : 'pages.account.sections.apiKeys.dialog.customKeyHelp',
                      )}
                    </p>
                  </div>
                )}
              </section>
            )}

            <section className="grid gap-4 border-t border-border pt-5">
              <SettingToggle
                checked={ipRestrictionEnabled}
                description={t('pages.account.sections.apiKeys.dialog.ipDescription')}
                id="api-key-ip-toggle"
                label={t('pages.account.sections.apiKeys.dialog.ipRestriction')}
                onCheckedChange={setIpRestrictionEnabled}
              />
              {ipRestrictionEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="api-key-ip-whitelist">
                      {t('pages.account.sections.apiKeys.dialog.ipWhitelist')}
                    </Label>
                    <Textarea
                      className="min-h-28 resize-y font-mono text-xs"
                      id="api-key-ip-whitelist"
                      onChange={(event) => setIpWhitelist(event.target.value)}
                      placeholder={t(
                        'pages.account.sections.apiKeys.dialog.ipWhitelistPlaceholder',
                      )}
                      value={ipWhitelist}
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t('pages.account.sections.apiKeys.dialog.ipWhitelistHelp')}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="api-key-ip-blacklist">
                      {t('pages.account.sections.apiKeys.dialog.ipBlacklist')}
                    </Label>
                    <Textarea
                      className="min-h-28 resize-y font-mono text-xs"
                      id="api-key-ip-blacklist"
                      onChange={(event) => setIpBlacklist(event.target.value)}
                      placeholder={t(
                        'pages.account.sections.apiKeys.dialog.ipBlacklistPlaceholder',
                      )}
                      value={ipBlacklist}
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t('pages.account.sections.apiKeys.dialog.ipBlacklistHelp')}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="border-t border-border pt-5">
              <MoneyInput
                description={t('pages.account.sections.apiKeys.dialog.quotaHelp')}
                id="api-key-quota-limit"
                label={t('pages.account.sections.apiKeys.dialog.quotaLimit')}
                onChange={setQuotaLimitUsd}
                placeholder={t('pages.account.sections.apiKeys.dialog.moneyPlaceholder')}
                value={quotaLimitUsd}
              />
            </section>

            <section className="grid gap-4 border-t border-border pt-5">
              <SettingToggle
                checked={rateLimitEnabled}
                description={t('pages.account.sections.apiKeys.dialog.rateDescription')}
                id="api-key-rate-toggle"
                label={t('pages.account.sections.apiKeys.dialog.rateLimit')}
                onCheckedChange={setRateLimitEnabled}
              />
              {rateLimitEnabled && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <MoneyInput
                    id="api-key-five-hour-limit"
                    label={t('pages.account.sections.apiKeys.dialog.fiveHourLimit')}
                    onChange={setFiveHourLimitUsd}
                    value={fiveHourLimitUsd}
                  />
                  <MoneyInput
                    id="api-key-daily-limit"
                    label={t('pages.account.sections.apiKeys.dialog.dailyLimit')}
                    onChange={setDailyLimitUsd}
                    value={dailyLimitUsd}
                  />
                  <MoneyInput
                    id="api-key-weekly-limit"
                    label={t('pages.account.sections.apiKeys.dialog.weeklyLimit')}
                    onChange={setWeeklyLimitUsd}
                    value={weeklyLimitUsd}
                  />
                </div>
              )}
            </section>

            <section className="grid gap-4 border-t border-border pt-5">
              <SettingToggle
                checked={validityEnabled}
                description={t('pages.account.sections.apiKeys.dialog.validityDescription')}
                id="api-key-validity-toggle"
                label={t('pages.account.sections.apiKeys.dialog.validity')}
                onCheckedChange={setValidityEnabled}
              />
              {validityEnabled && (
                <div className="grid gap-4">
                  <RadioGroup
                    aria-label={t('pages.account.sections.apiKeys.dialog.validityPresets')}
                    className="flex flex-wrap gap-2"
                    onValueChange={(value) => {
                      const preset = expiryPresets.find((item) => item === value);
                      if (preset) handleExpiryPresetChange(preset);
                    }}
                    value={expiryPreset}
                  >
                    {expiryPresets.map((preset) => (
                      <RadioCardItem
                        className="h-8 border-transparent bg-secondary px-3 text-sm shadow-none hover:bg-secondary/80 peer-data-[state=checked]:border-primary/20 peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary peer-data-[state=checked]:hover:bg-primary/15"
                        id={`api-key-expiry-${preset}`}
                        key={preset}
                        value={preset}
                      >
                        {t(`pages.account.sections.apiKeys.dialog.expiryPresets.${preset}`)}
                      </RadioCardItem>
                    ))}
                  </RadioGroup>
                  <div className="grid gap-2">
                    <Label htmlFor="api-key-expiration">
                      {t('pages.account.sections.apiKeys.dialog.expiration')}
                    </Label>
                    <ExpirationDateTimePicker
                      id="api-key-expiration"
                      onChange={(value) => {
                        setExpiresAt(value);
                        setExpiryPreset('custom');
                      }}
                      value={expiresAt}
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t('pages.account.sections.apiKeys.dialog.expirationHelp')}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
            <Button
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              {t('pages.account.sections.apiKeys.dialog.cancel')}
            </Button>
            <Button disabled={!name.trim() || isSaving} type="submit">
              {t(
                apiKey
                  ? 'pages.account.sections.apiKeys.dialog.save'
                  : 'pages.account.sections.apiKeys.dialog.create',
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
