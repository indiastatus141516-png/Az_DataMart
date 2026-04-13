import React from "react";

const BaseIcon = ({ children }) => (
  <span className="inline-flex h-5 w-5 items-center justify-center text-current">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {children}
    </svg>
  </span>
);

export const DashboardIcon = () => (
  <BaseIcon>
    <path d="M4 4h7v7H4z" />
    <path d="M13 4h7v4h-7z" />
    <path d="M13 10h7v10h-7z" />
    <path d="M4 13h7v7H4z" />
  </BaseIcon>
);

export const PeopleIcon = () => (
  <BaseIcon>
    <circle cx="8" cy="8" r="3" />
    <circle cx="16" cy="10" r="3" />
    <path d="M4 20c0-3 3-5 6-5" />
    <path d="M10 20c0-2 2-4 5-4 2 0 5 2 5 4" />
  </BaseIcon>
);

export const ShoppingCartIcon = () => (
  <BaseIcon>
    <path d="M3 5h3l2 12h10l2-8H7" />
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="17" cy="20" r="1.5" />
  </BaseIcon>
);

export const UploadIcon = () => (
  <BaseIcon>
    <path d="M12 3v12" />
    <path d="M7 8l5-5 5 5" />
    <path d="M5 21h14" />
  </BaseIcon>
);

export const CategoryIcon = () => (
  <BaseIcon>
    <path d="M4 4h7v7H4z" />
    <path d="M13 4h7v7h-7z" />
    <path d="M4 13h7v7H4z" />
    <path d="M13 13h7v7h-7z" />
  </BaseIcon>
);

export const AnalyticsIcon = () => (
  <BaseIcon>
    <path d="M4 19V9" />
    <path d="M10 19V5" />
    <path d="M16 19v-7" />
    <path d="M22 19V3" />
  </BaseIcon>
);

export const SettingsIcon = () => (
  <BaseIcon>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12l2-1-2-1-1-2 1-2-2-1-2 1-2-1-1-2-1 2-2 1-2-1-1 2 1 2-1 2-2 1 2 1 1 2-1 2 2 1 2-1 2 1 1 2 1-2 2-1 2 1 1-2-1-2z" />
  </BaseIcon>
);

export const MenuIcon = () => (
  <BaseIcon>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </BaseIcon>
);

export const CloseIcon = () => (
  <BaseIcon>
    <path d="M6 6l12 12" />
    <path d="M18 6l-12 12" />
  </BaseIcon>
);

export const TrendingUpIcon = () => (
  <BaseIcon>
    <path d="M4 14l5-5 4 4 7-7" />
    <path d="M20 7v6h-6" />
  </BaseIcon>
);

export const MonetizationOnIcon = () => (
  <BaseIcon>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 8v8" />
    <path d="M9 10h6" />
    <path d="M9 14h6" />
  </BaseIcon>
);

export const PersonAddIcon = () => (
  <BaseIcon>
    <circle cx="9" cy="8" r="3" />
    <path d="M4 20c0-3 3-5 6-5" />
    <path d="M17 8v6" />
    <path d="M14 11h6" />
  </BaseIcon>
);

export const BlockIcon = () => (
  <BaseIcon>
    <circle cx="12" cy="12" r="7" />
    <path d="M8 8l8 8" />
  </BaseIcon>
);

export const CheckCircleIcon = () => (
  <BaseIcon>
    <circle cx="12" cy="12" r="7" />
    <path d="M8 12l3 3 5-6" />
  </BaseIcon>
);

export const CancelIcon = () => (
  <BaseIcon>
    <circle cx="12" cy="12" r="7" />
    <path d="M9 9l6 6" />
    <path d="M15 9l-6 6" />
  </BaseIcon>
);

export const EditIcon = () => (
  <BaseIcon>
    <path d="M4 20h4l10-10-4-4L4 16v4z" />
  </BaseIcon>
);

export const VisibilityIcon = () => (
  <BaseIcon>
    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="3" />
  </BaseIcon>
);

export const LogoutIcon = () => (
  <BaseIcon>
    <path d="M9 6h-4v12h4" />
    <path d="M13 16l4-4-4-4" />
    <path d="M17 12H9" />
  </BaseIcon>
);

export const DeleteIcon = () => (
  <BaseIcon>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M8 7l1 12h6l1-12" />
  </BaseIcon>
);

export const DownloadIcon = () => (
  <BaseIcon>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 21h14" />
  </BaseIcon>
);

export const CreditCardIcon = () => (
  <BaseIcon>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18" />
  </BaseIcon>
);

export const DataUsageIcon = () => (
  <BaseIcon>
    <path d="M4 18a8 8 0 1116 0" />
    <path d="M12 10v6" />
  </BaseIcon>
);

export const SearchIcon = () => (
  <BaseIcon>
    <circle cx="10" cy="10" r="6" />
    <path d="M15 15l6 6" />
  </BaseIcon>
);

export const ClearIcon = () => (
  <BaseIcon>
    <path d="M6 6l12 12" />
    <path d="M18 6l-12 12" />
  </BaseIcon>
);

export const AddIcon = () => (
  <BaseIcon>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </BaseIcon>
);

export const WalletIcon = () => (
  <BaseIcon>
    <path d="M4 7h16a2 2 0 012 2v6a2 2 0 01-2 2H4z" />
    <path d="M16 7V5a2 2 0 00-2-2H4" />
    <circle cx="17" cy="12" r="1" />
  </BaseIcon>
);

export const AssignmentIcon = () => (
  <BaseIcon>
    <rect x="5" y="4" width="14" height="16" rx="2" />
    <path d="M9 4h6" />
    <path d="M8 10h8" />
    <path d="M8 14h8" />
  </BaseIcon>
);

export const GetAppIcon = () => (
  <BaseIcon>
    <path d="M12 4v10" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </BaseIcon>
);

export const RefreshIcon = () => (
  <BaseIcon>
    <path d="M20 12a8 8 0 10-3 6" />
    <path d="M20 8v4h-4" />
  </BaseIcon>
);

export const PersonIcon = () => (
  <BaseIcon>
    <circle cx="12" cy="8" r="3" />
    <path d="M5 20c0-3 3-5 7-5s7 2 7 5" />
  </BaseIcon>
);
