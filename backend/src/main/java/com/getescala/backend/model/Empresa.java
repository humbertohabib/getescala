package com.getescala.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "empresas")
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Column(unique = true)
    private String cnpj;

    @Column(name = "tipo_empresa")
    private String tipoEmpresa;

    private String responsavel;

    // Simplified for now, could be a separate Embeddable or proper JSON mapping
    @Column(columnDefinition = "jsonb")
    private String endereco;

    @Column(name = "telefone_contato")
    private String telefoneContato;

    private String plano;

    private String status;

    @CreationTimestamp
    @Column(name = "data_criacao", updatable = false)
    private LocalDateTime dataCriacao;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
