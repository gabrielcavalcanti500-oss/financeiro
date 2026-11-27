"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";

type Item = (typeof NAV_ITEMS)[number];

function NavLink({ item, pathname }: { item: Item; pathname: string }) {
  const { href, label, icon: Icon } = item;
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex flex-col items-center gap-1 pb-2 pt-2 text-[11px] font-medium transition-colors ${active ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
        }`}
    >
      <span
        className={`flex h-8 w-16 items-center justify-center rounded-full transition-all duration-200 group-active:scale-95 ${active ? "bg-green-100 dark:bg-green-950" : "group-active:bg-gray-100 dark:group-active:bg-gray-800"
          }`}
      >
        <Icon className="h-5.5 w-5.5" strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  // Na tela de cadastro a barra some: o botão Salvar ocupa o rodapé.
  if (pathname.startsWith("/lancamentos/novo")) return null;

  const items = NAV_ITEMS.filter((i) => i.mobile);
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200/70 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/85 md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch px-1">
        {left.map((item) => (
          <li key={item.href} className="flex-1">
            <NavLink item={item} pathname={pathname} />
          </li>
        ))}

        <li className="flex flex-1 justify-center">
          <Link
            href="/lancamentos/novo"
            aria-label="Novo lançamento"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg shadow-green-900/25 ring-4 ring-white transition active:scale-95 dark:ring-gray-900"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </Link>
        </li>

        {right.map((item) => (
          <li key={item.href} className="flex-1">
            <NavLink item={item} pathname={pathname} />
          </li>
        ))}
      </ul>
    </nav>
  );
}