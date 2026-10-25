type Input = { name: string; type: string; size: number; lastModified: number };
export function selectAutomationUploads<T extends Input>(existingDocuments: T[], existingImages: T[], incoming: T[]) {
  const imageTypes = new Set(['image/jpeg','image/png','image/webp']);
  const isPdf = (file: T) => file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name));
  if (incoming.some(file => !isPdf(file) && !imageTypes.has(file.type))) throw Error('Bitte nur PDF, JPEG, PNG oder WebP hochladen.');
  if (incoming.some(file => file.size <= 0 || file.size > (isPdf(file) ? 25 : 10) * 1024 * 1024)) throw Error('Eine Datei ist leer oder überschreitet die zulässige Uploadgrösse.');
  const unique = (files: T[]) => files.filter((file, index) => files.findIndex(other => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified) === index);
  const documents = unique([...existingDocuments, ...incoming.filter(isPdf)]);
  const images = unique([...existingImages, ...incoming.filter(file => imageTypes.has(file.type))]);
  if (documents.length > 10 || images.length > 20) throw Error('Maximal 10 PDFs und 20 Bilder pro Entwurf.');
  return { documents, images };
}
