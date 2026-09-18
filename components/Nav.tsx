import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/clients" className="text-lg font-semibold tracking-tight text-foreground">
          RenewalIQ
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/clients"
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Clients
          </Link>
          <Link
            href="/today"
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Today&apos;s Plate
          </Link>
        </nav>
      </div>
    </header>
  );
}
