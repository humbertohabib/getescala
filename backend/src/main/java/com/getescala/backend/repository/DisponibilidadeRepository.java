package com.getescala.backend.repository;

import com.getescala.backend.model.Disponibilidade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface DisponibilidadeRepository extends JpaRepository<Disponibilidade, UUID> {
    List<Disponibilidade> findByUsuarioId(UUID usuarioId);
    
    // Find specific (non-recurring) availabilities in a date range
    List<Disponibilidade> findByUsuarioIdAndIsRecurringFalseAndStartDateBetween(UUID usuarioId, LocalDate start, LocalDate end);
    
    // Find recurring availabilities for a user
    List<Disponibilidade> findByUsuarioIdAndIsRecurringTrue(UUID usuarioId);
}