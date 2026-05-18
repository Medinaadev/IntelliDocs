-- Añade columna metadata a FileContent para guardar dimensiones de imágenes
-- y metadatos de PDFs (título, autor, etc.)
ALTER TABLE "FileContent" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
