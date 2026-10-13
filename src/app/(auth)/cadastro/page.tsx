import type { Metadata } from "next";
import { CredentialsForm } from "../credentials-form";

export const metadata: Metadata = { title: "Criar conta · HabitHub" };

export default function SignUpPage() {
  return <CredentialsForm mode="sign-up" />;
}
