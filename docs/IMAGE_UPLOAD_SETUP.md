# 이미지 업로드 기능 설정 가이드

## 개요
커뮤니티 게시글 작성 시 이미지를 첨부할 수 있는 기능입니다.
- 최대 3장
- 각 5MB 이하
- JPEG, PNG 형식만 허용

## Supabase Storage 설정

### 1단계: Storage Bucket 생성

1. Supabase Dashboard 접속
2. 좌측 메뉴에서 **Storage** 클릭
3. **New bucket** 버튼 클릭
4. 다음 정보 입력:
   - **Name**: `community-images`
   - **Public bucket**: ✅ 체크 (이미지를 공개적으로 접근 가능하게)
   - **File size limit**: `5242880` (5MB = 5 × 1024 × 1024 bytes)
   - **Allowed MIME types**: `image/jpeg,image/png`

### 2단계: Storage RLS 정책 설정

Bucket 생성 후, RLS 정책을 설정해야 합니다.

1. Storage 탭에서 `community-images` 버킷 클릭
2. **Policies** 탭 클릭
3. 다음 3개 정책 추가:

#### 정책 1: 모든 사용자가 이미지 조회 가능
```sql
-- Policy name: Anyone can view images
-- Operation: SELECT
-- Target roles: public

CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'community-images');
```

#### 정책 2: 인증된 사용자가 자기 폴더에만 업로드 가능
```sql
-- Policy name: Users can upload their own images
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### 정책 3: 인증된 사용자가 자기 이미지만 삭제 가능
```sql
-- Policy name: Users can delete their own images
-- Operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3단계: 데이터베이스 마이그레이션 실행

```bash
cd supabase
supabase migration up
```

또는 Supabase Dashboard에서 SQL Editor를 열고
`supabase/migrations/20260209_community_image_upload.sql` 파일 내용을 실행합니다.

## 개발 모드 (Mock)

Supabase Storage가 설정되지 않은 경우, 개발용 Mock URL을 반환합니다.

- Mock URL 형식: `https://mock-storage.baln.app/{userId}/{postId}/{timestamp}.jpg`
- 실제 업로드는 되지 않지만, UI 테스트는 가능합니다.

## 파일 구조

```
src/
  services/
    imageUpload.ts           # 이미지 업로드 서비스
  hooks/
    useCommunity.ts          # 게시글 작성 (imageUrls 포함)
  types/
    community.ts             # CommunityPost.image_urls 타입 추가
app/
  community/
    create.tsx               # 게시글 작성 화면 (이미지 선택 UI)
supabase/
  migrations/
    20260209_community_image_upload.sql  # DB 마이그레이션
```

## 사용 예시

### 이미지 선택
```typescript
import { pickImages, validateImages } from '@/src/services/imageUpload';

const images = await pickImages(3); // 최대 3장
const validation = validateImages(images);

if (!validation.isValid) {
  Alert.alert('오류', validation.error);
}
```

### 이미지 업로드
```typescript
import { uploadMultipleImages } from '@/src/services/imageUpload';

const imageUrls = await uploadMultipleImages(images, userId, postId);
// imageUrls: ['https://...jpg', 'https://...jpg']
```

### 게시글 작성 (이미지 포함)
```typescript
import { useCreatePost } from '@/src/hooks/useCommunity';

const createPost = useCreatePost();

await createPost.mutateAsync({
  content: '게시글 내용',
  category: 'stocks',
  displayTag: '[자산: 1.5억]',
  assetMix: '주식 70%, 코인 30%',
  totalAssets: 150000000,
  imageUrls: ['https://...jpg', 'https://...jpg'], // 선택적
});
```

## 보안 고려사항

1. **파일 크기 제한**: 클라이언트와 Storage 버킷 모두 5MB 제한
2. **MIME 타입 제한**: JPEG, PNG만 허용
3. **EXIF 데이터 제거**: 개인정보 보호를 위해 `exif: false` 설정
4. **경로 격리**: 각 사용자는 자기 폴더(`{userId}/`)에만 업로드 가능
5. **RLS 정책**: 인증된 사용자만 업로드/삭제 가능

## 트러블슈팅

### Storage 버킷이 없을 때
- 에러 메시지: `Bucket not found`
- 해결: Mock URL을 반환하며 개발은 가능 (실제 업로드 안 됨)
- 콘솔 경고: `Storage bucket not found. Returning mock URL for development.`

### 권한 에러
- 에러 메시지: `Permission denied`
- 해결: RLS 정책 확인 (정책 2, 3번)

### 파일 크기 초과
- 에러 메시지: `이미지 크기는 5MB 이하여야 합니다.`
- 해결: 이미지 압축 또는 작은 이미지 선택

### MIME 타입 에러
- 에러 메시지: `JPEG 또는 PNG 이미지만 업로드 가능합니다.`
- 해결: 지원되는 형식으로 변환

## 향후 개선 사항

- [ ] 이미지 압축 (react-native-image-crop-picker)
- [ ] 이미지 편집 (필터, 크롭)
- [ ] 썸네일 자동 생성 (Edge Function)
- [ ] 중복 이미지 감지 (해시 기반)
- [ ] 이미지 갤러리 뷰어 (확대/축소)
- [ ] 드래그 앤 드롭 재정렬
- [ ] 진행률 표시 (대용량 이미지)

## 비용 예상

- **Storage**: 1GB당 $0.021/월
- **대역폭**: 1GB당 $0.09
- 예상: 1,000장 × 2MB = 2GB → $0.042/월 (저장) + $0.18 (전송 1GB) = **약 $0.22/월**
