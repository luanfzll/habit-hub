import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Recuperar senha · HabitHub" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
