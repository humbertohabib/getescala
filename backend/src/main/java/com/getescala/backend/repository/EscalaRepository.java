package com.getescala.backend.repository;

import com.getescala.backend.model.Escala;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EscalaRepository extends JpaRepository<Escala, UUID> {
    List<Escala> findByEmpresaId(UUID empresaId);
}
