package com.getescala.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Entity
@Table(name = "escalas")
public class Escala {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @ManyToOne
    @JoinColumn(name = "empresa_id", nullable = false)
    private Empresa empresa;

    // Simplified relationship for now
    @Column(name = "setor_id")
    private UUID setorId;

    @Column(name = "local_id")
    private UUID localId;

    @ManyToOne
    @JoinColumn(name = "coordenador_id")
    private Usuario coordenador;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    private String tipo;

    private String status;
}
