import type { ReactNode } from "react";

export function GlassPanel({
  children,
  className = "",
  variant = "default"
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "active" | "warning" | "danger";
}) {
  const variantClass = {
    default: "panel",
    elevated: "panel-elevated",
    active: "panel-active",
    warning: "panel-warning",
    danger: "panel-danger"
  }[variant];

  return <div className={`${variantClass} ${className}`}>{children}</div>;
}
