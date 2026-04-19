import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from './config';

const storage = getStorage(app);

export async function uploadPageImages(
  userId: string,
  subjectId: string,
  pages: { pageNum: number; imageBase64: string }[]
): Promise<Record<number, string>> {
  const urls: Record<number, string> = {};

  await Promise.all(pages.map(async (p) => {
    const storageRef = ref(storage, `courses/${userId}/${subjectId}/page_${p.pageNum}.jpg`);
    await uploadString(storageRef, p.imageBase64, 'base64', { contentType: 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    urls[p.pageNum] = url;
  }));

  return urls;
}

export async function uploadSourceMaterial(
  userId: string,
  subjectId: string,
  text: string
): Promise<string> {
  const storageRef = ref(storage, `courses/${userId}/${subjectId}/source.txt`);
  await uploadString(storageRef, text, 'raw', { contentType: 'text/plain' });
  return await getDownloadURL(storageRef);
}
