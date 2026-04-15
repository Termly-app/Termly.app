import { 
  CrossIcon, CheckIcon, AttendanceIcon, GradingIcon, FeesIcon, TimetableIcon, BookIcon, 
  SendIcon, FlagIcon, PhoneIcon, TeacherIcon, UsersIcon, ChartBarIcon, SchoolIcon, 
  DiamondIcon, PlatformZapIcon, SubscriptionsIcon, ReceiptIcon, UploadIcon, CalendarIcon,
  RefreshIcon, StarIcon
} from '../components/CommonIcons';

/**
 * shulesoft-constants.js
 * Central registry for platform-wide metadata to prevent circular dependencies.
 */

export var SANDBOX_PLAN = 'Sandbox';

// Authority Identities
export var SUPPORT_EMAIL = 'shulesoft8@gmail.com';
export var SUPER_ADMIN_EMAIL = 'shulesoft8@gmail.com';
export var PLATFORM_ADMIN_EMAIL = 'shulesoft8@gmail.com';

// ── Master Registry of ALL System Modules ────────────────────────────────
// Migrated from SettingsTab.jsx to break circularity.
export var ALL_SYSTEM_MODULES = [
  // ── Core Management ──
  { slug: 'student_mgmt',   label: 'Student Management',          icon: UsersIcon,       desc: 'Student profiles, enrolment, class assignment' },
  { slug: 'staff_mgmt',     label: 'Staff Management',            icon: TeacherIcon,     desc: 'Teacher & admin records, roles, permissions' },
  { slug: 'attendance',      label: 'Attendance Tracking',         icon: AttendanceIcon,  desc: 'Daily class attendance register' },
  { slug: 'dashboard',       label: 'Dashboard & Analytics',       icon: ChartBarIcon,    desc: 'KPIs, charts, school overview at a glance' },
  // ── Academics ──
  { slug: 'grading',         label: 'Academic Grading & Reports',  icon: GradingIcon,     desc: 'CBC/8-4-4 report cards, competency scoring' },
  { slug: 'exams',           label: 'Exams & Results Sessions',    icon: GradingIcon,     desc: 'Formal exam session lifecycle, automated ranking' },
  { slug: 'cbc_reports',     label: 'CBC Report Cards (PP1–G9)',   icon: GradingIcon,     desc: 'CBC competency-based learner portfolios' },
  { slug: '844_reports',     label: 'KCSE / KCPE Report Cards',    icon: GradingIcon,     desc: '8-4-4 curriculum grading and report generation' },
  { slug: 'cbc_competency',  label: 'CBC Competency Grading',      icon: CheckIcon,       desc: 'Strand-level rubric scoring for CBC' },
  // ── Timetable ──
  // { slug: 'timetable',       label: 'Timetable Builder',           icon: TimetableIcon,   desc: 'Manual class schedule creation' },
  // ── Finance ──
  { slug: 'fees',            label: 'Fee & Billing Engine',        icon: FeesIcon,        desc: 'Student balances, payments, tracking' },
  { slug: 'fee_structure',   label: 'Fee Structure Builder',       icon: FeesIcon,        desc: 'Define per-class, per-term fee schedules' },
  { slug: 'fee_statements',  label: 'Student Fee Statements',      icon: ReceiptIcon,     desc: 'Printable per-student payment history' },
  { slug: 'mpesa',           label: 'M-Pesa STK Push',             icon: PhoneIcon,       desc: 'Zero-touch automated fee collection' },
  { slug: 'mpesa_paybill',   label: 'M-Pesa Paybill Integration',  icon: PhoneIcon,       desc: 'Lipa Na M-Pesa paybill reconciliation' },
  { slug: 'mpesa_receipts',  label: 'M-Pesa Receipt Generation',   icon: ReceiptIcon,     desc: 'Auto-generate payment receipts from M-Pesa' },
  { slug: 'airtel_money',    label: 'Airtel Money Integration',    icon: PhoneIcon,       desc: 'Airtel Money fee payment channel' },
  // ── Communications ──
  { slug: 'sms',             label: 'SMS & Communications',        icon: SendIcon,        desc: 'Bulk SMS, fee reminders' },
  { slug: 'parent_sms',      label: 'Parent SMS Notifications',    icon: SendIcon,        desc: 'Automated parent alerts for fees & reports' },
  { slug: 'whatsapp',        label: 'WhatsApp Fee Reminders',      icon: SendIcon,        desc: 'WhatsApp-based payment reminders' },
  // ── Learning ──
  { slug: 'lms',             label: 'E-Learning / LMS',            icon: BookIcon,        desc: 'Homework assignments, student submissions' },
  { slug: 'library',         label: 'Library Management',          icon: BookIcon,        desc: 'Book catalogue, borrowing, returns' },
  // ── Compliance & Export ──
  { slug: 'nemis',           label: 'NEMIS Data Export',            icon: FlagIcon,        desc: 'Ministry of Education compliance export' },
  { slug: 'bulk_import',     label: 'Bulk Student Import (CSV)',    icon: UploadIcon,      desc: 'Import students from spreadsheet files' },
  // ── Portals ──
  { slug: 'teacher_portal',  label: 'Teacher Mobile Portal',       icon: TeacherIcon,     desc: 'Mobile grading from personal devices' },
  { slug: 'parent_portal',   label: 'Parent & Student Portal',     icon: UsersIcon,       desc: 'Self-service portal for parents/students' },
  // ── Advanced ──
  { slug: 'analytics',       label: 'Smart Analytics & Insights',  icon: ChartBarIcon,    desc: 'Prediction, defaulter lists, trend alerts' },
  { slug: 'multi_stream',    label: 'Multi-Stream Support',        icon: SchoolIcon,      desc: 'A, B, C streams per class' },
  { slug: 'multi_period',    label: 'Multiple Academic Periods',   icon: CalendarIcon,    desc: 'Manage several terms/years simultaneously' },
  { slug: 'data_recovery',   label: 'Data Recovery Tools',         icon: RefreshIcon,     desc: 'Restore accidentally deleted records' },
  { slug: 'custom_brand',    label: 'Custom Branding',             icon: DiamondIcon,     desc: 'School logo, colors on reports' },
  { slug: 'api_access',      label: 'API Access',                  icon: PlatformZapIcon, desc: 'External system integrations' },
  { slug: 'priority_support',label: 'Priority Support',            icon: StarIcon,        desc: 'Dedicated account manager, fast response' },
];

/**
 * MODULE_LABELS mapping
 * Migrated from superAdminUtils.js to centrally serve UI displays.
 */
export var MODULE_LABELS = {
  student_mgmt:    'Student Management',
  staff_mgmt:      'Staff Management',
  attendance:      'Attendance Tracking',
  dashboard:       'Dashboard & Analytics',
  grading:         'Academic Grading & Reports',
  exams:           'Exams & Results',
  cbc_reports:     'CBC Report Cards (PP1–G9)',
  '844_reports':   'KCSE / KCPE Report Cards',
  cbc_competency:  'CBC Competency Grading',
  // timetable:       'Timetable Builder',
  fees:            'Fee & Billing Engine',
  fee_structure:   'Fee Structure Builder',
  fee_statements:  'Student Fee Statements',
  mpesa:           'M-Pesa STK Push',
  mpesa_paybill:   'M-Pesa Paybill Integration',
  mpesa_receipts:  'M-Pesa Receipt Generation',
  airtel_money:    'Airtel Money Integration',
  sms:             'SMS & Communications',
  parent_sms:      'Parent SMS Notifications',
  whatsapp:        'WhatsApp Fee Reminders',
  lms:             'E-Learning / LMS',
  library:         'Library Management',
  nemis:           'NEMIS Data Export',
  bulk_import:     'Bulk Student Import (CSV)',
  teacher_portal:  'Teacher Mobile Portal',
  parent_portal:   'Parent & Student Portal',
  analytics:       'Smart Analytics & Insights',
  multi_stream:    'Multi-Stream Support',
  multi_period:    'Multiple Academic Periods',
  data_recovery:   'Data Recovery Tools',
  custom_brand:    'Custom Branding',
  api_access:      'API Access',
};

export var FEATURE_SUGGESTIONS = [
  'CBC Report Cards (PP1–Grade 9)',
  'KCSE / KCPE Report Cards (8-4-4)',
  'M-PESA Paybill Integration',
  'Airtel Money Integration',
  'Student Fee Statements',
  'M-PESA Receipt Generation',
  // 'Timetable Builder',
  'NEMIS Data Export',
  'Attendance Tracking',
  'CBC Competency Grading',
  'Teacher Portal Access',
  'Parent SMS Notifications',
  'WhatsApp Fee Reminders',
  'Multi-Stream Support',
  'Multiple Academic Periods',
  'Staff Management',
  'Fee Structure Builder',
  'Data Recovery Tools',
  'Priority Support',
  'Custom Branding',
  'API Access',
  'Bulk Student Import (CSV)',
  'Library Management',
];

