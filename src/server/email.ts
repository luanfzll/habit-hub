import "server-only";
import nodemailer from "nodemailer";

export interface Email {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  send(email: Email): Promise<void>;
}

/** Development and tests: prints the e-mail (and its links) to the terminal. */
const consoleSender: EmailSender = {
  async send(email) {
    console.info(`\n[email] To: ${email.to}\n[email] Subject: ${email.subject}\n${email.text}\n`);
  },
};

function gmailSender(): EmailSender {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD are required when EMAIL_TRANSPORT=gmail");
  }
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });
  return {
    async send(email) {
      await transporter.sendMail({ from: `"HabitHub" <${user}>`, ...email });
    },
  };
}

export function createEmailSender(): EmailSender {
  return process.env.EMAIL_TRANSPORT === "gmail" ? gmailSender() : consoleSender;
}
