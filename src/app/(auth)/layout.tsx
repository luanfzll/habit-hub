import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <Link href="/" aria-label="HabitHub" className="self-center">
        <Wordmark className="text-xl" />
      </Link>
      <div className="rounded-[1.75rem] bg-card p-6 sm:p-8">{children}</div>
    </main>
  );
}
