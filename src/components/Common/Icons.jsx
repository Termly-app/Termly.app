/**
 * Icons.jsx — ShuleSoft SVG Icon Library
 *
 * Usage:
 *   import { DashboardIcon, StudentsIcon } from '../../components/Common/Icons';
 *   <DashboardIcon size={18} color="currentColor" />
 *
 * All icons: 24×24 viewBox, stroke-based, no fill by default.
 * Props: size (default 18), color (default 'currentColor'), strokeWidth (default 1.8)
 */

const defaults = { size: 18, color: 'currentColor', strokeWidth: 1.8 };

function Ico({ size, color, strokeWidth, children, ...rest }) {
  const s = size        || defaults.size;
  const c = color       || defaults.color;
  const w = strokeWidth || defaults.strokeWidth;
  return (
    <svg
      width={s} height={s}
      viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={w}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

// ══ Navigation ═════════════════════════════════════════════════════════════

export const DashboardIcon = (p) => (
  <Ico {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </Ico>
);

export const StudentsIcon = (p) => (
  <Ico {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </Ico>
);

export const StaffIcon = (p) => (
  <Ico {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
    <path d="M12 11v4"/>
    <path d="M10 13h4"/>
  </Ico>
);

export const AttendanceIcon = (p) => (
  <Ico {...p}>
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </Ico>
);

export const GradingIcon = (p) => (
  <Ico {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </Ico>
);

export const TimetableIcon = (p) => (
  <Ico {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </Ico>
);

export const FeesIcon = (p) => (
  <Ico {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </Ico>
);

export const FeeStructureIcon = (p) => (
  <Ico {...p}>
    <line x1="8"  y1="6"  x2="21" y2="6"/>
    <line x1="8"  y1="12" x2="21" y2="12"/>
    <line x1="8"  y1="18" x2="21" y2="18"/>
    <line x1="3"  y1="6"  x2="3.01" y2="6"/>
    <line x1="3"  y1="12" x2="3.01" y2="12"/>
    <line x1="3"  y1="18" x2="3.01" y2="18"/>
  </Ico>
);

export const SecurityIcon = (p) => (
  <Ico {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </Ico>
);

export const SubscriptionsIcon = (p) => (
  <Ico {...p}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </Ico>
);

export const SettingsIcon = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </Ico>
);

export const SignOutIcon = (p) => (
  <Ico {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </Ico>
);

export const BillingIcon = (p) => (
  <Ico {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2"  y1="10" x2="22" y2="10"/>
    <line x1="7"  y1="15" x2="7.01" y2="15" strokeWidth={3}/>
    <line x1="11" y1="15" x2="13"   y2="15"/>
  </Ico>
);

// ══ SuperAdmin ══════════════════════════════════════════════════════════════

export const OverviewIcon = (p) => (
  <Ico {...p}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </Ico>
);

export const SchoolsIcon = (p) => (
  <Ico {...p}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </Ico>
);

export const PaymentsIcon = (p) => (
  <Ico {...p}>
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </Ico>
);

export const HistoryIcon = (p) => (
  <Ico {...p}>
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
  </Ico>
);

export const RevenueIcon = (p) => (
  <Ico {...p}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </Ico>
);

export const ActivityIcon = (p) => (
  <Ico {...p}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </Ico>
);

export const RecoveryIcon = (p) => (
  <Ico {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </Ico>
);

// ══ Actions ════════════════════════════════════════════════════════════════

export const SearchIcon = (p) => (
  <Ico {...p}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </Ico>
);

export const FilterIcon = (p) => (
  <Ico {...p}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </Ico>
);

export const PrintIcon = (p) => (
  <Ico {...p}>
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </Ico>
);

export const DownloadIcon = (p) => (
  <Ico {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </Ico>
);

export const UploadIcon = (p) => (
  <Ico {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </Ico>
);

export const PlusIcon = (p) => (
  <Ico {...p}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5"  y1="12" x2="19" y2="12"/>
  </Ico>
);

export const TrashIcon = (p) => (
  <Ico {...p}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </Ico>
);

export const EditIcon = (p) => (
  <Ico {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </Ico>
);

export const CloseIcon = (p) => (
  <Ico {...p}>
    <line x1="18" y1="6"  x2="6"  y2="18"/>
    <line x1="6"  y1="6"  x2="18" y2="18"/>
  </Ico>
);

export const CheckIcon = (p) => (
  <Ico {...p}>
    <polyline points="20 6 9 17 4 12"/>
  </Ico>
);

export const CheckCircleIcon = (p) => (
  <Ico {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </Ico>
);

export const AlertIcon = (p) => (
  <Ico {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9"  x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </Ico>
);

export const InfoIcon = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8"  x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </Ico>
);

export const RefreshIcon = (p) => (
  <Ico {...p}>
    <polyline points="1 4 1 10 7 10"/>
    <polyline points="23 20 23 14 17 14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </Ico>
);

export const EyeIcon = (p) => (
  <Ico {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </Ico>
);

export const LockIcon = (p) => (
  <Ico {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </Ico>
);

export const MailIcon = (p) => (
  <Ico {...p}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22 6 12 13 2 6"/>
  </Ico>
);

export const PhoneIcon = (p) => (
  <Ico {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17z"/>
  </Ico>
);

export const MapPinIcon = (p) => (
  <Ico {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </Ico>
);

export const UserIcon = (p) => (
  <Ico {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </Ico>
);

export const ClockIcon = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </Ico>
);

export const ChevronDownIcon = (p) => (
  <Ico {...p}>
    <polyline points="6 9 12 15 18 9"/>
  </Ico>
);

export const ChevronRightIcon = (p) => (
  <Ico {...p}>
    <polyline points="9 18 15 12 9 6"/>
  </Ico>
);

export const ChevronLeftIcon = (p) => (
  <Ico {...p}>
    <polyline points="15 18 9 12 15 6"/>
  </Ico>
);

export const ArrowUpIcon = (p) => (
  <Ico {...p}>
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </Ico>
);

export const ArrowDownIcon = (p) => (
  <Ico {...p}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </Ico>
);

export const MenuIcon = (p) => (
  <Ico {...p}>
    <line x1="3"  y1="6"  x2="21" y2="6"/>
    <line x1="3"  y1="12" x2="21" y2="12"/>
    <line x1="3"  y1="18" x2="21" y2="18"/>
  </Ico>
);

export const ExternalLinkIcon = (p) => (
  <Ico {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </Ico>
);

export const SaveIcon = (p) => (
  <Ico {...p}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </Ico>
);

export const DatabaseIcon = (p) => (
  <Ico {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </Ico>
);

export const LayersIcon = (p) => (
  <Ico {...p}>
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </Ico>
);

export const ZapIcon = (p) => (
  <Ico {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </Ico>
);

export const AwardIcon = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
  </Ico>
);

export const FlagIcon = (p) => (
  <Ico {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </Ico>
);

export const BookIcon = (p) => (
  <Ico {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </Ico>
);

export const BellIcon = (p) => (
  <Ico {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </Ico>
);

export const MessageIcon = (p) => (
  <Ico {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </Ico>
);

export const TrendingUpIcon = (p) => (
  <Ico {...p}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </Ico>
);

export const BarChartIcon = (p) => (
  <Ico {...p}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
    <line x1="2"  y1="20" x2="22" y2="20"/>
  </Ico>
);

export const PieChartIcon = (p) => (
  <Ico {...p}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </Ico>
);

export const DotsIcon = (p) => (
  <Ico {...p}>
    <circle cx="12" cy="5"  r="1" fill="currentColor"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <circle cx="12" cy="19" r="1" fill="currentColor"/>
  </Ico>
);

export const StatusDotIcon = ({ size = 8, color = '#0DD88A' }) => (
  <span style={{
    display      : 'inline-block',
    width        : size,
    height       : size,
    borderRadius : '50%',
    background   : color,
    boxShadow    : `0 0 ${size * 0.8}px ${color}`,
    flexShrink   : 0,
  }} />
);

// ══ Logo mark ═══════════════════════════════════════════════════════════════

export const LogoMark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-label="ShuleSoft">
    <rect width="28" height="28" rx="7" fill="url(#logoGrad)"/>
    <rect x="7" y="7"   width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.95)"/>
    <rect x="15" y="7"  width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.55)"/>
    <rect x="7" y="15"  width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.55)"/>
    <rect x="15" y="15" width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.25)"/>
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7C5CFC"/>
        <stop offset="1" stopColor="#4F3DB8"/>
      </linearGradient>
    </defs>
  </svg>
);

export const LogoMarkBW = ({ size = 28, color = "#FFFFFF" }) => (
  <svg width={size} height={size} viewBox="0 0 13 13" fill="none" aria-label="ShuleSoft">
    <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill={color}/>
    <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill={color} fillOpacity="0.4"/>
    <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill={color} fillOpacity="0.4"/>
    <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill={color} fillOpacity="0.2"/>
  </svg>
);
