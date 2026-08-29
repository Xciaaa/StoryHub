import Logo from './Logo';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0c1324' }}>
      <div className="mesh-bg" />
      <div className="solid-card rounded-xl w-full max-w-md p-8 md:p-10 mx-4 relative z-10 flex flex-col items-center">
        <div className="mb-8 text-center w-full flex flex-col items-center">
          <div className="flex justify-center mb-4">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="font-headline-lg text-headline-lg text-white mb-2 tracking-wide">
            Lore Canvas
          </h1>
          {subtitle && <p className="font-body-md text-body-md text-gray-400">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
