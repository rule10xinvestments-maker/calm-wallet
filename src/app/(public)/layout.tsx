type PublicLayoutProps = {
  children: React.ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">{children}</div>;
}
