declare module "nodemailer/lib/mail-composer" {
  import { Readable } from "stream";
  import Mail from "nodemailer/lib/mailer";

  export default class MailComposer {
    constructor(mail: Mail.Options);
    compile(): {
      build(callback: (err: Error | null, message: Buffer) => void): void;
    };
  }
}
