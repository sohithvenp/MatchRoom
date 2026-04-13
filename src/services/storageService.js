import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

function getExtension(fileName = '') {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';
}

export async function uploadImageFile(file, folder, userId) {
  if (!file || !folder || !userId) {
    throw new Error('Missing upload arguments');
  }

  const ext = getExtension(file.name);
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
  const imageRef = ref(storage, `${safeFolder}/${userId}/${Date.now()}.${ext}`);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return getDownloadURL(imageRef);
}

export async function deleteFileByUrl(fileUrl) {
  if (!fileUrl) return;
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch {
    // Ignore deletion errors; old URLs may already be deleted.
  }
}
