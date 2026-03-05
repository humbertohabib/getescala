package com.getescala.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "membros_empresa")
public class MembroEmpresa {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "empresa_id", nullable = false)
    private Empresa empresa;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    private String papel; // ADMIN, COORDENADOR, USUARIO

    private String status;

    @CreationTimestamp
    @Column(name = "data_entrada", updatable = false)
    private LocalDateTime dataEntrada;
}
