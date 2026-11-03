import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { Role } from '@smartshelf/contracts';
import { useAuth } from '../features/auth/AuthProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { lazy, Suspense } from 'react';
import { OwnerPharmaciesPage } from '../features/owner/OwnerPharmaciesPage';
import { InventoryPage } from '../features/inventory/InventoryPage';

const InventoryPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import('../features/inventory/InventoryPreviewPage').then((module) => ({
        default: module.InventoryPreviewPage,
      })),
    )
  : null;

const OwnerPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import('../features/owner/OwnerPreviewPage').then((module) => ({
        default: module.OwnerPreviewPage,
      })),
    )
  : null;

function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return (
      <Navigate to={user.role === 'OWNER' ? '/owner' : '/pharmacist'} replace />
    );
  }

  return <Outlet />;
}

export function App() {
  const { user, signOut } = useAuth();

  return (
    <>
      <header>
        <h1>SmartShelf</h1>

        <nav aria-label="Main navigation">
          <ul>
            <li>
              <Link to="/">Medicine Search</Link>
            </li>

            <li>
              <Link to="/pharmacies">Pharmacies</Link>
            </li>

            {user?.role === 'OWNER' && (
              <li>
                <Link to="/owner">Owner dashboard</Link>
              </li>
            )}

            {user?.role === 'PHARMACIST' && (
              <>
                <li>
                  <Link to="/pharmacist">Dashboard</Link>
                </li>
                <li>
                  <Link to="/pharmacist/inventory">Inventory</Link>
                </li>
                <li>
                  <Link to="/pharmacist/profile">Profile & duty</Link>
                </li>
              </>
            )}

            {user ? (
              <li>
                <button type="button" className="nav-button" onClick={signOut}>
                  Sign out
                </button>
              </li>
            ) : (
              <li>
                <Link to="/login">Sign in</Link>
              </li>
            )}
          </ul>
        </nav>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <h2>Medicine Search</h2>
                <p>The medicine search page will appear here.</p>
              </>
            }
          />

          <Route path="/pharmacies" element={<h2>Pharmacies</h2>} />

          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireRole role="OWNER" />}>
            <Route path="/owner" element={<OwnerPharmaciesPage />} />
            <Route
              path="/owner/pharmacies/:pharmacyId/subscription"
              element={<OwnerPharmaciesPage />}
            />
          </Route>

          <Route element={<RequireRole role="PHARMACIST" />}>
            <Route path="/pharmacist" element={<h2>Pharmacist dashboard</h2>} />
            <Route path="/pharmacist/inventory" element={<InventoryPage />} />
            <Route
              path="/pharmacist/profile"
              element={<h2>Pharmacy profile & duty</h2>}
            />
          </Route>

          {InventoryPreviewPage && (
            <Route
              path="/dev/inventory"
              element={
                <Suspense fallback={<p role="status">Loading preview…</p>}>
                  <InventoryPreviewPage />
                </Suspense>
              }
            />
          )}

          {OwnerPreviewPage && (
            <Route
              path="/dev/owner"
              element={
                <Suspense fallback={<p role="status">Loading preview…</p>}>
                  <OwnerPreviewPage />
                </Suspense>
              }
            />
          )}

          <Route
            path="*"
            element={
              <>
                <h2>Page not found</h2>
                <Link to="/">Return to medicine search</Link>
              </>
            }
          />
        </Routes>
      </main>

      <footer>
        <p>SmartShelf — Team 2</p>
      </footer>
    </>
  );
}
