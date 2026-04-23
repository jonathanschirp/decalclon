/** Continent groupings keyed by country name. */
const CONTINENT_MAP: Record<string, string> = {};

const CONTINENTS: Record<string, string[]> = {
  Europe: [
    'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium',
    'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Czechia',
    'Denmark', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Great Britain',
    'Greece', 'Hungary', 'Iceland', 'Ireland', 'Israel', 'Italy', 'Kosovo', 'Latvia',
    'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro',
    'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia',
    'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
    'Turkey', 'Ukraine', 'United Kingdom',
  ],
  Africa: [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
    'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', 'Congo', 'DR Congo',
    'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon',
    'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho',
    'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius',
    'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda',
    'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia',
    'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
    'Zambia', 'Zimbabwe',
  ],
  Asia: [
    'Afghanistan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China',
    'Chinese Taipei', 'Hong Kong', 'India', 'Indonesia', 'Iran', 'Iraq', 'Japan',
    'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia',
    'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan',
    'Palestine', 'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea',
    'Sri Lanka', 'Syria', 'Tajikistan', 'Thailand', 'Turkmenistan', 'United Arab Emirates',
    'Uzbekistan', 'Vietnam', 'Yemen',
  ],
  'North America': [
    'Antigua and Barbuda', 'Aruba', 'Bahamas', 'Barbados', 'Belize', 'Bermuda',
    'British Virgin Islands', 'Canada', 'Cayman Islands', 'Costa Rica', 'Cuba',
    'Dominica', 'Dominican Republic', 'El Salvador', 'Grenada', 'Guam', 'Guatemala',
    'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Puerto Rico',
    'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
    'Trinidad and Tobago', 'USA', 'Virgin Islands',
  ],
  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana',
    'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela',
  ],
  Oceania: [
    'American Samoa', 'Australia', 'Cook Islands', 'East Timor', 'Fiji', 'Kiribati',
    'Marshall Islands', 'Micronesia', 'Nauru', 'New Zealand', 'Palau',
    'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu',
  ],
};

for (const [continent, countries] of Object.entries(CONTINENTS)) {
  for (const c of countries) CONTINENT_MAP[c] = continent;
}

/** IOC / World Athletics country codes → full country name. */
const CODE_TO_NAME: Record<string, string> = {
  AFG: 'Afghanistan', ALB: 'Albania', ALG: 'Algeria', ASA: 'American Samoa', AND: 'Andorra',
  ANG: 'Angola', ANT: 'Antigua and Barbuda', ARG: 'Argentina', ARM: 'Armenia', ARU: 'Aruba',
  AUS: 'Australia', AUT: 'Austria', AZE: 'Azerbaijan', BAH: 'Bahamas', BRN: 'Bahrain',
  BAN: 'Bangladesh', BAR: 'Barbados', BLR: 'Belarus', BEL: 'Belgium', BIZ: 'Belize',
  BEN: 'Benin', BER: 'Bermuda', BHU: 'Bhutan', BOL: 'Bolivia', BIH: 'Bosnia and Herzegovina',
  BOT: 'Botswana', BRA: 'Brazil', IVB: 'British Virgin Islands', BRU: 'Brunei', BUL: 'Bulgaria',
  BUR: 'Burkina Faso', BDI: 'Burundi', CAM: 'Cambodia', CMR: 'Cameroon', CAN: 'Canada',
  CPV: 'Cape Verde', CAY: 'Cayman Islands', CAF: 'Central African Republic', CHA: 'Chad',
  CHI: 'Chile', CHN: 'China', TPE: 'Chinese Taipei', COL: 'Colombia', COM: 'Comoros',
  CGO: 'Congo', COK: 'Cook Islands', CRC: 'Costa Rica', CRO: 'Croatia', CUB: 'Cuba',
  CYP: 'Cyprus', CZE: 'Czech Republic', COD: 'DR Congo', DEN: 'Denmark', DJI: 'Djibouti',
  DMA: 'Dominica', DOM: 'Dominican Republic', TLS: 'East Timor', ECU: 'Ecuador', EGY: 'Egypt',
  ESA: 'El Salvador', GEQ: 'Equatorial Guinea', ERI: 'Eritrea', EST: 'Estonia', SWZ: 'Eswatini',
  ETH: 'Ethiopia', FIJ: 'Fiji', FIN: 'Finland', FRA: 'France', GAB: 'Gabon', GAM: 'Gambia',
  GEO: 'Georgia', GER: 'Germany', GHA: 'Ghana', GBR: 'Great Britain', GRE: 'Greece',
  GRN: 'Grenada', GUM: 'Guam', GUA: 'Guatemala', GUI: 'Guinea', GBS: 'Guinea-Bissau',
  GUY: 'Guyana', HAI: 'Haiti', HON: 'Honduras', HKG: 'Hong Kong', HUN: 'Hungary',
  ISL: 'Iceland', IND: 'India', INA: 'Indonesia', IRI: 'Iran', IRQ: 'Iraq', IRL: 'Ireland',
  ISR: 'Israel', ITA: 'Italy', CIV: 'Ivory Coast', JAM: 'Jamaica', JPN: 'Japan',
  JOR: 'Jordan', KAZ: 'Kazakhstan', KEN: 'Kenya', KIR: 'Kiribati', KOS: 'Kosovo',
  KUW: 'Kuwait', KGZ: 'Kyrgyzstan', LAO: 'Laos', LAT: 'Latvia', LBN: 'Lebanon',
  LES: 'Lesotho', LBR: 'Liberia', LBA: 'Libya', LIE: 'Liechtenstein', LTU: 'Lithuania',
  LUX: 'Luxembourg', MAD: 'Madagascar', MAW: 'Malawi', MAS: 'Malaysia', MDV: 'Maldives',
  MLI: 'Mali', MLT: 'Malta', MHL: 'Marshall Islands', MTN: 'Mauritania', MRI: 'Mauritius',
  MEX: 'Mexico', FSM: 'Micronesia', MDA: 'Moldova', MON: 'Monaco', MGL: 'Mongolia',
  MNE: 'Montenegro', MAR: 'Morocco', MOZ: 'Mozambique', MYA: 'Myanmar', NAM: 'Namibia',
  NRU: 'Nauru', NEP: 'Nepal', NED: 'Netherlands', NZL: 'New Zealand', NCA: 'Nicaragua',
  NIG: 'Niger', NGR: 'Nigeria', PRK: 'North Korea', MKD: 'North Macedonia', NOR: 'Norway',
  OMA: 'Oman', PAK: 'Pakistan', PLW: 'Palau', PLE: 'Palestine', PAN: 'Panama',
  PNG: 'Papua New Guinea', PAR: 'Paraguay', PER: 'Peru', PHI: 'Philippines', POL: 'Poland',
  POR: 'Portugal', PUR: 'Puerto Rico', QAT: 'Qatar', ROU: 'Romania', RUS: 'Russia',
  RWA: 'Rwanda', SKN: 'Saint Kitts and Nevis', LCA: 'Saint Lucia',
  VIN: 'Saint Vincent and the Grenadines', SAM: 'Samoa', SMR: 'San Marino',
  STP: 'Sao Tome and Principe', KSA: 'Saudi Arabia', SEN: 'Senegal', SRB: 'Serbia',
  SEY: 'Seychelles', SLE: 'Sierra Leone', SGP: 'Singapore', SVK: 'Slovakia', SLO: 'Slovenia',
  SOL: 'Solomon Islands', SOM: 'Somalia', RSA: 'South Africa', KOR: 'South Korea',
  SSD: 'South Sudan', ESP: 'Spain', SRI: 'Sri Lanka', SUD: 'Sudan', SUR: 'Suriname',
  SWE: 'Sweden', SUI: 'Switzerland', SYR: 'Syria', TJK: 'Tajikistan', TAN: 'Tanzania',
  THA: 'Thailand', TOG: 'Togo', TGA: 'Tonga', TTO: 'Trinidad and Tobago', TUN: 'Tunisia',
  TUR: 'Turkey', TKM: 'Turkmenistan', TUV: 'Tuvalu', USA: 'USA', UGA: 'Uganda',
  UKR: 'Ukraine', UAE: 'United Arab Emirates', GBR2: 'United Kingdom', URU: 'Uruguay',
  UZB: 'Uzbekistan', VAN: 'Vanuatu', VEN: 'Venezuela', VIE: 'Vietnam', ISV: 'Virgin Islands',
  YEM: 'Yemen', ZAM: 'Zambia', ZIM: 'Zimbabwe',
};

// Also index continent map by code
for (const [code, name] of Object.entries(CODE_TO_NAME)) {
  const continent = CONTINENT_MAP[name];
  if (continent) CONTINENT_MAP[code] = continent;
}

/** Get the continent for a country name or IOC code, or undefined if unknown. */
export function getContinent(country: string): string | undefined {
  return CONTINENT_MAP[country];
}

/** Resolve a country code to its full name (returns the input if not a known code). */
export function resolveCountryName(codeOrName: string): string {
  return CODE_TO_NAME[codeOrName] ?? codeOrName;
}

/** IOC/common country names used in World Athletics, sorted alphabetically. */
export const COUNTRIES: string[] = [
  'Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola',
  'Antigua and Barbuda', 'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
  'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'British Virgin Islands',
  'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Cayman Islands', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Chinese Taipei', 'Colombia', 'Comoros', 'Congo',
  'Cook Islands', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Czechia', 'DR Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Great Britain',
  'Greece', 'Grenada', 'Guam', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives',
  'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
  'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Puerto Rico', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan',
  'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Tajikistan', 'Tanzania',
  'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'USA', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Venezuela', 'Vietnam', 'Virgin Islands', 'Yemen', 'Zambia', 'Zimbabwe',
];
