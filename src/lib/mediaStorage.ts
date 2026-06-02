import { isApiConfigured, apiUpload } from './apiClient';
import { compressImage } from './utils';
import { captureError } from './monitoring';

export interface HandleMediaOptions {
  file: File;
  storagePath: string;
  entityType: 'incidente' | 'pcp';
  entityId: string;
  field: string;
  imagenesIndex?: number;
}

const uploadToCloud = async (blob: Blob, storagePath: string, originalFilename: string): Promise<string> => {
  const filename = storagePath.split('/').pop() ?? originalFilename;
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('path', storagePath);
  
  const result = (await apiUpload('/api/upload', form)) as { url: string };
  if (!result?.url) throw new Error('Respuesta de upload invalida.');
  return result.url;
};

export const handleMediaFile = async ({
  file,
  storagePath,
  entityId,
}: HandleMediaOptions): Promise<string> => {
  if (!isApiConfigured() || !navigator.onLine) {
    throw new Error('SGSV Cloud requiere conexion para subir evidencias.');
  }

  const payloadBlob = file.type.startsWith('image/')
    ? await compressImage(file)
    : file;

  try {
    return await uploadToCloud(payloadBlob, storagePath, file.name);
  } catch (error) {
    captureError(error, { component: 'mediaStorage', action: 'handleMediaFile', entityId });
    throw new Error('No se pudo subir la evidencia al storage cloud.');
  }
};
