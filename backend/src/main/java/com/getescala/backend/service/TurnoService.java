package com.getescala.backend.service;

import com.getescala.backend.model.SolicitacaoTroca;
import com.getescala.backend.model.Turno;
import com.getescala.backend.model.Usuario;
import com.getescala.backend.repository.SolicitacaoTrocaRepository;
import com.getescala.backend.repository.TurnoRepository;
import com.getescala.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Service
public class TurnoService {

    @Autowired
    private TurnoRepository turnoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private SolicitacaoTrocaRepository solicitacaoTrocaRepository;

    @Transactional
    public void applyForTurno(UUID turnoId, UUID usuarioId) {
        Turno turno = turnoRepository.findById(turnoId)
                .orElseThrow(() -> new RuntimeException("Turno not found"));
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario not found"));

        if (!"VAGO".equals(turno.getStatus())) {
            throw new RuntimeException("Turno is not available");
        }

        turno.getCandidatos().add(usuario);
        turno.setStatus("CANDIDATURA_PENDENTE");
        turnoRepository.save(turno);
    }

    @Transactional
    public void approveCandidate(UUID turnoId, UUID usuarioId) {
        Turno turno = turnoRepository.findById(turnoId)
                .orElseThrow(() -> new RuntimeException("Turno not found"));
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario not found"));

        if (!turno.getCandidatos().contains(usuario)) {
            throw new RuntimeException("User is not a candidate for this turno");
        }

        turno.setUsuario(usuario);
        turno.setStatus("OCUPADO");
        turno.getCandidatos().clear(); // Clear candidates after assignment
        turnoRepository.save(turno);
    }

    @Transactional
    public SolicitacaoTroca requestSwap(UUID turnoId, UUID solicitanteId, UUID usuarioDestinoId) {
        Turno turno = turnoRepository.findById(turnoId)
                .orElseThrow(() -> new RuntimeException("Turno not found"));
        Usuario solicitante = usuarioRepository.findById(solicitanteId)
                .orElseThrow(() -> new RuntimeException("Solicitante not found"));
        
        if (!solicitante.equals(turno.getUsuario())) {
             throw new RuntimeException("User does not own this turno");
        }

        SolicitacaoTroca solicitacao = new SolicitacaoTroca();
        solicitacao.setTurno(turno);
        solicitacao.setSolicitante(solicitante);
        solicitacao.setStatus("PENDENTE");

        if (usuarioDestinoId != null) {
            Usuario destino = usuarioRepository.findById(usuarioDestinoId)
                    .orElseThrow(() -> new RuntimeException("Usuario destino not found"));
            solicitacao.setUsuarioDestino(destino);
        }

        turno.setStatus("TROCA_SOLICITADA");
        turnoRepository.save(turno);
        
        return solicitacaoTrocaRepository.save(solicitacao);
    }

    @Transactional
    public void approveSwap(UUID solicitacaoId) {
        SolicitacaoTroca solicitacao = solicitacaoTrocaRepository.findById(solicitacaoId)
                .orElseThrow(() -> new RuntimeException("Solicitacao not found"));

        if (!"PENDENTE".equals(solicitacao.getStatus())) {
            throw new RuntimeException("Solicitacao is not pending");
        }

        Turno turno = solicitacao.getTurno();
        
        if (solicitacao.getUsuarioDestino() != null) {
            turno.setUsuario(solicitacao.getUsuarioDestino());
            turno.setStatus("OCUPADO"); // Or TROCA_APROVADA
        } else {
            // If open swap, maybe set to VAGO? Or keep as is until someone takes it?
            // Assuming approval means the swap is finalized.
            // If no destination user, maybe it just becomes VAGO?
            turno.setUsuario(null);
            turno.setStatus("VAGO");
        }

        solicitacao.setStatus("APROVADO");
        solicitacao.setDataAprovacao(LocalDateTime.now());
        
        turnoRepository.save(turno);
        solicitacaoTrocaRepository.save(solicitacao);
    }

    @Transactional
    public void splitTurno(UUID turnoId, LocalTime splitTime) {
        Turno originalTurno = turnoRepository.findById(turnoId)
                .orElseThrow(() -> new RuntimeException("Turno not found"));

        if (splitTime.isBefore(originalTurno.getHoraInicio()) || splitTime.isAfter(originalTurno.getHoraFim())) {
            throw new RuntimeException("Split time must be within turno hours");
        }

        // Create new Turno for the second part
        Turno newTurno = new Turno();
        newTurno.setEscala(originalTurno.getEscala());
        newTurno.setData(originalTurno.getData());
        newTurno.setHoraInicio(splitTime);
        newTurno.setHoraFim(originalTurno.getHoraFim());
        newTurno.setStatus("VAGO"); // Or inherit status? usually split part is VAGO or assigned to same user?
        // Assuming split means "I work until X, then it's free/someone else"
        newTurno.setParentTurno(originalTurno);
        newTurno.setValorPlantao(originalTurno.getValorPlantao()); // Should recalculate based on hours

        // Update original Turno
        originalTurno.setHoraFim(splitTime);

        turnoRepository.save(originalTurno);
        turnoRepository.save(newTurno);
    }
}