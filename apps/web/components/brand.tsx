export const APP_NAME = "MTS Controle de Veículos Pro";
export const APP_TAGLINE = "Gestão profissional de veículos";

export function BrandVehicleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5.2 10.2 6.7 6.7A2.7 2.7 0 0 1 9.2 5h5.6a2.7 2.7 0 0 1 2.5 1.7l1.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.3 10h15.4A2.3 2.3 0 0 1 22 12.3v3.1a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 15.4v-3.1A2.3 2.3 0 0 1 4.3 10Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M4.3 10h15.4A2.3 2.3 0 0 1 22 12.3v3.1a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 15.4v-3.1A2.3 2.3 0 0 1 4.3 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 17v1.2M17.5 17v1.2M6.7 13.5h.01M17.3 13.5h.01M9.2 13.5h5.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
