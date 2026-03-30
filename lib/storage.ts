import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

type UploadArquivoInput = {
  bucket: string;
  filePathLocal: string;
  filePathStorage: string;
  contentType: string;
};

export async function uploadArquivoParaStorage({
  bucket,
  filePathLocal,
  filePathStorage,
  contentType,
}: UploadArquivoInput) {
  const fileBuffer = await fs.readFile(filePathLocal);

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePathStorage, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Erro ao subir arquivo: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filePathStorage);

  return {
    publicUrl: data.publicUrl,
    storagePath: filePathStorage,
    fileName: path.basename(filePathStorage),
  };
}