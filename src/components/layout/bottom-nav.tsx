"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200/70 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/85 md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch px-1">
        {NAV_ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-1 pb-2 pt-2 text-[11px] font-medium transition-colors ${
                  active ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <span
                  className={`flex h-8 w-16 items-center justify-center rounded-full transition-all duration-200 group-active:scale-95 ${
                    active
                      ? "bg-green-100 dark:bg-green-950"
                      : "group-active:bg-gray-100 dark:group-active:bg-gray-800"
                  }`}
                >
                  <Icon className="h-5.5 w-5.5" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}