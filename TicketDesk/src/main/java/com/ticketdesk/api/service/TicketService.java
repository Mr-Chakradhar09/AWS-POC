package com.ticketdesk.api.service;

import com.ticketdesk.api.model.Comment;
import com.ticketdesk.api.model.Ticket;
import com.ticketdesk.api.model.User;
import com.ticketdesk.api.model.Notification;
import com.ticketdesk.api.repository.CommentRepository;
import com.ticketdesk.api.repository.TicketRepository;
import com.ticketdesk.api.repository.UserRepository;
import com.ticketdesk.api.repository.NotificationRepository;
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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    public Ticket createTicket(Ticket ticket) {
        if (ticket.getStatus() == null) {
            ticket.setStatus("OPEN");
        }
        Ticket saved = ticketRepository.save(ticket);
        if (saved.getCreatorId() != null) {
            createNotification(saved.getCreatorId(), "Your ticket #" + saved.getId() + " has been successfully created.");
        }
        return saved;
    }

    public List<Ticket> getAllTickets(String role, Long userId) {
        if ("USER".equals(role)) {
            return ticketRepository.findByCreatorId(userId);
        } else if ("TECH".equals(role)) {
            return ticketRepository.findByAssigneeId(userId);
        }
        return ticketRepository.findAll(); // ADMIN sees all
    }

    public Ticket getTicket(Long id) {
        return ticketRepository.findById(id).orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    public Ticket updateTicketStatus(Long id, String status) {
        Ticket ticket = getTicket(id);
        ticket.setStatus(status);
        Ticket saved = ticketRepository.save(ticket);
        
        // Notify the creator that their ticket was updated
        if (ticket.getCreatorId() != null) {
            createNotification(ticket.getCreatorId(), "Your ticket #" + ticket.getId() + " status changed to " + status);
        }
        return saved;
    }

    public Ticket assignTicket(Long id, Long techId) {
        Ticket ticket = getTicket(id);
        ticket.setAssigneeId(techId);
        Ticket saved = ticketRepository.save(ticket);

        // Notify the tech they were assigned a ticket
        createNotification(techId, "You have been assigned to ticket #" + ticket.getId());
        
        // Notify the creator
        if (saved.getCreatorId() != null) {
            createNotification(saved.getCreatorId(), "Your ticket #" + saved.getId() + " has been assigned to a technician.");
        }
        return saved;
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

    public Map<String, Object> getDashboardStats(String role, Long userId) {
        List<Ticket> tickets = getAllTickets(role, userId);
        Map<String, Object> stats = new HashMap<>();
        
        Map<String, Long> byStatus = new HashMap<>();
        Map<String, Long> byPriority = new HashMap<>();
        
        for (Ticket t : tickets) {
            byStatus.put(t.getStatus(), byStatus.getOrDefault(t.getStatus(), 0L) + 1);
            byPriority.put(t.getPriority(), byPriority.getOrDefault(t.getPriority(), 0L) + 1);
        }
        
        stats.put("total", tickets.size());
        stats.put("byStatus", byStatus);
        stats.put("byPriority", byPriority);
        return stats;
    }

    private void createNotification(Long recipientId, String message) {
        Notification n = new Notification();
        n.setRecipientId(recipientId);
        n.setMessage(message);
        notificationRepository.save(n);
    }
}
