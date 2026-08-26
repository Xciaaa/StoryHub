export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">{title}</h1>
        {subtitle && <p className="text-neutral-400 text-sm mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
