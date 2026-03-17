package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.application.ScheduleTemplateService;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/schedule-templates")
public class ScheduleTemplateController {
  private final ScheduleTemplateService templateService;

  public ScheduleTemplateController(ScheduleTemplateService templateService) {
    this.templateService = templateService;
  }

  @GetMapping
  public ResponseEntity<List<ScheduleTemplateService.ScheduleTemplateDto>> list(
      @RequestParam(name = "sectorId") String sectorId
  ) {
    return ResponseEntity.ok(templateService.listBySector(sectorId));
  }

  @PostMapping
  public ResponseEntity<ScheduleTemplateService.ScheduleTemplateDto> create(
      @RequestBody ScheduleTemplateService.CreateScheduleTemplateRequest request
  ) {
    return ResponseEntity.ok(templateService.create(request));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ScheduleTemplateService.ScheduleTemplateDto> update(
      @PathVariable("id") String id,
      @RequestBody ScheduleTemplateService.UpdateScheduleTemplateRequest request
  ) {
    return ResponseEntity.ok(templateService.update(id, request));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable("id") String id) {
    templateService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/duplicate")
  public ResponseEntity<ScheduleTemplateService.ScheduleTemplateDto> duplicate(
      @PathVariable("id") String id,
      @RequestBody(required = false) ScheduleTemplateService.DuplicateScheduleTemplateRequest request
  ) {
    return ResponseEntity.ok(templateService.duplicate(id, request));
  }

  @PostMapping("/{id}/clear")
  public ResponseEntity<Void> clear(@PathVariable("id") String id) {
    templateService.clear(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping(value = "/{id}/export", produces = "text/csv")
  public ResponseEntity<byte[]> export(@PathVariable("id") String id) {
    byte[] csv = templateService.exportCsv(id);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"schedule_template.csv\"")
        .contentType(MediaType.parseMediaType("text/csv"))
        .body(csv);
  }

  @GetMapping("/{id}/shifts")
  public ResponseEntity<List<ScheduleTemplateService.ScheduleTemplateShiftDto>> listShifts(@PathVariable("id") String id) {
    return ResponseEntity.ok(templateService.listShifts(id));
  }

  @PostMapping("/{id}/shifts")
  public ResponseEntity<ScheduleTemplateService.ScheduleTemplateShiftDto> createShift(
      @PathVariable("id") String id,
      @RequestBody ScheduleTemplateService.CreateScheduleTemplateShiftRequest request
  ) {
    return ResponseEntity.ok(templateService.createShift(id, request));
  }

  @PutMapping("/shifts/{shiftId}")
  public ResponseEntity<ScheduleTemplateService.ScheduleTemplateShiftDto> updateShift(
      @PathVariable("shiftId") String shiftId,
      @RequestBody ScheduleTemplateService.UpdateScheduleTemplateShiftRequest request
  ) {
    return ResponseEntity.ok(templateService.updateShift(shiftId, request));
  }

  @DeleteMapping("/shifts/{shiftId}")
  public ResponseEntity<Void> deleteShift(@PathVariable("shiftId") String shiftId) {
    templateService.deleteShift(shiftId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/apply")
  public ResponseEntity<ScheduleTemplateService.ApplyResult> apply(
      @PathVariable("id") String id,
      @RequestBody ScheduleTemplateService.ApplyScheduleTemplateRequest request
  ) {
    return ResponseEntity.ok(templateService.apply(id, request));
  }
}
