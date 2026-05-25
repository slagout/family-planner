export type CsvRow = Record<string, string>;

/**
 * Parse CSV text into an array of objects keyed by header row.
 * Handles quoted fields with embedded commas and newlines.
 */
export function parseCSV(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const row: CsvRow = {};
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] ?? '').trim(); });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Download a CSV template as a file */
export function downloadTemplate(section: 'pantry' | 'freezer' | 'refrigerator' | 'bulk'): void {
  const templates: Record<string, string> = {
    pantry:
      'upc,name,category,quantity,unit,expiration_date,location,notes\n' +
      '0001200016268,Oatmeal,Breakfast,2,bags,2026-12-31,Pantry Shelf A,Dairy-free',
    freezer:
      'upc,name,category,quantity,unit,expiration_date,freezer_bin,sous_vide_ready,notes\n' +
      '0001111060903,Frozen Chicken Breast,Protein,4,packs,2026-08-15,Bin-1,true,Pre-marinated',
    refrigerator:
      'upc,name,category,quantity,unit,expiration_date,shelf,temperature_zone,is_dairy_free,notes\n' +
      '0001234567890,Oat Milk,Dairy-Alternative,1,carton,2026-05-20,Door,Cool,true,',
    bulk:
      'batch_name,recipe_name,prep_date,freeze_date,portions,storage_location,reheat_instructions,meal_plan_date,notes\n' +
      'Sunday Meal Prep,Chicken Stir Fry,2026-05-10,2026-05-11,8,Bin-2,350°F 45min,2026-05-18,',
  };

  const csv = templates[section];
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${section}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read a File object and return parsed rows */
export function readCSVFile(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseCSV(e.target?.result as string ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
