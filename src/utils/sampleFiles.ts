// Sample animations for 1-click test drive

export interface SampleItem {
  id: string;
  title: string;
  format: 'gif' | 'webp';
  description: string;
  fileUrl: string;
  sizeLabel: string;
}

export const SAMPLE_ITEMS: SampleItem[] = [
  {
    id: 'test_pattern',
    title: 'Chromatic Frequency Matrix',
    format: 'gif',
    description: 'High-contrast 15fps animated calibration pattern with moving geometry',
    fileUrl: '/samples/test_pattern.gif',
    sizeLabel: '196 KB',
  },
  {
    id: 'bars_test',
    title: 'SMPTE Broadcast Vector Pulse',
    format: 'webp',
    description: 'Animated WebP standard color bar test pattern with moving scan',
    fileUrl: '/samples/bars_test.webp',
    sizeLabel: '34 KB',
  },
];

// Helper to fetch and create File object from sample url
export async function loadSampleAsFile(sample: SampleItem): Promise<File> {
  const response = await fetch(sample.fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to load sample: ${response.statusText}`);
  }
  const blob = await response.blob();
  const mimeType = sample.format === 'gif' ? 'image/gif' : 'image/webp';
  const filename = `${sample.id}.${sample.format}`;
  return new File([blob], filename, { type: mimeType });
}
