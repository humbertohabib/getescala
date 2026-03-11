package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.application.AttendanceExportService;
import java.time.OffsetDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceExportController {
  private final AttendanceExportService attendanceExportService;

  public AttendanceExportController(AttendanceExportService attendanceExportService) {
    this.attendanceExportService = attendanceExportService;
  }

  @GetMapping(value = "/export", produces = "text/csv")
  public ResponseEntity<byte[]> export(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
      @RequestParam(required = false) String scheduleId,
      @RequestParam(required = false) String professionalId
  ) {
    byte[] csv = attendanceExportService.exportCsv(from, to, scheduleId, professionalId);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance.csv\"")
        .contentType(MediaType.parseMediaType("text/csv"))
        .body(csv);
  }
}
