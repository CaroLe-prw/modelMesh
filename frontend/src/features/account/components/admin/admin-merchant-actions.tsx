import {
  Ban,
  CircleCheck,
  ClipboardCheck,
  Ellipsis,
  Eye,
  PackagePlus,
  Pencil,
  RadioTower,
  ScrollText,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AdminMerchant } from '@/features/account/api/admin-merchants';

export function AdminMerchantActions({
  disabled,
  merchant,
  onDelete,
  onEdit,
  onReview,
  onToggleStatus,
  onViewDetails,
}: {
  disabled: boolean;
  merchant: AdminMerchant;
  onDelete: (merchant: AdminMerchant) => void;
  onEdit: (merchant: AdminMerchant) => void;
  onReview: (merchant: AdminMerchant) => void;
  onToggleStatus: (merchant: AdminMerchant) => void;
  onViewDetails: (merchant: AdminMerchant) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const translationPath = 'pages.account.sections.admin.merchants.actions';

  return (
    <div className="flex items-center gap-1">
      <MerchantActionButton
        disabled={disabled}
        icon={Pencil}
        label={t(`${translationPath}.edit`)}
        onClick={() => onEdit(merchant)}
      />
      {(merchant.status === 'active' || merchant.status === 'suspended') && (
        <MerchantActionButton
          disabled={disabled}
          icon={merchant.status === 'active' ? Ban : CircleCheck}
          label={t(`${translationPath}.${merchant.status === 'active' ? 'disable' : 'enable'}`)}
          onClick={() => onToggleStatus(merchant)}
        />
      )}
      {merchant.status === 'pending' && (
        <MerchantActionButton
          disabled={disabled}
          icon={ClipboardCheck}
          label={t(`${translationPath}.review`)}
          onClick={() => onReview(merchant)}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t(`${translationPath}.menu`, { merchant: merchant.name })}
            className="h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
            disabled={disabled}
            type="button"
            variant="ghost"
          >
            <Ellipsis aria-hidden="true" className="size-4" />
            {t(`${translationPath}.more`)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 p-2">
          <DropdownMenuItem className="gap-3 px-3 py-2" onSelect={() => onViewDetails(merchant)}>
            <Eye aria-hidden="true" />
            {t(`${translationPath}.details`)}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-3 px-3 py-2"
            onSelect={() => navigate(`/merchant/channels?merchantId=${merchant.id}`)}
          >
            <RadioTower aria-hidden="true" />
            {t(`${translationPath}.channels`)}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 px-3 py-2"
            onSelect={() => navigate(`/merchant/models?merchantId=${merchant.id}`)}
          >
            <PackagePlus aria-hidden="true" />
            {t(`${translationPath}.models`)}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3 px-3 py-2"
            onSelect={() =>
              navigate(`/admin/usage-logs?merchant=${encodeURIComponent(merchant.name)}`)
            }
          >
            <ScrollText aria-hidden="true" />
            {t(`${translationPath}.usageLogs`)}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-3 px-3 py-2"
            onSelect={() => onDelete(merchant)}
            variant="destructive"
          >
            <Trash2 aria-hidden="true" />
            {t(`${translationPath}.delete`)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MerchantActionButton({
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="h-auto min-w-12 flex-col gap-1 px-2 py-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </Button>
  );
}
