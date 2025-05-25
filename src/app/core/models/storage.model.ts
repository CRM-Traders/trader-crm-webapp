export enum FileType {
  IdFront = 1,
  IdBack = 2,
  PassportMain = 3,
  FacePhoto = 4,
  Document = 10,
  Image = 11,
  Contract = 12,
  Invoice = 13,
  Report = 14,
  Presentation = 15,
  Archive = 16,
  Video = 17,
  Audio = 18,
  Other = 99,
}

export interface FileMetadata {
  id: string;
  userId?: string;
  fileName: string;
  fileExtension: string;
  contentType: string;
  fileSize: number;
  fileType: FileType;
  status: number;
  bucketName: string;
  kycProcessId?: string | null;
  creationTime: string;
  fileUrl: string;
  reference?: string | null;
  description?: string | null;
}

export interface FileContentResponse {
  fileContents: string;
  contentType: string | null;
  fileDownloadName: string | null;
  lastModified: string | null;
  entityTag: {
    tag: {
      buffer: string | null;
      offset: number;
      length: number;
      value: string | null;
      hasValue: boolean;
    };
    isWeak: boolean;
  };
  enableRangeProcessing: boolean;
}

export interface FileUploadRequest {
  fileType: string;
  file: string; // base64 encoded file content
  description: string;
  reference: string;
  ownerId: string;
  makePermanent: boolean;
}

export interface FileUploadResponse {
  fileId: string;
  fileType: FileType;
  fileName: string;
  fileSize: number;
  status: number;
  fileUrl: string;
}

export interface MakePermanentResponse {
  fileId: string;
  newPath: string;
  newBucket: string;
  success: boolean;
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}
