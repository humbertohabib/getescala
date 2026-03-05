package com.getescala.backend.repository;

import com.getescala.backend.model.MembroEmpresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MembroEmpresaRepository extends JpaRepository<MembroEmpresa, UUID> {
    List<MembroEmpresa> findByUsuarioId(UUID usuarioId);
    List<MembroEmpresa> findByEmpresaId(UUID empresaId);
}
