import { Resend } from "resend";
import { env } from "@/lib/env";

let _resend: Resend | null = null

function getResend(): Resend {
    if (!_resend) {
        if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured")
        _resend = new Resend(env.RESEND_API_KEY)
    }
    return _resend
}

const FROM = "MixoGuide <noreply@mixoguide.com>";

// ─── Templates ────────────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#fbf9f6;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbf9f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7a5830,#bc9366);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-style:italic;color:#ffffff;letter-spacing:0.5px;">Mixoguide</p>
              <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">The Art of the Pour</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f0ece8;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9e9289;font-family:Arial,sans-serif;">
                &copy; ${new Date().getFullYear()} MixoGuide &mdash; All rights reserved.<br/>
                If you did not request this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td align="center">
      <a href="${href}"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7a5830,#bc9366);
                color:#ffffff;text-decoration:none;border-radius:999px;
                font-family:Arial,sans-serif;font-size:13px;font-weight:600;
                letter-spacing:1.5px;text-transform:uppercase;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

function fallbackLink(href: string): string {
    return `<p style="font-size:12px;color:#9e9289;font-family:Arial,sans-serif;text-align:center;word-break:break-all;margin-top:8px;">
  Or copy this link: <a href="${href}" style="color:#bc9366;">${href}</a>
</p>`;
}

// ─── Exported send functions ──────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, link: string) {
    const body = `
      <h1 style="margin:0 0 8px;font-size:22px;color:#1b1c1a;">Verify your email</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#4f453b;line-height:1.6;font-family:Arial,sans-serif;">
        Welcome to MixoGuide! Click the button below to verify your email address and activate your account.
        This link expires in <strong>15&nbsp;minutes</strong>.
      </p>
      ${ctaButton(link, "Verify my email")}
      ${fallbackLink(link)}
    `;

    await getResend().emails.send({
        from: FROM,
        to,
        subject: "Verify your MixoGuide account",
        html: baseTemplate("Verify your email", body),
        text: `Welcome to MixoGuide!\n\nVerify your email address by visiting the link below.\nThis link expires in 15 minutes.\n\n${link}\n\nIf you did not create an account, you can safely ignore this email.`,
    });
}

export async function sendSuggestionEmail(
    to: string,
    suggestion: {
        id: string
        type: string
        title: string
        content: string
        targetName?: string
        userName: string
    },
) {
    const typeLabels: Record<string, string> = {
        NEW_COCKTAIL:      'New cocktail',
        NEW_INGREDIENT:    'New ingredient',
        MODIFY_COCKTAIL:   'Modify cocktail',
        MODIFY_INGREDIENT: 'Modify ingredient',
    }
    const typeLabel = typeLabels[suggestion.type] ?? suggestion.type
    const reviewUrl = `${env.NEXTAUTH_URL}/admin/suggestions/view/${suggestion.id}`

    const body = `
      <h1 style="margin:0 0 8px;font-size:22px;color:#1b1c1a;">New suggestion received</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#4f453b;line-height:1.6;font-family:Arial,sans-serif;">
        <strong>${suggestion.userName}</strong> submitted a suggestion.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f1;border-radius:10px;padding:20px;margin-bottom:24px;">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#81756a;width:120px;">Type</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#1b1c1a;font-weight:600;">${typeLabel}</td>
        </tr>
        ${suggestion.targetName ? `
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#81756a;">Target</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#1b1c1a;">${suggestion.targetName}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#81756a;vertical-align:top;">Title</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#1b1c1a;">${suggestion.title}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#81756a;vertical-align:top;">Details</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#1b1c1a;white-space:pre-wrap;">${suggestion.content}</td>
        </tr>
      </table>

      ${ctaButton(reviewUrl, 'Review in admin panel')}
    `

    await getResend().emails.send({
        from: FROM,
        to,
        subject: `[MixoGuide] New suggestion — ${suggestion.title}`,
        html: baseTemplate('New suggestion', body),
        text: `New suggestion from ${suggestion.userName}\n\nType: ${typeLabel}\nTitle: ${suggestion.title}\n\n${suggestion.content}\n\nReview at: ${reviewUrl}`,
    })
}

export async function sendCollectionInviteEmail(params: {
    to: string
    hostName: string
    collectionTitle: string
    inviteUrl: string
    plannedFor: Date
    location?: string | null
}) {
    const { to, hostName, collectionTitle, inviteUrl, plannedFor, location } = params

    const formattedDate = plannedFor.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const showTime = plannedFor.getHours() !== 12 || plannedFor.getMinutes() !== 0
    const formattedTime = plannedFor.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })
    const whenLine = showTime ? `${formattedDate} at ${formattedTime}` : formattedDate

    const body = `
      <h1 style="margin:0 0 8px;font-size:22px;color:#1b1c1a;">You're invited!</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#4f453b;line-height:1.6;font-family:Arial,sans-serif;">
        <strong>${hostName}</strong> is hosting <strong>${collectionTitle}</strong> and would love for you to come.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f1;border-radius:10px;padding:20px;margin-bottom:24px;">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#81756a;width:90px;">When</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#1b1c1a;font-weight:600;">${whenLine}</td>
        </tr>
        ${location ? `
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#81756a;">Where</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#1b1c1a;">${location}</td>
        </tr>` : ''}
      </table>

      <p style="margin:0 0 8px;font-size:14px;color:#4f453b;line-height:1.6;font-family:Arial,sans-serif;">
        Open the invite to see the cocktail list and RSVP — no account needed.
      </p>
      ${ctaButton(inviteUrl, 'View invite & RSVP')}
      ${fallbackLink(inviteUrl)}
    `

    await getResend().emails.send({
        from: FROM,
        to,
        subject: `You're invited: ${collectionTitle}`,
        html: baseTemplate(`Invite — ${collectionTitle}`, body),
        text: `${hostName} invited you to ${collectionTitle}.\n\nWhen: ${whenLine}${location ? `\nWhere: ${location}` : ''}\n\nView the cocktail list and RSVP:\n${inviteUrl}`,
    })
}

export async function sendResetPasswordEmail(to: string, link: string) {
    const body = `
      <h1 style="margin:0 0 8px;font-size:22px;color:#1b1c1a;">Reset your password</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#4f453b;line-height:1.6;font-family:Arial,sans-serif;">
        We received a request to reset the password for your MixoGuide account.
        Click the button below to choose a new password.
        This link expires in <strong>15&nbsp;minutes</strong>.
      </p>
      ${ctaButton(link, "Reset my password")}
      ${fallbackLink(link)}
      <p style="margin:24px 0 0;font-size:13px;color:#9e9289;font-family:Arial,sans-serif;text-align:center;">
        Didn&rsquo;t request this? No action is needed &mdash; your password remains unchanged.
      </p>
    `;

    await getResend().emails.send({
        from: FROM,
        to,
        subject: "Your MixoGuide password reset link",
        html: baseTemplate("Reset your password", body),
        text: `MixoGuide — Password Reset\n\nWe received a request to reset your password.\nClick the link below to choose a new password. This link expires in 15 minutes.\n\n${link}\n\nIf you did not request this, no action is needed — your password remains unchanged.`,
    });
}
