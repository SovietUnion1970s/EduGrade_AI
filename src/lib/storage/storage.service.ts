import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface UploadResult {
  fileUrl: string;
  key: string;
}

export class StorageService {
  private driver: 'local' | 'r2' | 's3';
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private publicUrlBase: string;

  constructor() {
    this.driver = (process.env.STORAGE_DRIVER as 'local' | 'r2' | 's3') || 'local';
    this.bucketName = process.env.R2_BUCKET_NAME || 'edugrade-uploads';
    this.publicUrlBase = process.env.R2_PUBLIC_URL || '';

    if (this.driver === 'r2' || this.driver === 's3') {
      const accountId = process.env.R2_ACCOUNT_ID;
      const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

      const endpoint = process.env.R2_ENDPOINT || (accountId 
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : undefined);

      this.s3Client = new S3Client({
        region: process.env.R2_REGION || 'auto',
        endpoint: endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  /**
   * Upload buffer file lên Local Storage hoặc Cloudflare R2
   */
  async uploadFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<UploadResult> {
    const ext = path.extname(originalFilename) || this.getExtensionFromMime(mimeType);
    const safeBaseName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const filename = `${Date.now()}_${uniqueId}_${safeBaseName}${ext}`;

    if (this.driver === 'local') {
      return this.uploadToLocal(buffer, filename);
    } else {
      return this.uploadToS3(buffer, filename, mimeType);
    }
  }

  /**
   * Lưu trữ cục bộ vào thư mục public/uploads/
   */
  private async uploadToLocal(buffer: Buffer, filename: string): Promise<UploadResult> {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Tự động tạo thư mục nếu chưa tồn tại
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    // Trả về URL tương đối để Next.js phục vụ trực tiếp
    const fileUrl = `/uploads/${filename}`;

    return {
      fileUrl,
      key: filename,
    };
  }

  /**
   * Lưu trữ đám mây qua S3 / Cloudflare R2
   */
  private async uploadToS3(buffer: Buffer, filename: string, mimeType: string): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error('Chưa cấu hình S3/R2 client. Vui lòng kiểm tra biến môi trường R2_*.');
    }

    const key = `submissions/${filename}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const baseUrl = this.publicUrlBase.replace(/\/+$/, '');
    const fileUrl = baseUrl ? `${baseUrl}/${key}` : `https://${this.bucketName}.r2.dev/${key}`;

    return {
      fileUrl,
      key,
    };
  }

  /**
   * Xóa file khi học sinh hủy bài hoặc cập nhật ảnh mới
   */
  async deleteFile(key: string): Promise<void> {
    try {
      if (this.driver === 'local') {
        const filePath = path.join(process.cwd(), 'public', 'uploads', path.basename(key));
        await fs.unlink(filePath);
      } else if (this.s3Client) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        );
      }
    } catch {
      // Bỏ qua lỗi xóa nếu file không tồn tại
    }
  }

  private getExtensionFromMime(mime: string): string {
    switch (mime) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'application/pdf':
        return '.pdf';
      default:
        return '.jpg';
    }
  }
}

export const storageService = new StorageService();
