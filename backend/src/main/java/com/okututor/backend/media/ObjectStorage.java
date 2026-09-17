package com.okututor.backend.media;

/** абстракция object storage; реализации: локальный диск и Cloudflare R2. */
public interface ObjectStorage {

    /** загружает объект с immutable cache-заголовками (ключ содержит UUID). */
    StoredObject upload(String key, byte[] data, String contentType);

    void delete(String key);

    boolean exists(String key);

    /** публичный URL объекта (CDN для R2, локальный эндпоинт для dev). */
    String publicUrl(String key);

    /** читает объект (для проксирования R2 через бэкенд, если bucket не публичный) */
    default byte[] read(String key) {
        throw new UnsupportedOperationException("Read not supported");
    }

    /** потоковое чтение — реализации должны переопределить для zero-copy; фолбэк через read */
    default java.io.InputStream openStream(String key) throws java.io.IOException {
        return new java.io.ByteArrayInputStream(read(key));
    }

    /** размер объекта, если известен; -1 если недоступно */
    default long contentLength(String key) {
        try { return read(key).length; } catch (Exception e) { return -1; }
    }

    /** presigned URL для прямой загрузки из браузера (PUT). */
    default String createPresignedUploadUrl(String key, String contentType, java.time.Duration expiry) {
        throw new UnsupportedOperationException("Presigned upload not supported for this provider");
    }

    /** presigned URL для скачивания приватных объектов (GET). */
    default String createPresignedDownloadUrl(String key, java.time.Duration expiry) {
        throw new UnsupportedOperationException("Presigned download not supported for this provider");
    }

    record StoredObject(String key, String publicUrl, long size) {}
}
