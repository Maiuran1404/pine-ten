"use client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen relative"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        backgroundColor: "#0a0a0a",
      }}
    >
      {children}
    </div>
  );
}
