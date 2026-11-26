package com.okututor.backend.admin;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * неизменяемый след привилегированных действий (блокировки, смена роли, модерация).
 * Пишется асинхронно (notificationExecutor) и в независимой транзакции:
 * аудит не увеличивает latency HTTP-запроса и не блокируется его rollback-ом.
 */
@Service
public class AuditLogService {

    private final AuditLogRepository repository;
    private final AsyncAuditLogWriter writer;

    public AuditLogService(AuditLogRepository repository, AsyncAuditLogWriter writer) {
        this.repository = repository;
        this.writer = writer;
    }

    /**
     * Запись откладывается до успешного коммита вызывающей транзакции: пока она не завершена,
     * actor_id не виден из потока notificationExecutor и insert падает по внешнему ключу.
     * Откат транзакции бизнес-операции не должен оставлять запись аудита.
     */
    public void log(AuditEntry entry) {
        if (entry == null) return;
        if (TransactionSynchronizationManager.isSynchronizationActive()
                && TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    writer.write(entry);
                }
            });
        } else {
            writer.write(entry);
        }
    }

    /** синхронная запись в той же транзакции (для таймлайна заявки): не «best-effort», молчит об ошибках. */
    @Transactional
    public void logSync(AuditEntry entry) {
        repository.saveAndFlush(writer.build(entry));
    }
}
