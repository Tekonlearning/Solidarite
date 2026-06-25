import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './config';

// Initialize Firebase Storage
export const storage = getStorage(app);

/**
 * Upload profile avatar or document images to Firebase Storage
 * @param path The destination path inside storage bucket
 * @param file The browser File object
 */
export async function uploadFile(path: string, file: File): Promise<string> {
  const fileRef = ref(storage, path);
  const snapshot = await uploadBytes(fileRef, file);
  return await getDownloadURL(snapshot.ref);
}
