import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, PiggyBank, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ProfileForm } from "./profile-form";

const SHORTCUTS = [
  { href: "/categorias", label: "Categorias", description: "Crie, edite e escolha cores", icon: Tags },
  { href: "/orcamentos", label: "Orçamentos", description: "Defina limites mensais por categoria", icon: PiggyBank },
];

export async function SettingsContent() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name")
    .maybeSingle();

  if (error) console.error("configuracoes:", error.code, error.message);

  return (
    <div className="space-y-6">
      <ProfileForm fullName={profile?.full_name ?? ""} email={user?.email ?? ""} />

      <section>
        <h2 className="text-lg font-semibold">Atalhos</h2>
        <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {SHORTCUTS.map(({ href, label, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="block text-xs text-gray-500">{description}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Conta</h2>
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}