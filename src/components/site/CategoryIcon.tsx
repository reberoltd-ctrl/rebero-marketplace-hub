import {
  BatteryCharging, Cable, Camera, Cpu, Gamepad2, Headphones, Lamp, Laptop, Mouse, Package, Printer, Radio, Router, Smartphone, Tablet, Tv, Watch,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  BatteryCharging, Cable, Camera, Cpu, Gamepad2, Headphones, Lamp, Laptop, Mouse, Package, Printer, Radio, Router, Smartphone, Tablet, Tv, Watch,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Package;
  return <Icon className={className} aria-hidden="true" />;
}
