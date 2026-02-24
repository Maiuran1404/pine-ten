-- Manual migration: Add pgvector embedding column to website_inspirations
-- Run via: psql $DATABASE_URL -f src/db/migrations/add-embedding-vector.sql
--
-- This is NOT a Drizzle-managed migration. It must be run manually because
-- Drizzle does not have built-in pgvector support. The embedding_vector column
-- is managed via raw SQL queries in the application code.

-- Enable pgvector extension (Supabase has this available)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (512 dimensions for CLIP ViT-L/14)
ALTER TABLE website_inspirations
  ADD COLUMN IF NOT EXISTS embedding_vector vector(512);

-- Create HNSW index for cosine similarity search
-- HNSW works well for any dataset size (unlike IVFFlat which needs ~100+ rows)
CREATE INDEX IF NOT EXISTS idx_website_inspirations_embedding
  ON website_inspirations
  USING hnsw (embedding_vector vector_cosine_ops);
