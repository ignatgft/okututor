package com.okututor.backend.legal;

import com.okututor.backend.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tg_recipients", uniqueConstraints = @UniqueConstraint(name = "uq_tg_chat_id", columnNames = "chat_id"))
public class TgRecipient {

    @Id
    private UUID id;

    @Column(name = "chat_id", nullable = false, length = 32)
    private String chatId; // Telegram userId as string, e.g. "123456789" or "-100..."

    @Column(length = 64)
    private String username; // @username from TG (without @)

    @Column(name = "display_name", length = 100)
    private String displayName; // firstName + lastName from TG

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "notify_critical", nullable = false)
    private boolean notifyCritical = true;

    @Column(name = "notify_warning", nullable = false)
    private boolean notifyWarning = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    // getters/setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getChatId() { return chatId; }
    public void setChatId(String chatId) { this.chatId = chatId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public boolean isNotifyCritical() { return notifyCritical; }
    public void setNotifyCritical(boolean v) { notifyCritical = v; }
    public boolean isNotifyWarning() { return notifyWarning; }
    public void setNotifyWarning(boolean v) { notifyWarning = v; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User u) { createdBy = u; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
