export type InterfaceIconName =
  'search' | 'pharmacy' | 'dashboard' | 'inventory' | 'profile' | 'signin';

// One shared stroke family. Icons decorate existing text labels.
export function InterfaceIcon({ name }: { name: InterfaceIconName }) {
  return (
    <svg
      className="interface-icon"
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
      {name === 'search' && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </>
      )}
      {name === 'pharmacy' && (
        <>
          <path d="M4 21V7l8-4 8 4v14M2 21h20M9 21v-6h6v6M9 9h6M12 6v6" />
        </>
      )}
      {name === 'dashboard' && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </>
      )}
      {name === 'inventory' && (
        <>
          <path d="m12 2 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V7M12 12v10M7.5 4.5l9 5" />
        </>
      )}
      {name === 'profile' && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      )}
      {name === 'signin' && (
        <>
          <path d="M14 4h6v16h-6M3 12h12m-4-4 4 4-4 4" />
        </>
      )}
    </svg>
  );
}

export function CareSymbol() {
  return (
    <svg
      className="care-symbol"
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="90" cy="90" r="77" stroke="currentColor" strokeOpacity=".2" />
      <rect
        x="62"
        y="28"
        width="56"
        height="124"
        rx="28"
        transform="rotate(38 90 90)"
        fill="currentColor"
        fillOpacity=".12"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="m68 73 44 34" stroke="currentColor" strokeWidth="2" />
      <path
        d="M138 30v20m-10-10h20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="33" cy="132" r="6" fill="currentColor" />
    </svg>
  );
}
