import {
    Banknote,
    Briefcase,
    Building2,
    Car,
    Coffee,
    Dumbbell,
    Fuel,
    Gamepad2,
    Gift,
    GraduationCap,
    HeartPulse,
    PawPrint,
    Plane,
    Repeat,
    Shirt,
    ShoppingBag,
    Smartphone,
    Sparkles,
    Store,
    Tag,
    TrendingUp,
    Utensils,
    Zap,
    type LucideIcon,
} from "lucide-react";

const RULES: [string[], LucideIcon][] = [
    [["alimenta", "mercado", "restaurante", "comida", "lanche", "padaria"], Utensils],
    [["transporte", "uber", "onibus", "metro"], Car],
    [["combust", "gasolina"], Fuel],
    [["moradia", "aluguel", "casa", "condominio"], Building2],
    [["saude", "farmacia", "medic"], HeartPulse],
    [["educa", "curso", "escola", "faculdade"], GraduationCap],
    [["lazer", "divers", "jogo"], Gamepad2],
    [["assinatura", "streaming"], Repeat],
    [["compra"], ShoppingBag],
    [["roupa", "vestuario"], Shirt],
    [["viagem"], Plane],
    [["presente"], Gift],
    [["pet"], PawPrint],
    [["academia", "esporte"], Dumbbell],
    [["cafe"], Coffee],
    [["celular", "telefone", "internet"], Smartphone],
    [["luz", "energia", "agua"], Zap],
    [["beleza", "estetica"], Sparkles],
    [["salario"], Banknote],
    [["servico", "freela"], Briefcase],
    [["venda"], Store],
    [["investimento", "rendimento"], TrendingUp],
];

export function categoryIcon(name: string): LucideIcon {
    const n = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const [keys, icon] of RULES) {
        if (keys.some((k) => n.includes(k))) return icon;
    }
    return Tag;
}