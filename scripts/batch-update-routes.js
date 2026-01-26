const fs = require('fs');
const path = require('path');

const files = [
  'app/api/production-schedules/[id]/items/[itemId]/sub-recipe-progress/route.ts',
  'app/api/production-schedules/[id]/items/[itemId]/complete/route.ts',
  'app/api/production-schedules/[id]/items/[itemId]/start/route.ts',
  'app/api/production-schedules/[id]/items/[itemId]/reassign/route.ts'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Skip if already updated
  if (content.includes("from '@vercel/postgres'")) {
    console.log(`✓ Skipped ${file} (already updated)`);
    return;
  }
  
  // Replace imports
  content = content.replace(
    /import { NextResponse } from 'next\/server'\nimport fs from 'fs'\nimport path from 'path'/g,
    "import { NextResponse } from 'next/server'\nimport { sql } from '@vercel/postgres'"
  );
  
  // Remove file helpers
  content = content.replace(
    /const dataFilePath[^}]+\}\n\n/g,
    ''
  );
  
  // Replace readSchedules pattern
  content = content.replace(
    /const schedules = readSchedules\(\)\s+const scheduleIndex = schedules\.findIndex\(\(s: any\) => s\.scheduleId === params\.id\)\s+if \(scheduleIndex === -1\) \{\s+return NextResponse\.json\(\{ error: 'Schedule not found' \}, \{ status: 404 \}\)\s+\}/g,
    `const result = await sql\`
      SELECT schedule_data
      FROM production_schedules
      WHERE schedule_id = \${params.id}
    \`

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const schedule = result.rows[0].schedule_data`
  );
  
  // Replace schedules[scheduleIndex] references
  content = content.replace(/schedules\[scheduleIndex\]/g, 'schedule');
  
  // Replace writeSchedules calls
  content = content.replace(
    /writeSchedules\(schedules\)/g,
    `await sql\`
      UPDATE production_schedules
      SET schedule_data = \${JSON.stringify(schedule)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = \${params.id}
    \``
  );
  
  fs.writeFileSync(fullPath, content);
  console.log(`✓ Updated ${file}`);
});

console.log('\nBatch update complete!');
