import React from "react";
import { Category } from "@/lib/types";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-secondary text-foreground",
  primary: "bg-primary-light text-primary",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  outline: "border border-border text-muted",
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

const categoryColors: Record<Category, BadgeVariant> = {
  Tech: "primary",
  Finance: "success",
  Healthcare: "danger",
  Consulting: "warning",
  Other: "default",
};

export function CategoryBadge({ category }: { category: Category }) {
  return <Badge variant={categoryColors[category]}>{category}</Badge>;
}

export function ScoreBadge({ score }: { score: number }) {
  // Don't render anything if score is missing or zero
  if (!score || score === 0) return null;
  
  // Convert score from 0-120 scale to 0-100 percentage
  const percentage = Math.round((score / 120) * 100);
  const variant = percentage >= 85 ? "success" : percentage >= 70 ? "warning" : "default";
  return <Badge variant={variant}>{percentage}% Match</Badge>;
}
