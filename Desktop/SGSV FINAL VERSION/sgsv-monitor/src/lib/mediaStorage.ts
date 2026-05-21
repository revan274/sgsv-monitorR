import { compressImage } from './utils';

export interface HandleMediaOptions {
  file: File;
  storagePath: string;
  entityType: 'incidente' | 'pcp';
  entityId: string;
  field: string;
  imagenesIndex?: number;
}

/**
 * Comprime la imagen y devuelve base64 para uso inmediato.
 * La subida a almacenamiento en la nube (R2) está pendiente de implementación.
 */
export const handleMediaFile = async ({ file }: HandleMediaOptions): Promise<string> => {
  const isImage = file.type.startsWith('image/');

  if (isImage) {
    return compressImage(file);
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const processPendingMediaUploads = async (): Promise<{ succeeded: number; failed: number }> => {
  return { succeeded: 0, failed: 0 };
};
