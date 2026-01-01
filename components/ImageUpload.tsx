// components/ImageUpload.tsx
'use client';

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import Image from 'next/image';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (url: string) => void;
  childId: string;
  disabled?: boolean;
}

export default function ImageUpload({
  currentImageUrl,
  onImageUpload,
  childId,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Create a reference to the storage location
      const timestamp = Date.now();
      const storageRef = ref(storage, `children/${childId}/photo_${timestamp}.jpg`);

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadUrl = await getDownloadURL(storageRef);

      // Update preview
      setPreviewUrl(downloadUrl);

      // Call the callback with the new URL
      onImageUpload(downloadUrl);

      alert('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!previewUrl) return;

    const confirmed = confirm('Are you sure you want to remove this photo?');
    if (!confirmed) return;

    try {
      setUploading(true);

      // Delete from storage if it's a Firebase URL
      if (previewUrl.includes('firebasestorage')) {
        const photoRef = ref(storage, previewUrl);
        await deleteObject(photoRef);
      }

      setPreviewUrl(null);
      onImageUpload('');

      alert('Photo removed successfully!');
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Failed to remove photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Child Photo (Optional)
      </label>

      {/* Preview */}
      {previewUrl && (
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500">
          <Image
            src={previewUrl}
            alt="Child photo"
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Upload/Remove buttons */}
      <div className="flex gap-2">
        <label
          className={`px-4 py-2 rounded-lg text-white font-medium cursor-pointer ${
            uploading || disabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {uploading ? 'Uploading...' : previewUrl ? 'Change Photo' : 'Upload Photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading || disabled}
            className="hidden"
          />
        </label>

        {previewUrl && !disabled && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            disabled={uploading}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:bg-gray-400"
          >
            Remove Photo
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Max file size: 5MB. Accepted formats: JPG, PNG, GIF, WebP
      </p>
    </div>
  );
}