export type ServiceKind = 'government' | 'private' | 'legal' | 'jobs' | 'finance' | 'education' | 'property';

export type ServiceCatalogItem = {
  id: string;
  name: string;
  kind: ServiceKind;
  country: string;
  priceMode: 'fixed' | 'benchmark-discount';
  active: boolean;
  requiresProfessional?: boolean;
  physicalVisit?: 'never' | 'sometimes' | 'required';
};

export const serviceCatalog: ServiceCatalogItem[] = [
  { id: 'resume', name: 'Resume Creation', kind: 'jobs', country: 'IN', priceMode: 'fixed', active: true },
  { id: 'job-search', name: 'Job Search', kind: 'jobs', country: 'IN', priceMode: 'fixed', active: true },
  { id: 'job-apply', name: 'Job Apply Help', kind: 'jobs', country: 'IN', priceMode: 'fixed', active: true },
  { id: 'job-watch', name: 'Job Vacancy Alerts', kind: 'jobs', country: 'IN', priceMode: 'fixed', active: true },
  { id: 'private-school', name: 'Private School Services', kind: 'education', country: 'IN', priceMode: 'benchmark-discount', active: true },
  { id: 'private-college', name: 'Private College Services', kind: 'education', country: 'IN', priceMode: 'benchmark-discount', active: true },
  { id: 'government-paperwork', name: 'Government Paperwork', kind: 'government', country: 'IN', priceMode: 'benchmark-discount', active: true },
  { id: 'affidavit', name: 'Affidavit Help', kind: 'legal', country: 'IN', priceMode: 'benchmark-discount', active: true, physicalVisit: 'sometimes' },
  { id: 'lawyer', name: 'Lawyer / Legal Help', kind: 'legal', country: 'IN', priceMode: 'fixed', active: true, requiresProfessional: true },
  { id: 'land', name: 'Land & Property Paperwork', kind: 'property', country: 'IN', priceMode: 'benchmark-discount', active: true, physicalVisit: 'sometimes' },
  { id: 'loan', name: 'Loan Assistance', kind: 'finance', country: 'IN', priceMode: 'fixed', active: true },
];

export type PricingInput = {
  benchmarkPrice?: number;
  fixedPrice?: number;
  discountPercent?: number;
};

export function calculateCustomerPrice(input: PricingInput): number {
  if (typeof input.fixedPrice === 'number') return Math.max(0, Math.round(input.fixedPrice));
  if (typeof input.benchmarkPrice === 'number') {
    const discount = Math.min(30, Math.max(0, input.discountPercent ?? 30));
    return Math.max(0, Math.round(input.benchmarkPrice * (1 - discount / 100)));
  }
  throw new Error('Pricing requires a verified benchmark or configured fixed price.');
}
