# ShuleSoft SuperAdmin Guide (Platform Owner)

As a platform owner, you have the central "Command Tower" access to monitor and manage the entire ShuleSoft ecosystem.

## 1. Accessing the Command Tower

Navigate to your workspace. If your email is on the `PLATFORM_ADMINS` list (defined in `App.jsx` and `Dashboard.jsx`), you will be automatically redirected to the **Super Admin** portal.

## 2. Platform Monitoring

### Dashboard Overview
- **Global Revenue**: View total income from all active school subscriptions.
- **Growth Trends**: Visualize student and school onboarding over time.
- **Active Schools**: Monitor the total count of schools currently using the platform.

### Schools Tab
This is your primary management interface.
- **Verification**: New schools appear here instantly after registration.
- **Status Management**:
  - **Activate**: Use this to manual confirm a school's payment and grant them access.
  - **Deactivate**: Use this for non-payment or policy violations.
  - **Terminate**: Permanent deletion (use with extreme caution).
- **NEMIS Support**: As a SuperAdmin, you can generate a **NEMIS-Ready CSV** for any school on their behalf. Use the "NEMIS Export" button in the school's context menu within the Schools tab.

## 3. Financial Management

### Payments Tab
- **Pending Approvals**: Review M-PESA transaction codes submitted by schools.
- **Verification**: Cross-reference the codes with your M-PESA Business/Paybill statement.
- **Approval**: Once verified, approve the payment to automatically update the school's expiry date.

## 4. Platform Configuration (Settings Tab)

- **Subscription Plans**: Edit prices and seat limits for Starter, Pro, and Elite tiers.
- **System Settings**: Update your organization name, M-PESA Paybill number, and support contact details.
- **App Update**: Provide links to the latest Android APK for mobile users.

## 5. User Support

### Password Resets
If a school administrator is locked out, you can reset their password via the database-level RPC (handled by the system when you initiate a reset request from the UI).

---
*Confidential: This document is for internal platform administrators only.*
