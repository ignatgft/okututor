package com.okututor.backend.common.config;

import com.zaxxer.hikari.HikariDataSource;
import java.util.HashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Read replica routing: readOnly transactions → replica, write → primary.
 * Disabled by default (DB_REPLICA_ENABLED=false). When enabled, replica URL must be set.
 * No auto-migration — explicit opt-in via env.
 */
@Configuration
public class ReplicaDataSourceConfig {

    @Bean
    @ConditionalOnProperty(name = "spring.datasource.replica.enabled", havingValue = "true")
    @Primary
    public DataSource routingDataSource(
            @Value("${spring.datasource.url}") String primaryUrl,
            @Value("${spring.datasource.username}") String primaryUser,
            @Value("${spring.datasource.password}") String primaryPass,
            @Value("${spring.datasource.replica.url}") String replicaUrl,
            @Value("${spring.datasource.replica.username}") String replicaUser,
            @Value("${spring.datasource.replica.password}") String replicaPass,
            @Value("${spring.datasource.hikari.maximum-pool-size:25}") int maxPool) {

        HikariDataSource primary = new HikariDataSource();
        primary.setJdbcUrl(primaryUrl);
        primary.setUsername(primaryUser);
        primary.setPassword(primaryPass);
        primary.setMaximumPoolSize(maxPool);
        primary.setPoolName("HikariPrimary");

        HikariDataSource replica = new HikariDataSource();
        replica.setJdbcUrl(replicaUrl);
        replica.setUsername(replicaUser);
        replica.setPassword(replicaPass);
        replica.setMaximumPoolSize(Math.max(5, maxPool / 2));
        replica.setPoolName("HikariReplica");
        replica.setReadOnly(true);

        AbstractRoutingDataSource routing = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                return TransactionSynchronizationManager.isCurrentTransactionReadOnly() ? "replica" : "primary";
            }
        };
        Map<Object, Object> ds = new HashMap<>();
        ds.put("primary", primary);
        ds.put("replica", replica);
        routing.setTargetDataSources(ds);
        routing.setDefaultTargetDataSource(primary);
        routing.afterPropertiesSet();
        return new LazyConnectionDataSourceProxy(routing);
    }
}
