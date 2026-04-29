interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-primary-600">{icon}</span>}
          <h2 className="text-[13px] font-bold text-gray-800 leading-none">{title}</h2>
        </div>
        {subtitle && (
          <p className="text-[11px] text-gray-500 mt-1 leading-none">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
