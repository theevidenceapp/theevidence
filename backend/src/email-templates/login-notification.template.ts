import juice from "juice";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

interface LoginNotificationParams {
  loginTime: string;
  ipAddress: string;
  userAgent: string;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch] as string,
  );

const require = createRequire(import.meta.url);

const bootstrapCss = fs.readFileSync(
  require.resolve("bootstrap/dist/css/bootstrap.min.css"),
  "utf-8",
);
const buildLoginNotificationMarkup = ({
  loginTime,
  ipAddress,
  userAgent,
}: LoginNotificationParams): string => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Sign-in Detected</title>
  </head>
  <body class="bg-light">
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-9 col-lg-7">

          <div class="bg-white rounded-3 shadow-sm overflow-hidden">

            <div class="d-flex justify-content-between align-items-center px-4 px-md-5 pt-4 pb-3 border-bottom border-2 border-dark">
              <span class="fs-4 fw-bold text-dark">The Evidence</span>
              <a href="#" class="fw-bold text-dark text-decoration-none small">Settings</a>
            </div>

            <div class="text-center px-4 px-md-5 py-5">

              <h1 class="fw-semibold text-dark mb-4">New sign-in detected</h1>

              <p class="text-secondary mb-1">
                We noticed a new sign-in to your Evidence admin account on a device that we
                don't recognize. If this wasn't you, we'll help you secure your account.
              </p>
              <p class="text-secondary mb-4">
                Click on the button below to review the account activity.
              </p>

              <table class="table table-borderless table-sm w-auto mx-auto text-start mb-4">
                <tbody>
                  <tr>
                    <td class="text-muted small pe-3">Time</td>
                    <td class="text-dark small fw-semibold">${escapeHtml(loginTime)}</td>
                  </tr>
                  <tr>
                    <td class="text-muted small pe-3">IP Address</td>
                    <td class="text-dark small fw-semibold">${escapeHtml(ipAddress)}</td>
                  </tr>
                  <tr>
                    <td class="text-muted small pe-3">Device / Browser</td>
                    <td class="text-dark small fw-semibold">${escapeHtml(userAgent)}</td>
                  </tr>
                </tbody>
              </table>

              <a href="#" class="btn btn-dark btn-lg px-4 py-3 fw-semibold mb-3">
                Secure my account
              </a>

              <p class="text-secondary small mb-0">
                Please ignore if this was done by you.
              </p>
            </div>
          </div>

          <div class="text-center px-4 py-4">
            <p class="text-muted small mb-2">
              You're receiving this email because we want to keep you updated about your
              Evidence admin account and prevent any security issues.
            </p>
            <p class="text-muted small mb-1">&copy; 2026. The Evidence. All rights reserved.</p>
            <p class="text-muted small mb-0">Gandhinagar, Gujarat, India</p>
          </div>

          <div class="d-flex justify-content-between align-items-center px-2 pt-3">
            <a href="#" class="text-muted small text-decoration-underline">Unsubscribe</a>
            <span class="text-muted small">Secured by The Evidence</span>
          </div>

        </div>
      </div>
    </div>
  </body>
  </html>
`;

export const loginNotificationTemplate = (
  params: LoginNotificationParams,
): string => {
  const rawHtml = buildLoginNotificationMarkup(params);

  return juice.inlineContent(rawHtml, bootstrapCss, {
    removeStyleTags: true,
    preserveMediaQueries: true,
    applyStyleTags: true,
    xmlMode: false,
  });
};
