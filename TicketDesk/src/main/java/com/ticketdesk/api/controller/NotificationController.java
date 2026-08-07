package com.ticketdesk.api.controller;

import com.ticketdesk.api.model.Notification;
import com.ticketdesk.api.model.User;
import com.ticketdesk.api.repository.NotificationRepository;
import com.ticketdesk.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id) {
        Notification n = notificationRepository.findById(id).orElseThrow();
        n.setRead(true);
        return ResponseEntity.ok(notificationRepository.save(n));
    }

    @PostMapping("/request-tickets")
    public ResponseEntity<String> requestTickets(@RequestHeader(value="X-User-Id", required=true) Long userId) {
        User tech = userRepository.findById(userId).orElseThrow();
        
        // Find all admins and notify them
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            if ("ADMIN".equals(u.getRole())) {
                Notification n = new Notification();
                n.setRecipientId(u.getId());
                n.setMessage("IT Tech '" + tech.getUsername() + "' is requesting more tickets to work on.");
                notificationRepository.save(n);
            }
        }
        return ResponseEntity.ok("Request sent to Admins");
    }
}
