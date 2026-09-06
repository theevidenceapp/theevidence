// email.service.ts

import { google } from "googleapis";
import MailComposer from "nodemailer/lib/mail-composer/index.js";

class EmailService {
  private readonly oauth2Client;
  private readonly gmail;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground",
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.gmail = google.gmail({
      version: "v1",
      auth: this.oauth2Client,
    });
  }

  private buildMessage(mail: MailComposer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      mail.compile().build((err, message) => {
        if (err) return reject(err);
        resolve(message);
      });
    });
  }

  async sendEmail(to: string, subject: string, htmlContent: string) {
    try {
      const mail = new MailComposer({
        from: `Evidence - Admin Login detected <${process.env.GOOGLE_EMAIL}>`,
        to,
        subject,
        html: htmlContent,
      });

      const message = await this.buildMessage(mail);

      const rawMessage = message
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const { data } = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: rawMessage,
        },
      });

      console.log("Email sent successfully:", data.id);

      return data;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}

export default new EmailService();
