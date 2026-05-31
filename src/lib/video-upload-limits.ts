/**
 * Max total file size for multipart match video upload.
 * Keep client (`VideoUpload`) and `upload-init` in sync with this value.
 * Each part is still small (see upload-init chunking); only this cap changes.
 */
export const MAX_MATCH_VIDEO_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB
