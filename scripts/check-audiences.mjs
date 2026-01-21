import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

async function checkAudiences() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    // Check audiences table
    const audiences = await sql`SELECT * FROM audiences ORDER BY created_at DESC LIMIT 10`;
    console.log('\n=== AUDIENCES TABLE ===');
    console.log('Count:', audiences.length);
    if (audiences.length > 0) {
      audiences.forEach((a, i) => {
        console.log(`\n[${i + 1}] ${a.name}`);
        console.log('  Primary:', a.is_primary);
        console.log('  Confidence:', a.confidence);
        console.log('  Company ID:', a.company_id);
      });
    } else {
      console.log('No audiences found in database');
    }

    // Check latest company
    const companies = await sql`SELECT id, name, social_links, industry FROM companies ORDER BY created_at DESC LIMIT 3`;
    console.log('\n=== RECENT COMPANIES ===');
    companies.forEach((c, i) => {
      console.log(`\n[${i + 1}] ${c.name}`);
      console.log('  Industry:', c.industry);
      console.log('  Social Links:', JSON.stringify(c.social_links, null, 2));
      console.log('  ID:', c.id);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkAudiences();
