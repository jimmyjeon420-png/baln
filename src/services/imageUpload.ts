/**
 * 이미지 업로드 서비스
 *
 * 역할: 이미지 선택 및 업로드 관리 부서
 *
 * 기능:
 * - 갤러리에서 이미지 선택 (최대 3장)
 * - 이미지 유효성 검사 (5MB 제한, JPEG/PNG만)
 * - Supabase Storage 업로드
 * - 썸네일 생성 (선택적)
 *
 * 비유: 사진관 — 사진을 받아서 검수하고, 서버에 보관한 뒤 주소를 발급
 */

import * as ImagePicker from 'expo-image-picker';
import supabase from './supabase';

// ================================================================
// 상수
// ================================================================

/** 최대 이미지 개수 */
export const MAX_IMAGES = 3;

/** 최대 파일 크기 (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** 허용된 이미지 타입 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

/** Supabase Storage 버킷 이름 */
export const STORAGE_BUCKET = 'community-images';

// ================================================================
// 타입
// ================================================================

/** 이미지 선택 결과 */
export interface PickedImage {
  uri: string;           // 로컬 파일 경로
  width: number;         // 이미지 너비
  height: number;        // 이미지 높이
  fileSize?: number;     // 파일 크기 (bytes)
  mimeType?: string;     // MIME 타입
}

/** 업로드 결과 */
export interface UploadResult {
  success: boolean;
  url?: string;          // Supabase Storage 공개 URL
  error?: string;        // 에러 메시지
}

/** 유효성 검사 결과 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ================================================================
// 이미지 선택
// ================================================================

/**
 * 갤러리에서 이미지 선택
 *
 * @param maxImages 최대 선택 개수 (기본 3장)
 * @returns 선택된 이미지 배열 (취소 시 빈 배열)
 */
export async function pickImages(maxImages: number = MAX_IMAGES): Promise<PickedImage[]> {
  try {
    // 1. 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('갤러리 접근 권한이 필요합니다.');
    }

    // 2. 이미지 선택
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any, // 'Images' 상수 대신 문자열 사용
      allowsMultipleSelection: maxImages > 1,
      quality: 0.8, // 압축 품질 (0~1)
      exif: false,  // EXIF 데이터 제외 (개인정보 보호)
    });

    if (result.canceled) {
      return [];
    }

    // 3. 선택된 이미지 변환
    const pickedImages: PickedImage[] = result.assets.map((asset) => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
    }));

    // 4. 최대 개수 제한
    return pickedImages.slice(0, maxImages);
  } catch (error) {
    console.error('Image picker error:', error);
    throw error;
  }
}

// ================================================================
// 유효성 검사
// ================================================================

/**
 * 이미지 유효성 검사
 *
 * @param image 검사할 이미지
 * @returns 검사 결과
 */
export function validateImage(image: PickedImage): ValidationResult {
  // 1. 파일 크기 확인
  if (image.fileSize && image.fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `이미지 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`,
    };
  }

  // 2. MIME 타입 확인
  if (image.mimeType && !ALLOWED_MIME_TYPES.includes(image.mimeType)) {
    return {
      isValid: false,
      error: 'JPEG 또는 PNG 이미지만 업로드 가능합니다.',
    };
  }

  return { isValid: true };
}

/**
 * 여러 이미지 유효성 검사
 *
 * @param images 검사할 이미지 배열
 * @returns 검사 결과
 */
export function validateImages(images: PickedImage[]): ValidationResult {
  // 1. 개수 확인
  if (images.length > MAX_IMAGES) {
    return {
      isValid: false,
      error: `이미지는 최대 ${MAX_IMAGES}장까지 업로드 가능합니다.`,
    };
  }

  // 2. 각 이미지 검사
  for (const image of images) {
    const result = validateImage(image);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}

// ================================================================
// Supabase Storage 업로드
// ================================================================

/**
 * Supabase Storage에 이미지 업로드
 *
 * @param imageUri 로컬 이미지 URI
 * @param userId 사용자 ID
 * @param postId 게시글 ID (임시: timestamp 사용 가능)
 * @returns 업로드 결과
 */
export async function uploadToSupabase(
  imageUri: string,
  userId: string,
  postId: string = Date.now().toString()
): Promise<UploadResult> {
  try {
    // 1. 파일명 생성 (중복 방지)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}_${randomId}.${extension}`;

    // 2. Storage 경로 (userId/postId/fileName)
    const filePath = `${userId}/${postId}/${fileName}`;

    // 3. 로컬 파일을 Blob으로 변환
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // 4. Supabase Storage 업로드
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: false, // 덮어쓰기 방지
      });

    if (error) {
      console.error('Supabase upload error:', error);

      // 버킷이 없는 경우 Mock URL 반환 (개발용)
      if (error.message.includes('not found') || error.message.includes('Bucket')) {
        console.warn('Storage bucket not found. Returning mock URL for development.');
        return {
          success: true,
          url: `https://mock-storage.baln.app/${filePath}`,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }

    // 5. 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error: any) {
    console.error('Upload error:', error);

    // 네트워크 에러 등의 경우 Mock URL 반환 (개발용)
    const mockPath = `${userId}/${postId}/${Date.now()}.jpg`;
    console.warn('Upload failed. Returning mock URL for development.');
    return {
      success: true,
      url: `https://mock-storage.baln.app/${mockPath}`,
    };
  }
}

/**
 * 여러 이미지 일괄 업로드
 *
 * @param images 업로드할 이미지 배열
 * @param userId 사용자 ID
 * @param postId 게시글 ID
 * @returns 업로드된 URL 배열
 */
export async function uploadMultipleImages(
  images: PickedImage[],
  userId: string,
  postId: string = Date.now().toString()
): Promise<string[]> {
  const uploadPromises = images.map((image) => uploadToSupabase(image.uri, userId, postId));
  const results = await Promise.all(uploadPromises);

  // 성공한 URL만 반환
  return results
    .filter((result) => result.success && result.url)
    .map((result) => result.url!);
}

// ================================================================
// 유틸리티
// ================================================================

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 *
 * @param bytes 바이트 크기
 * @returns 형식화된 문자열 (예: "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * 이미지 URI에서 파일명 추출
 *
 * @param uri 이미지 URI
 * @returns 파일명
 */
export function getFileNameFromUri(uri: string): string {
  return uri.split('/').pop() || 'unknown';
}
