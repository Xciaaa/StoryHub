import Logo from './Logo';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-background text-on-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Lore Canvas</h1>
          {subtitle && <p className="text-on-surface-variant text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="glass rounded-xl p-6">
          {title && <h2 className="font-display text-lg font-medium mb-5">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
}
