package com.ticketdesk.api.service;

import com.ticketdesk.api.model.Comment;
import com.ticketdesk.api.model.Ticket;
import com.ticketdesk.api.repository.CommentRepository;
import com.ticketdesk.api.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TicketService {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private CommentRepository commentRepository;

    public Ticket createTicket(Ticket ticket) {
        if (ticket.getStatus() == null) {
            ticket.setStatus("OPEN");
        }
        return ticketRepository.save(ticket);
    }

    public List<Ticket> getAllTickets(String status, String priority, String category) {
        if (status != null) return ticketRepository.findByStatus(status);
        if (priority != null) return ticketRepository.findByPriority(priority);
        if (category != null) return ticketRepository.findByCategory(category);
        return ticketRepository.findAll();
    }

    public Ticket getTicket(Long id) {
        return ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    public Ticket updateTicketStatus(Long id, String status) {
        Ticket ticket = getTicket(id);
        ticket.setStatus(status);
        return ticketRepository.save(ticket);
    }

    public Comment addComment(Long ticketId, Comment comment) {
        Ticket ticket = getTicket(ticketId);
        comment.setTicket(ticket);
        return commentRepository.save(comment);
    }

    public Ticket addAttachment(Long ticketId, String attachmentUrl) {
        Ticket ticket = getTicket(ticketId);
        ticket.setAttachmentUrl(attachmentUrl);
        return ticketRepository.save(ticket);
    }

    public Map<String, Object> getDashboardStats() {
        List<Ticket> allTickets = ticketRepository.findAll();
        Map<String, Object> stats = new HashMap<>();
        
        Map<String, Long> byStatus = new HashMap<>();
        Map<String, Long> byPriority = new HashMap<>();
        
        for (Ticket t : allTickets) {
            byStatus.put(t.getStatus(), byStatus.getOrDefault(t.getStatus(), 0L) + 1);
            byPriority.put(t.getPriority(), byPriority.getOrDefault(t.getPriority(), 0L) + 1);
        }
        
        stats.put("total", allTickets.size());
        stats.put("byStatus", byStatus);
        stats.put("byPriority", byPriority);
        return stats;
    }
}
