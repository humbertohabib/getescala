package com.getescala.backend.repository;

import com.getescala.backend.model.Turno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface TurnoRepository extends JpaRepository<Turno, UUID> {
    List<Turno> findByEscalaId(UUID escalaId);
    List<Turno> findByUsuarioId(UUID usuarioId);
    List<Turno> findByUsuarioIdAndDataBetween(UUID usuarioId, LocalDate startDate, LocalDate endDate);
}
