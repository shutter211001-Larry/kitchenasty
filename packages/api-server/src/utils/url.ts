export interface TenantUrls {
  storeUrl: string;
  adminUrl: string;
  erpUrl: string;
}

/**
 * Resolves the appropriate frontend URLs for a given tenant domain.
 * Supports custom SaaS base domains via process.env.SAAS_BASE_DOMAIN (e.g. 'pizzastudio26.com')
 * Fallbacks to legacy shutterorder.pro if no env var is set, or if the tenant uses standard generic subdomains.
 *
 * Examples:
 * tenantDomain = 'demo.pizzastudio26.com', SAAS_BASE_DOMAIN = 'pizzastudio26.com'
 * -> storeUrl: https://demo.store.pizzastudio26.com
 * -> adminUrl: https://demo.admin.pizzastudio26.com
 * -> erpUrl:   https://demo.erp.pizzastudio26.com
 *
 * tenantDomain = 'my-restaurant.com' (Custom domain)
 * -> storeUrl: https://my-restaurant.com
 * -> adminUrl: https://admin.my-restaurant.com
 * -> erpUrl:   https://erp.my-restaurant.com
 */
export function getTenantUrls(tenantDomain: string | null, protocol = 'https'): TenantUrls {
  if (!tenantDomain) {
    return {
      storeUrl: process.env.STORE_URL_PUBLIC || 'http://localhost:5174',
      adminUrl: process.env.ADMIN_URL_PUBLIC || 'http://localhost:5173',
      erpUrl: process.env.ERP_URL_PUBLIC || 'http://localhost:5175',
    };
  }

  // 1. Determine the active SaaS base domain, fallback to legacy shutterorder.pro
  const baseDomain = process.env.SAAS_BASE_DOMAIN || 'shutterorder.pro';

  // 2. Check if the tenant domain is a subdomain of our SaaS base domain
  if (tenantDomain.endsWith(`.${baseDomain}`)) {
    const subdomain = tenantDomain.replace(`.${baseDomain}`, '');
    return {
      storeUrl: `${protocol}://${subdomain}.store.${baseDomain}`,
      adminUrl: `${protocol}://${subdomain}.admin.${baseDomain}`,
      erpUrl: `${protocol}://${subdomain}.erp.${baseDomain}`,
    };
  }

  // 3. Custom domain handling
  return {
    storeUrl: `${protocol}://${tenantDomain}`,
    adminUrl: `${protocol}://admin.${tenantDomain}`,
    erpUrl: `${protocol}://erp.${tenantDomain}`,
  };
}

/**
 * Normalizes a requested hostname to find the core tenant domain.
 * Useful in middleware to map 'demo.admin.pizzastudio26.com' back to 'demo.pizzastudio26.com'
 */
export function resolveTenantDomain(hostname: string): string {
  if (!hostname || hostname === 'localhost') return hostname;

  const baseDomain = process.env.SAAS_BASE_DOMAIN || 'shutterorder.pro';

  // Check if it's hitting our SaaS platform subdomains
  if (hostname.endsWith(`.${baseDomain}`)) {
    // e.g. demo.admin.pizzastudio26.com
    const parts = hostname.split('.');
    
    // If it has at least 4 parts: [subdomain, appType, baseDomainPart1, baseDomainPart2]
    // Note: baseDomain could have multiple parts, let's do a safer string replace
    
    // Match pattern: {subdomain}.admin.{baseDomain} or {subdomain}.store.{baseDomain}
    const adminSuffix = `.admin.${baseDomain}`;
    if (hostname.endsWith(adminSuffix)) {
      const subdomain = hostname.replace(adminSuffix, '');
      return `${subdomain}.${baseDomain}`;
    }

    const storeSuffix = `.store.${baseDomain}`;
    if (hostname.endsWith(storeSuffix)) {
      const subdomain = hostname.replace(storeSuffix, '');
      return `${subdomain}.${baseDomain}`;
    }
    
    const erpSuffix = `.erp.${baseDomain}`;
    if (hostname.endsWith(erpSuffix)) {
      const subdomain = hostname.replace(erpSuffix, '');
      return `${subdomain}.${baseDomain}`;
    }
    
    // If it's just demo.pizzastudio26.com, it is already the tenant domain
    return hostname;
  }

  // Custom domain: if someone hits admin.my-restaurant.com, they map to my-restaurant.com
  if (hostname.startsWith('admin.') || hostname.startsWith('store.') || hostname.startsWith('erp.')) {
    const parts = hostname.split('.');
    parts.shift(); // remove 'admin'
    return parts.join('.');
  }

  return hostname;
}
