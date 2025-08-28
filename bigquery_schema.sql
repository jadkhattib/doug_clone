-- BigQuery Table Schema for Monks.IQ
-- Database: discovery-flow
-- Dataset: persona
-- Table: embeddings

-- Run this SQL in BigQuery to create the embeddings table

CREATE TABLE IF NOT EXISTS `discovery-flow.persona.embeddings` (
  -- Unique identifier for each embedding chunk
  id STRING NOT NULL,
  
  -- The actual text content of this chunk
  text STRING NOT NULL,
  
  -- OpenAI embedding vector (1536 dimensions for text-embedding-3-small)
  embedding ARRAY<FLOAT64>,
  
  -- Optional metadata as JSON (can store source, date, context, etc.)
  metadata JSON,
  
  -- Timestamp when the embedding was created
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  
  -- Identifier for the persona this embedding belongs to
  persona_id STRING NOT NULL,
  
  -- Index of this chunk within the original text
  chunk_index INT64
)
PARTITION BY DATE(created_at)
CLUSTER BY persona_id;

-- Create an index on persona_id for faster queries
-- Note: BigQuery automatically creates indexes, but clustering helps with performance

-- Optional: Create a vector index on the embedding column for fast ANN search
-- Run this once in your BigQuery project (adjust index name as desired):
-- CREATE OR REPLACE VECTOR INDEX persona_embeddings_ivf
-- ON `discovery-flow.persona.embeddings` (embedding)
-- OPTIONS (
--   index_type = 'IVF',
--   distance_type = 'COSINE',
--   ivf_options = '{"num_lists": 100}'
-- );
-- To rebuild after large ingests:
-- ALTER VECTOR INDEX `discovery-flow.persona.persona_embeddings_ivf` REBUILD;

-- Example query to verify the table structure:
-- SELECT 
--   column_name,
--   data_type,
--   is_nullable
-- FROM `discovery-flow.persona.INFORMATION_SCHEMA.COLUMNS`
-- WHERE table_name = 'embeddings';

-- Example insert (for testing):
-- INSERT INTO `discovery-flow.persona.embeddings` (id, text, embedding, metadata, persona_id, chunk_index)
-- VALUES (
--   'test-001',
--   'This is a test text chunk',
--   [0.1, 0.2, 0.3, ...], -- 1536 dimensions
--   JSON '{"source": "test", "type": "sample"}',
--   'default',
--   0
-- );
