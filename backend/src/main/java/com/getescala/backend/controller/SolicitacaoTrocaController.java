package com.getescala.backend.controller;

import com.getescala.backend.model.SolicitacaoTroca;
import com.getescala.backend.repository.SolicitacaoTrocaRepository;
import com.getescala.backend.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/solicitacoes-troca")
public class SolicitacaoTrocaController {

    @Autowired
    private SolicitacaoTrocaRepository solicitacaoTrocaRepository;

    @GetMapping("/minhas")
    public List<SolicitacaoTroca> getMyRequests(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return solicitacaoTrocaRepository.findBySolicitanteId(userPrincipal.getId());
    }

    @GetMapping("/recebidas")
    public List<SolicitacaoTroca> getReceivedRequests(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return solicitacaoTrocaRepository.findByUsuarioDestinoId(userPrincipal.getId());
    }
    
    // For coordinators:
    // @GetMapping("/turno/{turnoId}") ...
}