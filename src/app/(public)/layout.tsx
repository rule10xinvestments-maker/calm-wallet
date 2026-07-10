import { LocaleProvider } from "@/components/i18n/locale-provider";

type PublicLayoutProps = {
  children: React.ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <LocaleProvider savedLocale={null}>
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">{children}</div>
    </LocaleProvider>
  );
}
