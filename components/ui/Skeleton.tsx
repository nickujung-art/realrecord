interface SkeletonProps {
  className?: string;
  variant?: "line" | "block" | "circle";
}

export function Skeleton({ className = "", variant = "block" }: SkeletonProps) {
  const base = "animate-pulse bg-slate-200";
  const variants = {
    line: "h-4 rounded-full",
    block: "rounded-xl",
    circle: "rounded-full",
  };
  return <div className={`${base} ${variants[variant]} ${className}`} />;
}
