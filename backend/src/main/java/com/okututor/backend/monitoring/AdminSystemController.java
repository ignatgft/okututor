package com.okututor.backend.monitoring;

import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/system")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminSystemController {

    @GetMapping("/resources")
    public Map<String, Object> resources() {
        Map<String, Object> out = new LinkedHashMap<>();
        Runtime rt = Runtime.getRuntime();
        OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
        MemoryMXBean mem = ManagementFactory.getMemoryMXBean();
        com.sun.management.OperatingSystemMXBean sunOs = (os instanceof com.sun.management.OperatingSystemMXBean s) ? s : null;

        long totalMem = rt.totalMemory();
        long freeMem = rt.freeMemory();
        long maxMem = rt.maxMemory();
        long usedMem = totalMem - freeMem;
        long heapUsed = mem.getHeapMemoryUsage().getUsed();
        long heapMax = mem.getHeapMemoryUsage().getMax();
        long nonHeapUsed = mem.getNonHeapMemoryUsage().getUsed();
        double cpuLoad = sunOs != null ? sunOs.getCpuLoad() : os.getSystemLoadAverage();
        double processCpu = sunOs != null ? sunOs.getProcessCpuLoad() : -1;
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        int availableProcessors = rt.availableProcessors();
        int threadCount = ManagementFactory.getThreadMXBean().getThreadCount();

        File root = new File("/");
        long diskTotal = root.getTotalSpace();
        long diskFree = root.getFreeSpace();
        long diskUsable = root.getUsableSpace();

        Map<String, Object> jvmMap = new LinkedHashMap<>();
        jvmMap.put("totalMemoryBytes", totalMem);
        jvmMap.put("freeMemoryBytes", freeMem);
        jvmMap.put("usedMemoryBytes", usedMem);
        jvmMap.put("maxMemoryBytes", maxMem);
        jvmMap.put("heapUsedBytes", heapUsed);
        jvmMap.put("heapMaxBytes", heapMax < 0 ? maxMem : heapMax);
        jvmMap.put("nonHeapUsedBytes", nonHeapUsed);
        jvmMap.put("availableProcessors", availableProcessors);
        jvmMap.put("threadCount", threadCount);
        jvmMap.put("uptimeMs", uptimeMs);
        jvmMap.put("uptimeHuman", formatDuration(uptimeMs));
        out.put("jvm", jvmMap);
        out.put("os", Map.of(
                "name", os.getName(),
                "arch", os.getArch(),
                "version", os.getVersion(),
                "systemLoadAverage", os.getSystemLoadAverage(),
                "cpuLoad", cpuLoad < 0 ? 0 : cpuLoad,
                "processCpuLoad", processCpu < 0 ? 0 : processCpu
        ));
        out.put("disk", Map.of(
                "totalBytes", diskTotal,
                "freeBytes", diskFree,
                "usableBytes", diskUsable,
                "usedBytes", diskTotal - diskFree
        ));
        out.put("timestamp", java.time.Instant.now().toString());
        return out;
    }

    private static String formatDuration(long ms) {
        Duration d = Duration.ofMillis(ms);
        long h = d.toHours();
        long m = d.toMinutesPart();
        long s = d.toSecondsPart();
        if (h > 0) return h + "ч " + m + "м";
        if (m > 0) return m + "м " + s + "с";
        return s + "с";
    }
}
