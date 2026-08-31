interface LoginNotificationParams {
  loginTime: string;
  ipAddress: string;
  userAgent: string;
}

export const loginNotificationTemplate = ({
  loginTime,
  ipAddress,
  userAgent,
}: LoginNotificationParams): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
    <h2 style="color: #111827; margin-bottom: 4px;">New Login Detected</h2>
    <p style="color: #4b5563; font-size: 14px; margin-top: 0;">
      We noticed a new sign-in to your account. Here are the details:
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 140px;">Time</td>
        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${loginTime}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">IP Address</td>
        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${ipAddress}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Device / Browser</td>
        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${userAgent}</td>
      </tr>
    </table>

    <p style="color: #4b5563; font-size: 14px;">
      If this was you, no further action is needed.
    </p>
    <p style="color: #b91c1c; font-size: 14px;">
      If you don't recognize this activity, please secure your account immediately by resetting your password.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 12px;">
      This is an automated security notification. Please do not reply to this email.
    </p>
  </div>
`;