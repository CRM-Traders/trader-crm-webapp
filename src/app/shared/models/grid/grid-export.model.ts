export interface GridExportOptions {
  fileName: string;
  fileType: 'csv' | 'excel' | 'pdf';
  fields?: string[];
}
