package com.getescala.backend.controller;

import com.getescala.backend.model.SolicitacaoTroca;
import com.getescala.backend.security.UserPrincipal;
import com.getescala.backend.service.TurnoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/turnos")
public class TurnoController {

    @Autowired
    private TurnoService turnoService;

    @PostMapping("/{id}/apply")
    public ResponseEntity<Void> apply(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal userPrincipal) {
        turnoService.applyForTurno(id, userPrincipal.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/approve-candidate/{usuarioId}")
    public ResponseEntity<Void> approveCandidate(@PathVariable UUID id, @PathVariable UUID usuarioId) {
        // Only coordinator/admin should do this. For now, assume auth is enough or add @PreAuthorize
        turnoService.approveCandidate(id, usuarioId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/swap")
    public ResponseEntity<SolicitacaoTroca> requestSwap(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) UUID usuarioDestinoId) {
        return ResponseEntity.ok(turnoService.requestSwap(id, userPrincipal.getId(), usuarioDestinoId));
    }

    @PostMapping("/swaps/{solicitacaoId}/approve")
    public ResponseEntity<Void> approveSwap(@PathVariable UUID solicitacaoId) {
        // Only coordinator/admin
        turnoService.approveSwap(solicitacaoId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/split")
    public ResponseEntity<Void> splitTurno(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime splitTime) {
        // Only coordinator/admin
        turnoService.splitTurno(id, splitTime);
        return ResponseEntity.ok().build();
    }
}