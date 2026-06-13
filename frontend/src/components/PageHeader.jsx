export default function PageHeader({ title, description }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
      {description && <p className="mt-2 text-[rgb(var(--text-muted))]">{description}</p>}
    </header>
  );
}
