export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background blobs — FlowPay palette */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#6C5CE7]/18 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#A29BFE]/12 blur-3xl animate-float delay-2s" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#6C5CE7]/8 blur-3xl animate-pulse-glow" />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025] auth-grid" />

      <div className="relative z-10 w-full max-w-md mx-auto px-6 py-12">
        {children}
      </div>
    </div>
  );
}
