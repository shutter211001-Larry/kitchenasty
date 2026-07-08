import { PrismaClient } from '@prisma/client';

export async function seedSystem(prisma: PrismaClient) {
  console.log('Seeding System Settings...');

  // Demo Tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { domain: 'demo.shutter.com' },
    update: {},
    create: {
      id: 'demo-tenant-id',
      name: '夏特示範餐廳',
      domain: 'demo.shutter.com',
      hasErpAccess: true,
      isActive: true,
    }
  });

  // Site settings
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteName: 'Saffron & Sage',
      siteTitle: 'Saffron & Sage — Modern Mediterranean Dining',
      storefrontTemplate: 'elegant',
      colorPrimary: '#d97706',
      colorSecondary: '#65a30d',
      darkMode: 'light',
      heroSection: {
        title: 'Modern Mediterranean, Rooted in Tradition',
        subtitle: 'Seasonal ingredients, bold flavors, and the warmth of the Mediterranean — brought to your table or your door.',
        backgroundImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=900&fit=crop',
        ctaPrimaryText: 'Explore Our Menu',
        ctaPrimaryLink: '/menu',
        ctaSecondaryText: 'Reserve a Table',
        ctaSecondaryLink: '/reservations',
      },
      featuresSection: [
        { icon: '🌿', title: 'Farm-to-Table', description: 'We partner with local farms for the freshest seasonal ingredients' },
        { icon: '🍂', title: 'Seasonal Specials', description: 'Our menu evolves with the seasons — there\'s always something new to discover' },
        { icon: '🚗', title: 'Dine In or Deliver', description: 'Enjoy our cuisine at the restaurant or have it delivered straight to your door' },
      ],
      ctaSection: {
        title: 'Ready to Experience Saffron & Sage?',
        description: 'Join us for an unforgettable Mediterranean dining experience — reserve a table or order online today.',
        buttonText: 'Order Now',
        buttonLink: '/menu',
      },
      lineSettings: {
        liffId: 'mock-liff-id',
        channelId: 'mock-channel-id',
      },
    },
  });

  // Legal pages
  await prisma.legalPage.upsert({
    where: { slug: 'privacy-policy' },
    update: {},
    create: {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      content: `# Privacy Policy\n\nWe value your privacy. This policy explains how Shutter collects, uses, and protects your personal information.\n\n## Information We Collect\n\n- **Account information**: name, email address, phone number\n- **Order information**: delivery addresses, order history, payment details\n- **Usage data**: cookies, browsing behavior, device information\n\n## How We Use Your Information\n\nWe use your information to process orders, improve our services, and communicate with you about promotions and updates.\n\n## Your Rights\n\nYou have the right to access, correct, or delete your personal data at any time by contacting us.\n\n## Contact\n\nIf you have questions about this policy, please email us at privacy@shutter.com.`,
    },
  });

  await prisma.legalPage.upsert({
    where: { slug: 'impressum' },
    update: {},
    create: {
      slug: 'impressum',
      title: 'Impressum',
      content: `# Impressum\n\n## Company Information\n\n**Shutter**\n123 Main Street\nSan Francisco, CA 94102\nUnited States\n\n**Email:** info@shutter.com\n**Phone:** (555) 123-4567\n\n## Responsible for Content\n\nShutter Management Team`,
    },
  });

  // Cookie categories
  const cookieCategories = [
    { name: 'essential', label: 'Essential Cookies', description: 'Required for the website to function properly. These cannot be disabled.', isRequired: true, sortOrder: 0 },
    { name: 'analytics', label: 'Analytics Cookies', description: 'Help us understand how visitors interact with our website.', isRequired: false, sortOrder: 1 },
    { name: 'marketing', label: 'Marketing Cookies', description: 'Used to deliver personalized advertisements and track campaigns.', isRequired: false, sortOrder: 2 },
  ];

  for (const cat of cookieCategories) {
    await prisma.cookieCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
}
