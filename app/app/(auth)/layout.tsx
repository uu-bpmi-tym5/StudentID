export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 grid-overlay" />

      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(ellipse, oklch(0.78 0.145 70 / 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">{children}</div>
    </div>
  );
}

