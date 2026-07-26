import Link from 'next/link';
import './globals.css';

/** Global 404 (for routes outside any locale). Renders its own document. */
export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <main className="section">
          <div className="container cta">
            <p className="eyebrow">404</p>
            <h1 className="h1">
              This page took a <em className="accent">pause</em>.
            </h1>
            <p className="lead cta__sub">We couldn&apos;t find what you were looking for.</p>
            <div className="cta__actions">
              <Link href="/en" className="btn btn-primary">
                Back home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
