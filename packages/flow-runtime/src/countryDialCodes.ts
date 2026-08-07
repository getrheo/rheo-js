/**
 * Curated ISO 3166-1 alpha-2 → E.164 dialing codes for phone_input.
 * Keep the list focused on common onboarding locales; hosts can still
 * type a national number when the country is present.
 */
export type CountryDialEntry = {
  code: string;
  dial: string;
  label: string;
};

export const COUNTRY_DIAL_ENTRIES: readonly CountryDialEntry[] = [
  { code: 'US', dial: '1', label: 'United States' },
  { code: 'CA', dial: '1', label: 'Canada' },
  { code: 'GB', dial: '44', label: 'United Kingdom' },
  { code: 'AU', dial: '61', label: 'Australia' },
  { code: 'NZ', dial: '64', label: 'New Zealand' },
  { code: 'IE', dial: '353', label: 'Ireland' },
  { code: 'DE', dial: '49', label: 'Germany' },
  { code: 'FR', dial: '33', label: 'France' },
  { code: 'ES', dial: '34', label: 'Spain' },
  { code: 'IT', dial: '39', label: 'Italy' },
  { code: 'PT', dial: '351', label: 'Portugal' },
  { code: 'NL', dial: '31', label: 'Netherlands' },
  { code: 'BE', dial: '32', label: 'Belgium' },
  { code: 'CH', dial: '41', label: 'Switzerland' },
  { code: 'AT', dial: '43', label: 'Austria' },
  { code: 'SE', dial: '46', label: 'Sweden' },
  { code: 'NO', dial: '47', label: 'Norway' },
  { code: 'DK', dial: '45', label: 'Denmark' },
  { code: 'FI', dial: '358', label: 'Finland' },
  { code: 'PL', dial: '48', label: 'Poland' },
  { code: 'CZ', dial: '420', label: 'Czechia' },
  { code: 'RO', dial: '40', label: 'Romania' },
  { code: 'HU', dial: '36', label: 'Hungary' },
  { code: 'GR', dial: '30', label: 'Greece' },
  { code: 'TR', dial: '90', label: 'Turkey' },
  { code: 'UA', dial: '380', label: 'Ukraine' },
  { code: 'RU', dial: '7', label: 'Russia' },
  { code: 'IN', dial: '91', label: 'India' },
  { code: 'PK', dial: '92', label: 'Pakistan' },
  { code: 'BD', dial: '880', label: 'Bangladesh' },
  { code: 'JP', dial: '81', label: 'Japan' },
  { code: 'KR', dial: '82', label: 'South Korea' },
  { code: 'CN', dial: '86', label: 'China' },
  { code: 'TW', dial: '886', label: 'Taiwan' },
  { code: 'HK', dial: '852', label: 'Hong Kong' },
  { code: 'SG', dial: '65', label: 'Singapore' },
  { code: 'MY', dial: '60', label: 'Malaysia' },
  { code: 'TH', dial: '66', label: 'Thailand' },
  { code: 'VN', dial: '84', label: 'Vietnam' },
  { code: 'PH', dial: '63', label: 'Philippines' },
  { code: 'ID', dial: '62', label: 'Indonesia' },
  { code: 'BR', dial: '55', label: 'Brazil' },
  { code: 'MX', dial: '52', label: 'Mexico' },
  { code: 'AR', dial: '54', label: 'Argentina' },
  { code: 'CL', dial: '56', label: 'Chile' },
  { code: 'CO', dial: '57', label: 'Colombia' },
  { code: 'PE', dial: '51', label: 'Peru' },
  { code: 'ZA', dial: '27', label: 'South Africa' },
  { code: 'NG', dial: '234', label: 'Nigeria' },
  { code: 'EG', dial: '20', label: 'Egypt' },
  { code: 'IL', dial: '972', label: 'Israel' },
  { code: 'AE', dial: '971', label: 'United Arab Emirates' },
  { code: 'SA', dial: '966', label: 'Saudi Arabia' },
] as const;

const byCode = new Map(COUNTRY_DIAL_ENTRIES.map((e) => [e.code, e]));

export const countryDialEntry = (code: string): CountryDialEntry | undefined =>
  byCode.get(code.toUpperCase());

export const filterCountryDialEntries = (
  allowed?: readonly string[],
): readonly CountryDialEntry[] => {
  if (!allowed || allowed.length === 0) return COUNTRY_DIAL_ENTRIES;
  const set = new Set(allowed.map((c) => c.toUpperCase()));
  return COUNTRY_DIAL_ENTRIES.filter((e) => set.has(e.code));
};
