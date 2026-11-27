"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { NAV_ITEMS } from "./nav-items";
import { SignOutButton } from "./sign-out-button";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 md:flex">
      <BrandMark className="mb-5 px-3 py-2" />

      <Link
        href="/lancamentos/novo"
        className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
      >
        <Plus className="h-4 w-4" />
        Novo lançamento
      </Link>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <SignOutButton />
    </aside>
  );
}