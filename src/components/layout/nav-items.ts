import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Tags,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile: boolean; // aparece na barra inferior?
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard, mobile: true },
  { href: "/lancamentos", label: "Lançamentos", icon: ArrowLeftRight, mobile: true },
  { href: "/contas", label: "Contas", icon: Wallet, mobile: true },
  { href: "/categorias", label: "Categorias", icon: Tags, mobile: false },
  { href: "/orcamentos", label: "Orçamentos", icon: PiggyBank, mobile: false },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, mobile: true },
  { href: "/configuracoes", label: "Ajustes", icon: Settings, mobile: true },
];