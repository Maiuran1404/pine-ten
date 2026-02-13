import { colors, fonts, spacing, radii, logoUrl, figureLogoUrl, appUrl, appName } from './constants'

/**
 * User-facing email wrapper with branded header, white card body, and footer.
 */
export function wrapUserEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${appName()}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${colors.bodyBg};font-family:${fonts.stack};">
  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${colors.bodyBg};">
    <tr>
      <td align="center" style="padding:${spacing.xxl}px ${spacing.md}px;">
        <!-- Card container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${colors.cardBg};border-radius:${radii.lg};box-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:${spacing.xl}px ${spacing.xxl}px ${spacing.lg}px;border-bottom:1px solid ${colors.borderLight};">
              <img src="${logoUrl()}" alt="${appName()}" width="120" height="auto" style="display:block;max-width:120px;height:auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:${spacing.xxl}px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:${spacing.lg}px ${spacing.xxl}px;border-top:1px solid ${colors.borderLight};text-align:center;">
              <p style="margin:0 0 ${spacing.xs}px;font-family:${fonts.stack};font-size:13px;line-height:1.5;color:${colors.textMuted};">
                ${appName()} &middot; <a href="${appUrl()}" style="color:${colors.textMuted};text-decoration:underline;">getcrafted.ai</a>
              </p>
              <p style="margin:0;font-family:${fonts.stack};font-size:12px;line-height:1.5;color:${colors.textMuted};">
                <a href="${appUrl()}/unsubscribe" style="color:${colors.textMuted};text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${appUrl()}/privacy" style="color:${colors.textMuted};text-decoration:underline;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Admin email wrapper with forest-green header and compact layout.
 */
export function wrapAdminEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${appName()} Admin</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0; padding: 0; width: 100% !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${colors.bodyBg};font-family:${fonts.stack};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${colors.bodyBg};">
    <tr>
      <td align="center" style="padding:${spacing.xl}px ${spacing.md}px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${colors.cardBg};border-radius:${radii.lg};box-shadow:0 1px 3px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Admin header -->
          <tr>
            <td style="padding:${spacing.md}px ${spacing.lg}px;background-color:${colors.dark};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:${spacing.sm}px;">
                    <img src="${figureLogoUrl()}" alt="" width="24" height="24" style="display:block;filter:brightness(0) invert(1);" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:${fonts.stack};font-size:15px;font-weight:600;color:#ffffff;letter-spacing:0.02em;">${appName()} Admin</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:${spacing.xl}px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:${spacing.md}px ${spacing.xl}px;border-top:1px solid ${colors.borderLight};text-align:center;">
              <p style="margin:0;font-family:${fonts.stack};font-size:12px;color:${colors.textMuted};">
                Automated notification from ${appName()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
