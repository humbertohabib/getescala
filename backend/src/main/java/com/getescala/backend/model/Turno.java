package com.getescala.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "turnos")
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "escala_id", nullable = false)
    private Escala escala;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fim", nullable = false)
    private LocalTime horaFim;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "valor_plantao")
    private BigDecimal valorPlantao;

    private String status; // VAGO, OCUPADO, TROCA_SOLICITADA, ANUNCIADO, DIVIDIDO

    @Column(name = "max_distance")
    private Integer maxDistance;

    @ManyToOne
    @JoinColumn(name = "parent_turno_id")
    private Turno parentTurno;

    @ManyToMany
    @JoinTable(
        name = "turno_candidatos",
        joinColumns = @JoinColumn(name = "turno_id"),
        inverseJoinColumns = @JoinColumn(name = "usuario_id")
    )
    private java.util.Set<Usuario> candidatos = new java.util.HashSet<>();
}
