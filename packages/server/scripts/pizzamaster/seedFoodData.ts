import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { PrismaClient } from '@pizzamaster/client';
import { fileURLToPath } from 'url';

const connectionString = process.env.PIZZAMASTER_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString
    }
  }
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvFilePath = path.join(__dirname, '../../../data/20_2.csv');

interface FoodItem {
  name: string;
  category: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  sodium?: number;
  isAllergen: boolean;
  allergenType?: string;
}

const allergenKeywords: Record<string, string> = {
  '蝦': '甲殼類',
  '蟹': '甲殼類',
  '芒果': '芒果',
  '花生': '花生',
  '牛奶': '乳製品',
  '乳': '乳製品',
  '奶': '乳製品',
  '蛋': '蛋類',
  '堅果': '堅果類',
  '杏仁': '堅果類',
  '核桃': '堅果類',
  '芝麻': '芝麻',
  '麥': '含麩質之穀物',
  '麩質': '含麩質之穀物',
  '大豆': '大豆',
  '黃豆': '大豆',
  '魚': '魚類',
};

async function seed() {
  console.log('開始讀取食品資料庫...');
  
  const foodMap = new Map<string, FoodItem>();
  const parser = fs.createReadStream(csvFilePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
    })
  );

  for await (const record of parser) {
    const id = record['整合編號'];
    const name = record['樣品名稱'];
    const category = record['食品分類'];
    const nutrientName = record['分析項'];
    const valueStr = record['每100克含量'];
    const value = parseFloat(valueStr.replace(/,/g, '')) || 0;

    if (!foodMap.has(id)) {
      // Check for allergens in name
      let isAllergen = false;
      let allergenType = '';
      for (const [key, type] of Object.entries(allergenKeywords)) {
        if (name.includes(key)) {
          isAllergen = true;
          allergenType = type;
          break;
        }
      }

      foodMap.set(id, {
        name,
        category,
        isAllergen,
        allergenType,
      });
    }

    const item = foodMap.get(id)!;
    if (nutrientName.includes('熱量')) item.calories = value;
    else if (nutrientName.includes('蛋白質')) item.protein = value;
    else if (nutrientName.includes('脂肪') && !nutrientName.includes('酸')) item.fat = value; // Avoid fatty acids
    else if (nutrientName.includes('碳水化合物')) item.carbs = value;
    else if (nutrientName.includes('鈉')) item.sodium = value;
  }

  // Add plain water (水) as a basic default ingredient since it's not in the analyzed foods CSV dataset!
  const waterId = "WATER_DEFAULT";
  if (!foodMap.has(waterId)) {
    foodMap.set(waterId, {
      name: '水',
      category: '其他',
      isAllergen: false,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      sodium: 0,
    });
  }

  console.log(`解析完成，共 ${foodMap.size} 項食品。開始匯入資料庫...`);
  
  await prisma.ingredient.deleteMany();
  console.log('已清空現有食材資料。');
  const items = Array.from(foodMap.values());
  const batchSize = 1000;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    for (const item of batch) {
      await prisma.ingredient.create({
        data: {
          name: item.name,
          category: item.category,
          unit: 'g',
          calories: item.calories,
          protein: item.protein,
          fat: item.fat,
          carbohydrates: item.carbs,
          sodium: item.sodium,
          isAllergen: item.isAllergen,
          allergenType: item.allergenType,
        }
      }).catch((err: any) => console.error(`匯入失敗: ${item.name}`, err));
    }
    console.log(`已匯入 ${Math.min(i + batchSize, items.length)} / ${items.length}`);
  }

  console.log('匯入完成！');
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
