import { config } from 'dotenv'
import postgres from 'postgres'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment
config({ path: path.join(__dirname, '..', '.env.local') })

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

  try {
    // Read migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'src/db/migrations/0018_add_audiences_table.sql'
    )
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Split by semicolons but be careful with functions/policies
    // Run as a single transaction
    console.log('Running migration...')
    await sql.unsafe(migrationSQL)

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration error:', error.message)
    // Check if it's just "already exists"
    if (error.message.includes('already exists')) {
      console.log('Table or index already exists, continuing...')
    } else {
      throw error
    }
  } finally {
    await sql.end()
  }
}

runMigration()
