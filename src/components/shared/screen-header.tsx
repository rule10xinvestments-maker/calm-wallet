type ScreenHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ScreenHeader({ eyebrow, title, description }: ScreenHeaderProps) {
  return (
    <header className="space-y-2">
      <p className="text-sm font-medium text-sky-700">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="text-sm leading-6 text-slate-500">{description}</p>
    </header>
  );
}
