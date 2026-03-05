package com.getescala.backend.controller;

import com.getescala.backend.model.Disponibilidade;
import com.getescala.backend.security.UserPrincipal;
import com.getescala.backend.service.DisponibilidadeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/disponibilidades")
public class DisponibilidadeController {

    @Autowired
    private DisponibilidadeService disponibilidadeService;

    @GetMapping
    public List<Disponibilidade> getAll(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return disponibilidadeService.findByUsuarioId(userPrincipal.getId());
    }

    @GetMapping("/range")
    public List<Disponibilidade> getByDateRange(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return disponibilidadeService.findByUsuarioAndDateRange(userPrincipal.getId(), start, end);
    }

    @PostMapping
    public Disponibilidade create(@AuthenticationPrincipal UserPrincipal userPrincipal, @RequestBody Disponibilidade disponibilidade) {
        return disponibilidadeService.save(disponibilidade, userPrincipal.getId());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Disponibilidade> getById(@PathVariable UUID id) {
        return disponibilidadeService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        disponibilidadeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}