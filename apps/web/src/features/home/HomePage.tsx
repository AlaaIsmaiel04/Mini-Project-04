import { Link } from 'react-router-dom';
import { CareSymbol, InterfaceIcon } from '../../components/InterfaceIcon';
import { useLanguage } from '../preferences/LanguageProvider';
import './home.css';

function DestinationArrow() {
  return (
    <svg
      className="home-link-arrow"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

export function HomePage() {
  const { t } = useLanguage();
  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <h1 id="home-title">{t('A clearer path to your pharmacy.')}</h1>
          <p>
            {t(
              'Find a medicine, explore pharmacy duty schedules, or open your staff workspace. Start here with SmartShelf.',
            )}
          </p>
          <Link className="button home-primary" to="/search">
            <InterfaceIcon name="search" />
            {t('Find a medicine')}
            <DestinationArrow />
          </Link>
          <p className="home-access-note">
            {t('Medicine search and pharmacy browsing need no account.')}
          </p>
        </div>
        <CareSymbol />
      </section>

      <section
        className="home-directory"
        aria-labelledby="home-directory-title"
      >
        <span className="home-destination-icon">
          <InterfaceIcon name="pharmacy" />
        </span>
        <div>
          <h2 id="home-directory-title">{t('Know where to go.')}</h2>
          <p>
            {t(
              'Browse pharmacies by area, view duty schedules, and find an address or phone number.',
            )}
          </p>
        </div>
        <Link className="button button-secondary" to="/pharmacies">
          {t('Browse pharmacies')}
          <DestinationArrow />
        </Link>
      </section>

      <section className="home-staff" aria-labelledby="home-staff-title">
        <div>
          <h2 id="home-staff-title">
            {t('Your pharmacy workspace, in one place.')}
          </h2>
          <p>
            {t(
              'For pharmacy owners and pharmacists: sign in to access the tools available to your role.',
            )}
          </p>
        </div>
        <Link className="button" to="/login">
          <InterfaceIcon name="signin" />
          {t('Staff sign in')}
          <DestinationArrow />
        </Link>
      </section>
    </div>
  );
}
