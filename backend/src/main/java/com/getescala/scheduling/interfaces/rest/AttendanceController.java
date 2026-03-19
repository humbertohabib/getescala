package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.application.AttendanceQueryService;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {
  private final AttendanceQueryService attendanceQueryService;

  public AttendanceController(AttendanceQueryService attendanceQueryService) {
    this.attendanceQueryService = attendanceQueryService;
  }

  @GetMapping
  public ResponseEntity<List<AttendanceQueryService.AttendanceRowDto>> list(
      @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
      @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
      @RequestParam(name = "scheduleId", required = false) String scheduleId,
      @RequestParam(name = "professionalId", required = false) String professionalId,
      @RequestParam(name = "kind", required = false) String kind
  ) {
    return ResponseEntity.ok(attendanceQueryService.list(from, to, scheduleId, professionalId, kind));
  }
}
