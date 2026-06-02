// Stub: jsPDF references html2canvas for its html() method which we never use.
// Replacing with a no-op keeps the bundle ~200 kB lighter.
export default async () => ({
  toDataURL: () => '',
  width: 0,
  height: 0,
});
