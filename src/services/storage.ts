import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// Configuration for Cloudflare R2
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'ecommerce-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Generate a unique filename for the image
const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = originalFilename.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
};

// Upload an image to R2
export const uploadImage = async (file: File): Promise<string> => {
  try {
    const uniqueFilename = generateUniqueFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: R2_BUCKET_NAME,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      },
    });

    await upload.done();
    
    // Return the public URL of the uploaded image
    return `${R2_PUBLIC_URL}/${uniqueFilename}`;
  } catch (error) {
    console.error('Error uploading image to R2:', error);
    throw new Error('Failed to upload image');
  }
};

// Get a signed URL for temporary access to a private image
export const getImageSignedUrl = async (imageKey: string, expiresIn = 3600): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: imageKey,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate image URL');
  }
};

// Delete an image from R2
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract the key from the URL
    const imageKey = imageUrl.replace(`${R2_PUBLIC_URL}/`, '');
    
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: imageKey,
      })
    );
  } catch (error) {
    console.error('Error deleting image from R2:', error);
    throw new Error('Failed to delete image');
  }
};

// Extract image key from URL
export const getImageKeyFromUrl = (imageUrl: string): string => {
  return imageUrl.replace(`${R2_PUBLIC_URL}/`, '');
}; 