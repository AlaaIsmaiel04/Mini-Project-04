import DashboardPage from '../features/dashboard/DashboardPage';
import { PharmacyProfilePage } from '../features/pharmacy/PharmacyProfilePage';
import { useLanguage } from '../features/preferences/LanguageProvider';
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { Role } from '@smartshelf/contracts';
import { useAuth } from '../features/auth/AuthProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { lazy, Suspense } from 'react';
import { OwnerPharmaciesPage } from '../features/owner/OwnerPharmaciesPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { AppShell } from '../components/AppShell';

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
    return <Navigate to="/login" replace state={{ signInRequired: true }} />;
  }

  if (user.role !== role) {
    return (
      <Navigate to={user.role === 'OWNER' ? '/owner' : '/pharmacist'} replace />
    );
  }

  return <Outlet />;
}

export function App() {
  const { t } = useLanguage();
  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <h2>{t('Medicine Search')}</h2>
              <p>{t('The medicine search page will appear here.')}</p>
            </>
          }
        />

        <Route path="/pharmacies" element={<h2>{t('Pharmacies')}</h2>} />

        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireRole role="OWNER" />}>
          <Route path="/owner" element={<OwnerPharmaciesPage />} />
          <Route
            path="/owner/pharmacies/:pharmacyId/subscription"
            element={<OwnerPharmaciesPage />}
          />
        </Route>

        <Route element={<RequireRole role="PHARMACIST" />}>
          <Route path="/pharmacist" element={<DashboardPage />} />
          <Route path="/pharmacist/inventory" element={<InventoryPage />} />
          <Route path="/pharmacist/profile" element={<PharmacyProfilePage />} />
        </Route>

        {InventoryPreviewPage && (
          <Route
            path="/dev/inventory"
            element={
              <Suspense fallback={<p role="status">{t('Loading preview…')}</p>}>
                <InventoryPreviewPage />
              </Suspense>
            }
          />
        )}

        {OwnerPreviewPage && (
          <Route
            path="/dev/owner"
            element={
              <Suspense fallback={<p role="status">{t('Loading preview…')}</p>}>
                <OwnerPreviewPage />
              </Suspense>
            }
          />
        )}

        <Route
          path="*"
          element={
            <>
              <h2>{t('Page not found')}</h2>
              <Link to="/">{t('Return to medicine search')}</Link>
            </>
          }
        />
      </Routes>
    </AppShell>
  );
}
