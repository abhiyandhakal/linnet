import { Outlet, createRootRoute } from "@tanstack/react-router";
import "../globals.css";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
          <p className="text-[var(--muted-ink)] mb-6">
            The page you're looking for doesn't exist.
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-[var(--ink)] text-[var(--paper)] rounded-lg hover:opacity-90 transition-opacity inline-block"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  },
});

function RootComponent() {
  return <Outlet />;
}
