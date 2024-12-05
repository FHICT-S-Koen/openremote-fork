package org.openremote.manager.syslog;

import org.openremote.model.syslog.SyslogCategory;
import org.openremote.model.syslog.SyslogLevel;
import org.openremote.model.syslog.SyslogEvent;

import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

public class CacheLoggingService {

    private static final Logger LOG = Logger.getLogger(CacheLoggingService.class.getName());
    private final SyslogService syslogService;

    public CacheLoggingService(SyslogService syslogService) {
        this.syslogService = syslogService;
    }

    // Method to log cache hits
    public void logCacheHit(String cacheName, Object key) {
        String message = String.format("Cache hit: Cache='%s', Key='%s'", cacheName, key);
        log(message, SyslogLevel.INFO);
    }

    // Method to log cache misses
    public void logCacheMiss(String cacheName, Object key) {
        String message = String.format("Cache miss: Cache='%s', Key='%s'", cacheName, key);
        log(message, SyslogLevel.WARNING);
    }

    // Method to log cache evictions
    public void logCacheEviction(String cacheName, Object key) {
        String message = String.format("Cache eviction: Cache='%s', Key='%s'", cacheName, key);
        log(message, SyslogLevel.WARNING);
    }

    // General log method
    private void log(String message, SyslogLevel level) {
        SyslogEvent syslogEvent = new SyslogEvent(
            SyslogCategory.CACHE, // Use the cache category
            "Cache",
            level,
            message,
            null // No specific sub-category needed
        );

        // Log with SyslogService
        syslogService.publish(new LogRecord(level.toJulLevel(), message));

        // Optional: Log to console as well
        LOG.log(Level.INFO, message);
    }
}
