const fs = require('fs');
const path = require('path');

const localesDir = 'c:\\Github\\kitchenasty\\packages\\adminfront\\src\\i18n\\locales';
const files = [
  'en.json', 'es.json', 'fr.json', 'de.json', 'it.json', 
  'ja.json', 'ko.json', 'pt.json', 'th.json', 'tl.json', 
  'vi.json', 'id.json', 'zh-TW.json'
];

const translations = {
  'en': { salaryType: 'Salary Type', hourly: 'Hourly Wage', monthly: 'Monthly Wage', hourlyWage: 'Hourly Wage', monthlyWage: 'Monthly Wage' },
  'zh-TW': { salaryType: '計薪方式', hourly: '時薪 (Hourly)', monthly: '月薪 (Monthly)', hourlyWage: '時薪 (Hourly Wage)', monthlyWage: '月薪 (Monthly Wage)' },
  'es': { salaryType: 'Tipo de salario', hourly: 'Salario por hora', monthly: 'Salario mensual', hourlyWage: 'Salario por hora', monthlyWage: 'Salario mensual' },
  'fr': { salaryType: 'Type de salaire', hourly: 'Salaire horaire', monthly: 'Salaire mensuel', hourlyWage: 'Salaire horaire', monthlyWage: 'Salaire mensuel' },
  'de': { salaryType: 'Gehaltsart', hourly: 'Stundenlohn', monthly: 'Monatsgehalt', hourlyWage: 'Stundenlohn', monthlyWage: 'Monatsgehalt' },
  'it': { salaryType: 'Tipo di stipendio', hourly: 'Paga oraria', monthly: 'Stipendio mensile', hourlyWage: 'Paga oraria', monthlyWage: 'Stipendio mensile' },
  'ja': { salaryType: '給与形態', hourly: '時給', monthly: '月給', hourlyWage: '時給', monthlyWage: '月給' },
  'ko': { salaryType: '급여 유형', hourly: '시급', monthly: '월급', hourlyWage: '시급', monthlyWage: '월급' },
  'pt': { salaryType: 'Tipo de salário', hourly: 'Salário por hora', monthly: 'Salário mensal', hourlyWage: 'Salário por hora', monthlyWage: 'Salário mensal' },
  'th': { salaryType: 'ประเภทเงินเดือน', hourly: 'ค่าจ้างรายชั่วโมง', monthly: 'เงินเดือน', hourlyWage: 'ค่าจ้างรายชั่วโมง', monthlyWage: 'เงินเดือน' },
  'tl': { salaryType: 'Uri ng Sahod', hourly: 'Sahod kada Oras', monthly: 'Buwanang Sahod', hourlyWage: 'Sahod kada Oras', monthlyWage: 'Buwanang Sahod' },
  'vi': { salaryType: 'Loại lương', hourly: 'Lương theo giờ', monthly: 'Lương hàng tháng', hourlyWage: 'Lương theo giờ', monthlyWage: 'Lương hàng tháng' },
  'id': { salaryType: 'Jenis Gaji', hourly: 'Upah Per Jam', monthly: 'Gaji Bulanan', hourlyWage: 'Upah Per Jam', monthlyWage: 'Gaji Bulanan' },
};

// Based on user's exact string request for zh-TW: 
translations['zh-TW'].hourly = '時薪 (Hourly Wage)';

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  const locale = file.replace('.json', '');
  
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.staffEdit) {
      data.staffEdit = {};
    }
    
    const t = translations[locale] || translations['en'];
    
    data.staffEdit.salaryType = t.salaryType;
    data.staffEdit.hourly = t.hourly;
    data.staffEdit.monthly = t.monthly;
    data.staffEdit.hourlyWage = t.hourlyWage;
    data.staffEdit.monthlyWage = t.monthlyWage;
    
    // Maintain formatting: 2 spaces
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
