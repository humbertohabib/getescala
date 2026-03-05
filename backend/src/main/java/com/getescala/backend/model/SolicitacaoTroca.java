package com.getescala.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "solicitacoes_troca")
public class SolicitacaoTroca {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "turno_id", nullable = false)
    private Turno turno;

    @ManyToOne
    @JoinColumn(name = "solicitante_id", nullable = false)
    private Usuario solicitante;

    @ManyToOne
    @JoinColumn(name = "usuario_destino_id")
    private Usuario usuarioDestino;

    @Column(nullable = false)
    private String status; // PENDENTE, APROVADO, REJEITADO

    @CreationTimestamp
    @Column(name = "data_solicitacao", updatable = false)
    private LocalDateTime dataSolicitacao;

    @Column(name = "data_aprovacao")
    private LocalDateTime dataAprovacao;
}