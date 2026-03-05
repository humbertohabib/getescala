package com.getescala.backend.service;

import com.getescala.backend.model.Disponibilidade;
import com.getescala.backend.model.Usuario;
import com.getescala.backend.repository.DisponibilidadeRepository;
import com.getescala.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class DisponibilidadeService {

    @Autowired
    private DisponibilidadeRepository disponibilidadeRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    public List<Disponibilidade> findByUsuarioId(UUID usuarioId) {
        return disponibilidadeRepository.findByUsuarioId(usuarioId);
    }

    public Optional<Disponibilidade> findById(UUID id) {
        return disponibilidadeRepository.findById(id);
    }

    public Disponibilidade save(Disponibilidade disponibilidade, UUID usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario not found"));
        disponibilidade.setUsuario(usuario);
        return disponibilidadeRepository.save(disponibilidade);
    }

    public void delete(UUID id) {
        disponibilidadeRepository.deleteById(id);
    }

    public List<Disponibilidade> findByUsuarioAndDateRange(UUID usuarioId, LocalDate start, LocalDate end) {
        // Return both recurring (all) and specific (in range)
        List<Disponibilidade> specific = disponibilidadeRepository.findByUsuarioIdAndIsRecurringFalseAndStartDateBetween(usuarioId, start, end);
        List<Disponibilidade> recurring = disponibilidadeRepository.findByUsuarioIdAndIsRecurringTrue(usuarioId);
        
        specific.addAll(recurring);
        return specific;
    }
}