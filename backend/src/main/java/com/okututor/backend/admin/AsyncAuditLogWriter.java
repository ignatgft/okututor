package com.okututor.backend.admin;

import com.okututor.backend.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Отдельный бин нужен, чтобы {@code @Async} реально срабатывал: вызов {@code write} из
 * {@link AuditLogService} через self-invocation обошёл бы прокси и записал бы синхронно.
 *
 * <p>Пишет в независимой транзакции и вызывается только после коммита транзакции бизнес-операции:
 * иначе actor_id ещё не виден из другой сессии и insert падает по audit_logs_actor_id_fkey.
 */
@Component
class AsyncAuditLogWriter {

    private final AuditLogRepository repository;

    @PersistenceContext
    private EntityManager entityManager;

    AsyncAuditLogWriter(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Async("notificationExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void write(AuditEntry entry) {
        repository.save(build(entry));
    }

    AuditLog build(AuditEntry entry) {
        AuditLog audit = new AuditLog();
        if (entry.actorId() != null) {
            // use managed reference to avoid TransientObjectException in async tx
            try {
                User ref = entityManager.getReference(User.class, entry.actorId());
                audit.setActor(ref);
            } catch (Exception e) {
                User ref = new User();
                ref.setId(entry.actorId());
                audit.setActor(ref);
            }
        }
        audit.setAction(entry.action());
        audit.setTargetType(entry.targetType());
        audit.setTargetId(entry.targetId());
        String details = entry.details();
        audit.setDetails(details == null ? null : details.length() <= 2000 ? details : details.substring(0, 2000));
        audit.setOldValue(entry.oldValue());
        audit.setNewValue(entry.newValue());
        return audit;
    }
}
