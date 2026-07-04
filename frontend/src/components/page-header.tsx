interface Props {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: Readonly<Props>) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
