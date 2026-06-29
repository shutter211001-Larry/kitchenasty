import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/db.js';
import { translateFields } from '../lib/ai.js';

const execAsync = promisify(exec);

// ============================================================
// GET METRICS SUMMARY
// ============================================================

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const hours = Math.min(168, Math.max(1, parseInt(req.query.hours as string) || 24));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const metrics = await prisma.apiMetric.findMany({
    where: { createdAt: { gte: since } },
    select: {
      statusCode: true,
      responseTime: true,
      createdAt: true,
    },
  });

  const totalRequests = metrics.length;
  const avgResponseTime = totalRequests > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests)
    : 0;
  const errorCount = metrics.filter((m) => m.statusCode >= 500).length;
  const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : '0.00';

  const durationMinutes = hours * 60;
  const requestsPerMinute = totalRequests > 0 ? (totalRequests / durationMinutes).toFixed(2) : '0.00';

  // Hourly breakdown
  const hourlyMap = new Map<string, { count: number; errors: number; totalTime: number }>();
  for (const m of metrics) {
    const hour = new Date(m.createdAt);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    const existing = hourlyMap.get(key) || { count: 0, errors: 0, totalTime: 0 };
    existing.count++;
    if (m.statusCode >= 500) existing.errors++;
    existing.totalTime += m.responseTime;
    hourlyMap.set(key, existing);
  }

  const hourly = Array.from(hourlyMap.entries())
    .map(([hour, data]) => ({
      hour,
      requests: data.count,
      errors: data.errors,
      avgResponseTime: Math.round(data.totalTime / data.count),
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  res.json({
    success: true,
    data: {
      summary: {
        totalRequests,
        avgResponseTime,
        errorCount,
        errorRate: parseFloat(errorRate),
        requestsPerMinute: parseFloat(requestsPerMinute),
      },
      hourly,
    },
  });
}

// ============================================================
// GET ENDPOINT METRICS
// ============================================================

export async function getEndpointMetrics(req: Request, res: Response): Promise<void> {
  const hours = Math.min(168, Math.max(1, parseInt(req.query.hours as string) || 24));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const metrics = await prisma.apiMetric.findMany({
    where: { createdAt: { gte: since } },
    select: {
      method: true,
      path: true,
      statusCode: true,
      responseTime: true,
    },
  });

  // Aggregate by method+path
  const endpointMap = new Map<string, { method: string; path: string; times: number[]; errors: number }>();
  for (const m of metrics) {
    const key = `${m.method} ${m.path}`;
    const existing = endpointMap.get(key) || { method: m.method, path: m.path, times: [], errors: 0 };
    existing.times.push(m.responseTime);
    if (m.statusCode >= 500) existing.errors++;
    endpointMap.set(key, existing);
  }

  const endpoints = Array.from(endpointMap.values())
    .map((e) => {
      const sorted = e.times.sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      return {
        method: e.method,
        path: e.path,
        count: e.times.length,
        avgResponseTime: Math.round(e.times.reduce((s, t) => s + t, 0) / e.times.length),
        p95ResponseTime: sorted[p95Index] || 0,
        errors: e.errors,
      };
    })
    .sort((a, b) => b.count - a.count);

  res.json({ success: true, data: endpoints });
}

// ============================================================
// GET AUDIT LOGS
// ============================================================

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const entity = req.query.entity as string | undefined;
  const action = req.query.action as string | undefined;
  const search = req.query.search as string | undefined;

  const where: any = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (search) {
    where.OR = [
      { userEmail: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ============================================================
// DATABASE SYNC
// ============================================================

// ============================================================
// DATABASE SYNC
// ============================================================

export async function syncDatabase(req: Request, res: Response) {
  // Only SUPER_ADMIN allowed
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Permission denied' });
  }

  try {
    console.log('[Developer] Starting database sync (prisma db push)...');
    
    // Find schema.prisma path
    const possiblePaths = [
      path.resolve(process.cwd(), 'prisma/schema.prisma'),
      path.resolve(process.cwd(), '../../prisma/schema.prisma'),
      path.resolve(process.cwd(), '../../../prisma/schema.prisma'),
    ];
    
    let schemaPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        schemaPath = p;
        break;
      }
    }

    if (!schemaPath) {
      throw new Error('Could not find prisma/schema.prisma in any expected locations.');
    }

    console.log(`[Developer] Found schema at: ${schemaPath}`);
    const rootDir = path.dirname(path.dirname(schemaPath));

    let stdoutMain = '';
    let stderrMain = '';
    try {
      const resMain = await execAsync(`npx prisma db push --schema="${schemaPath}"`, {
        cwd: rootDir,
      });
      stdoutMain = resMain.stdout;
      stderrMain = resMain.stderr;
      console.log('[Developer] Main Sync stdout:', stdoutMain);
      if (stderrMain) console.error('[Developer] Main Sync stderr:', stderrMain);
    } catch (mainErr: any) {
      console.error('[Developer] Main Sync failed:', mainErr);
      throw new Error(`Main schema sync failed: ${mainErr.message}`);
    }

    // Push shutter-erp schema if exists
    let shutterStdout = '';
    let shutterSchemaPath = '';
    const possibleShutterPaths = [
      path.resolve(process.cwd(), 'prisma/shutter-erp.prisma'),
      path.resolve(process.cwd(), '../../prisma/shutter-erp.prisma'),
      path.resolve(process.cwd(), '../../../prisma/shutter-erp.prisma'),
    ];
    for (const p of possibleShutterPaths) {
      if (fs.existsSync(p)) {
        shutterSchemaPath = p;
        break;
      }
    }

    if (shutterSchemaPath) {
      console.log(`[Developer] Found shutter-erp schema at: ${shutterSchemaPath}`);
      try {
        const resShutter = await execAsync(`npx prisma db push --schema="${shutterSchemaPath}"`, {
          cwd: rootDir,
        });
        shutterStdout = resShutter.stdout;
        console.log('[Developer] Shutter Sync stdout:', shutterStdout);
        if (resShutter.stderr) console.error('[Developer] Shutter Sync stderr:', resShutter.stderr);
      } catch (shutterErr: any) {
        console.error('[Developer] Shutter Sync failed:', shutterErr);
        throw new Error(`Shutter ERP schema sync failed: ${shutterErr.message}`);
      }
    }

    // Auto-seed ingredients if the Ingredient table is empty
    let seedDetails = '';
    if (shutterSchemaPath) {
      try {
        const erpPrisma = (await import('../shutter-erp/lib/prisma.js')).default;
        const count = await (erpPrisma as any).ingredient.count();
        console.log(`[Developer] Ingredient count in DB: ${count}`);
        if (count === 0) {
          console.log('[Developer] Ingredient table is empty. Seeding food data...');
          const seedScriptPath = path.resolve(rootDir, 'packages/server/scripts/shutter-erp/seedFoodData.ts');
          if (fs.existsSync(seedScriptPath)) {
            const seedRes = await execAsync(`npx tsx "${seedScriptPath}"`, {
              cwd: rootDir,
              env: {
                ...process.env,
                SHUTTER_ERP_DATABASE_URL: process.env.SHUTTER_ERP_DATABASE_URL || process.env.DATABASE_URL
              }
            });
            console.log('[Developer] Seed output:', seedRes.stdout);
            seedDetails = `\n\nAuto-seeded 2000+ Ingredients successfully!`;
          }
        }
      } catch (seedErr: any) {
        console.error('[Developer] Auto-seed failed:', seedErr);
        seedDetails = `\n\nAuto-seed failed: ${seedErr.message}`;
      }
    }

    res.json({ 
      success: true, 
      message: 'Database schemas synced successfully',
      details: `Main Schema:\n${stdoutMain}\n\nShutter ERP Schema:\n${shutterStdout}${seedDetails}`
    });
  } catch (err: any) {
    console.error('[Developer] Sync failed:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database sync failed',
      details: err.message
    });
  }
}

// ============================================================
// SYNC LOCALES (AI Auto-Translate)
// ============================================================

function flattenObject(ob: any): Record<string, string> {
  const toReturn: Record<string, string> = {};
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if (typeof ob[i] === 'object' && ob[i] !== null) {
      const flatObject = flattenObject(ob[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}

function unflattenObject(ob: Record<string, string>): any {
  const result: any = {};
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    const keys = i.split('.');
    keys.reduce((r, e, j) => {
      return r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 === j ? ob[i] : {}) : []);
    }, result);
  }
  return result;
}

export async function syncLocales(req: Request, res: Response): Promise<void> {
  try {
    const localesDir = path.resolve(__dirname, '../../../../storefront/src/i18n/locales');
    if (!fs.existsSync(localesDir)) {
      throw new Error(`Locales directory not found at ${localesDir}`);
    }

    const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
    
    // 1. Load all files and their flattened structures
    const fileContents: Record<string, Record<string, string>> = {};
    for (const file of files) {
      const lang = file.replace('.json', '');
      const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
      fileContents[lang] = flattenObject(content);
    }

    // 2. Build a global dictionary of all known keys
    const globalKeys = new Set<string>();
    for (const lang of Object.keys(fileContents)) {
      for (const key of Object.keys(fileContents[lang])) {
        globalKeys.add(key);
      }
    }

    const missingByLanguage: Record<string, string[]> = {};
    const allMissingKeys = new Set<string>();
    
    // Find missing keys for each language
    for (const lang of Object.keys(fileContents)) {
      missingByLanguage[lang] = [];
      const flat = fileContents[lang];
      for (const key of globalKeys) {
        if (flat[key] === undefined || flat[key] === null || flat[key] === '') {
          missingByLanguage[lang].push(key);
          allMissingKeys.add(key);
        }
      }
    }

    if (allMissingKeys.size === 0) {
      res.json({ success: true, message: 'All languages are already up to date.', updatedCount: 0 });
      return;
    }

    // 3. For every missing key, find the best source value to translate from
    const fieldsToTranslate: { key: string; value: string }[] = [];
    for (const key of allMissingKeys) {
      let bestValue = '';
      
      // Prioritize zh-TW, then en, then any first available language
      if (fileContents['zh-TW'] && fileContents['zh-TW'][key]) {
        bestValue = fileContents['zh-TW'][key];
      } else if (fileContents['en'] && fileContents['en'][key]) {
        bestValue = fileContents['en'][key];
      } else {
        for (const lang of Object.keys(fileContents)) {
          if (fileContents[lang][key]) {
            bestValue = fileContents[lang][key];
            break;
          }
        }
      }
      fieldsToTranslate.push({ key, value: bestValue });
    }

    const targetLanguages = Object.keys(fileContents);
    
    // Call AI
    const translatedFields = await translateFields(
      fieldsToTranslate, 
      targetLanguages, 
      'its original language (e.g. Traditional Chinese, English, or others)'
    );
    
    if (!translatedFields || Object.keys(translatedFields).length === 0) {
      throw new Error('AI translation returned empty result or failed.');
    }

    // 4. Merge back
    let updatedCount = 0;
    for (const lang of Object.keys(fileContents)) {
      const missingKeys = missingByLanguage[lang];
      if (missingKeys.length === 0) continue;

      const filepath = path.join(localesDir, `${lang}.json`);
      const flat = fileContents[lang];

      for (const key of missingKeys) {
        if (translatedFields[key] && translatedFields[key][lang]) {
          flat[key] = translatedFields[key][lang];
          updatedCount++;
        } else if (translatedFields[key] && translatedFields[key][lang.split('-')[0]]) {
          flat[key] = translatedFields[key][lang.split('-')[0]];
          updatedCount++;
        }
      }

      const newContent = unflattenObject(flat);
      fs.writeFileSync(filepath, JSON.stringify(newContent, null, 2) + '\n', 'utf8');
    }

    res.json({
      success: true,
      message: `Successfully synchronized locales. Translated ${updatedCount} missing values across ${targetLanguages.length} languages.`,
      updatedCount
    });
  } catch (error: any) {
    console.error('[Developer] Sync Locales failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
