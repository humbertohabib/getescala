package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.application.ScheduleService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {
  private final ScheduleService scheduleService;

  public ScheduleController(ScheduleService scheduleService) {
    this.scheduleService = scheduleService;
  }

  @GetMapping
  public ResponseEntity<List<ScheduleService.ScheduleDto>> list(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
  ) {
    return ResponseEntity.ok(scheduleService.list(from, to));
  }

  @PostMapping
  public ResponseEntity<ScheduleService.ScheduleDto> create(
      @RequestBody @Valid ScheduleService.CreateScheduleRequest request
  ) {
    return ResponseEntity.ok(scheduleService.create(request));
  }

  @PostMapping("/{id}/publish")
  public ResponseEntity<ScheduleService.ScheduleDto> publish(@PathVariable("id") String id) {
    return ResponseEntity.ok(scheduleService.publish(id));
  }

  @PostMapping("/{id}/lock")
  public ResponseEntity<ScheduleService.ScheduleDto> lock(@PathVariable("id") String id) {
    return ResponseEntity.ok(scheduleService.lock(id));
  }
}
