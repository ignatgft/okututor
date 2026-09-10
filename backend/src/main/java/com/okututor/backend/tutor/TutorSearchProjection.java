package com.okututor.backend.tutor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface TutorSearchProjection {
    UUID getId();
    String getSlug();
    String getFirstName();
    String getLastName();
    String getTitle();
    String getShortDescription();
    String getAbout();
    String getTutorType();
    BigDecimal getPriceFrom();
    BigDecimal getPriceTo();
    String getCurrency();
    Boolean getOnline();
    Boolean getOffline();
    Integer getViewsCount();
    Instant getPublishedAt();
    String getCitySlug();
    String getCityName();
    Double getTextScore();
    Double getTrgmScore();
    Integer getExactMatch();
}
