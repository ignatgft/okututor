package com.okututor.backend.tutor;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

public final class TutorCacheKey {
    private TutorCacheKey() {}

    public static String of(int page, int size, String tutorType, UUID cityId, UUID districtId,
                            Boolean online, Boolean offline, BigDecimal priceFrom, BigDecimal priceTo) {
        // capped pagination already in service, but key must be deterministic
        String raw = page + "|" + size + "|" + norm(tutorType) + "|" + str(cityId) + "|" + str(districtId)
                + "|" + str(online) + "|" + str(offline) + "|" + str(priceFrom) + "|" + str(priceTo);
        // hash to keep key short and avoid huge keys
        return hash(raw);
    }

    public static String search(String q, String subject, String city, String tutorType,
                                java.math.BigDecimal priceFrom, java.math.BigDecimal priceTo,
                                Boolean online, Boolean offline, String language,
                                String level, String district, String sort, int page, int size) {
        // reuse normalization from SearchQueryNormalizer implicitly via q lower trim
        String nq = q == null ? "" : q.trim().toLowerCase();
        String raw = nq + "|" + norm(subject) + "|" + norm(city) + "|" + norm(tutorType) + "|"
                + str(priceFrom) + "|" + str(priceTo) + "|" + str(online) + "|" + str(offline) + "|"
                + norm(language) + "|" + norm(level) + "|" + norm(district) + "|" + norm(sort)
                + "|" + page + "|" + size;
        return hash(raw);
    }

    private static String norm(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString();
    }

    private static String hash(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] d = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d).substring(0, 16);
        } catch (Exception e) {
            return Integer.toHexString(raw.hashCode());
        }
    }
}
