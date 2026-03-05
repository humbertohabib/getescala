package com.getescala.backend.repository;

import com.getescala.backend.model.SolicitacaoTroca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SolicitacaoTrocaRepository extends JpaRepository<SolicitacaoTroca, UUID> {
    List<SolicitacaoTroca> findBySolicitanteId(UUID solicitanteId);
    List<SolicitacaoTroca> findByUsuarioDestinoId(UUID usuarioDestinoId);
    List<SolicitacaoTroca> findByTurnoId(UUID turnoId);
}