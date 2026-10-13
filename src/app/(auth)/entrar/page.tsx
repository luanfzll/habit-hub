import type { Metadata } from "next";
import { CredentialsForm } from "../credentials-form";

export const metadata: Metadata = { title: "Entrar · HabitHub" };

export default function SignInPage() {
  return <CredentialsForm mode="sign-in" />;
}
