import { useLanguage } from '../features/preferences/LanguageProvider';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { LanguageControl } from '../features/preferences/LanguageControl';
import { InterfaceIcon } from './InterfaceIcon';

export function Brand() {
  const { t } = useLanguage();
  return (
    <Link to="/" className="brand" aria-label={t('SmartShelf home')} dir="ltr">
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="currentColor"
      >
        <path d="M8 1h6v7h7v6h-7v7H8v-7H1V8h7z" />
      </svg>
      <span>SmartShelf</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const preview =
    import.meta.env.DEV && ['/dev/owner', '/dev/inventory'].includes(pathname);
  const workspace =
    pathname.startsWith('/owner') ||
    pathname.startsWith('/pharmacist') ||
    preview;
  const owner = user?.role === 'OWNER' || pathname === '/dev/owner';
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const navigation = (
    <>
      {user?.role === 'OWNER' && (
        <li>
          <NavLink to="/owner">
            <InterfaceIcon name="dashboard" />
            {t('Owner dashboard')}
          </NavLink>
        </li>
      )}
      {user?.role === 'PHARMACIST' && (
        <>
          <li>
            <NavLink to="/pharmacist" end>
              <InterfaceIcon name="dashboard" />
              {t('Dashboard')}
            </NavLink>
          </li>
          <li>
            <NavLink to="/pharmacist/inventory">
              <InterfaceIcon name="inventory" />
              {t('Inventory')}
            </NavLink>
          </li>
          <li>
            <NavLink to="/pharmacist/profile">
              <InterfaceIcon name="profile" />
              {t('Profile & duty')}
            </NavLink>
          </li>
        </>
      )}
      {preview && (
        <li>
          <NavLink to={pathname}>
            <InterfaceIcon name={owner ? 'dashboard' : 'inventory'} />
            {owner ? t('Owner workspace') : t('Inventory')}
          </NavLink>
        </li>
      )}
      <li>
        <NavLink to="/" end>
          <InterfaceIcon name="home" />
          {t('Home')}
        </NavLink>
      </li>
      <li>
        <NavLink to="/search">
          <InterfaceIcon name="search" />
          {t('Medicine Search')}
        </NavLink>
      </li>
      <li>
        <NavLink to="/pharmacies">
          <InterfaceIcon name="pharmacy" />
          {t('Pharmacies')}
        </NavLink>
      </li>
      {!user && (
        <li>
          <NavLink to="/login">
            <InterfaceIcon name="signin" />
            {t('Sign in')}
          </NavLink>
        </li>
      )}
    </>
  );
  return (
    <div
      className={`app-shell ${workspace ? 'workspace-shell' : 'public-shell'}`}
    >
      <a className="skip-link" href="#main-content">
        {t('Skip to content')}
      </a>
      {workspace && (
        <aside className="workspace-sidebar">
          <div className="sidebar-brand">
            <Brand />
            <button
              ref={toggle}
              className="menu-toggle"
              type="button"
              aria-label={t('Toggle navigation')}
              aria-expanded={menuOpen}
              aria-controls="workspace-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>{' '}
              {t('Menu')}
            </button>
          </div>
          <nav
            id="workspace-navigation"
            aria-label={t('Main navigation')}
            className={menuOpen ? 'workspace-nav is-open' : 'workspace-nav'}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a'))
                setMenuOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setMenuOpen(false);
                toggle.current?.focus();
              }
            }}
          >
            <p className="nav-label">{t('Your workspace')}</p>
            <ul>{navigation}</ul>
            <div className="sidebar-message">
              <strong>
                {t('Safer shelves.')}
                <br />
                {t('Every day.')}
              </strong>
              <p>
                {t('Review stock and expiry dates before your next shift.')}
              </p>
            </div>
            <div className="sidebar-identity">
              <strong>
                {preview
                  ? t('Sample workspace')
                  : owner
                    ? t('Platform owner')
                    : t('Pharmacist')}
              </strong>
              {user && (
                <>
                  <p dir="ltr">{user.email}</p>
                  <button type="button" onClick={signOut}>
                    {t('Sign out')}
                  </button>
                </>
              )}
            </div>
          </nav>
        </aside>
      )}
      <div className="app-body">
        <header className="app-topbar">
          {workspace ? (
            <>
              <span>
                {owner ? t('Platform management') : t('Pharmacy workspace')}
              </span>
              <LanguageControl />
            </>
          ) : (
            <>
              <Brand />
              <LanguageControl />
              <nav aria-label={t('Main navigation')}>
                <ul>{navigation}</ul>
              </nav>
              {user && (
                <button type="button" onClick={signOut}>
                  {t('Sign out')}
                </button>
              )}
            </>
          )}
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={pathname === '/login' ? 'app-main login-main' : 'app-main'}
        >
          {children}
        </main>
        <footer className="app-footer">
          <span>{t('SmartShelf — Team 2')}</span>
          <span>{t('Pharmacy management & medicine search')}</span>
        </footer>
      </div>
    </div>
  );
}
