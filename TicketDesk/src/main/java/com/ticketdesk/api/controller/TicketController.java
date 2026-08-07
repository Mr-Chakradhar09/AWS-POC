package com.ticketdesk.api.controller;

import com.ticketdesk.api.model.Comment;
import com.ticketdesk.api.model.Ticket;
import com.ticketdesk.api.service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @Value("${aws.s3.bucket:ticketdesk-attachments}")
    private String bucketName;

    @Value("${aws.region:us-east-1}")
    private String awsRegion;

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping("/tickets")
    public ResponseEntity<Ticket> createTicket(@RequestBody Ticket ticket, @RequestHeader(value="X-User-Id", required=false) Long userId) {
        if (userId != null) {
            ticket.setCreatorId(userId);
        }
        return ResponseEntity.ok(ticketService.createTicket(ticket));
    }

    @GetMapping("/tickets")
    public ResponseEntity<List<Ticket>> getTickets(
            @RequestHeader(value="X-User-Role", required=false) String role,
            @RequestHeader(value="X-User-Id", required=false) Long userId) {
        return ResponseEntity.ok(ticketService.getAllTickets(role, userId));
    }

    @GetMapping("/tickets/{id}")
    public ResponseEntity<Ticket> getTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicket(id));
    }

    @PatchMapping("/tickets/{id}/status")
    public ResponseEntity<Ticket> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, payload.get("status")));
    }

    @PatchMapping("/tickets/{id}/assign")
    public ResponseEntity<Ticket> assignTicket(@PathVariable Long id, @RequestBody Map<String, Long> payload) {
        return ResponseEntity.ok(ticketService.assignTicket(id, payload.get("assigneeId")));
    }

    @PostMapping("/tickets/{id}/comments")
    public ResponseEntity<Comment> addComment(@PathVariable Long id, @RequestBody Comment comment) {
        return ResponseEntity.ok(ticketService.addComment(id, comment));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestHeader(value="X-User-Role", required=false) String role,
            @RequestHeader(value="X-User-Id", required=false) Long userId) {
        return ResponseEntity.ok(ticketService.getDashboardStats(role, userId));
    }

    @GetMapping("/tickets/{id}/upload-url")
    public ResponseEntity<Map<String, String>> getPresignedUrl(@PathVariable Long id, @RequestParam String filename) {
        String objectKey = "attachments/ticket-" + id + "/" + UUID.randomUUID() + "-" + filename;
        try (S3Presigner presigner = S3Presigner.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build()) {
            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .putObjectRequest(b -> b.bucket(bucketName).key(objectKey).build())
                    .build();
            String url = presigner.presignPutObject(presignRequest).url().toString();
            return ResponseEntity.ok(Map.of("uploadUrl", url, "objectKey", objectKey));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("uploadUrl", "http://localhost:9090/mock-upload", "objectKey", objectKey));
        }
    }

    @PostMapping("/tickets/{id}/attachments")
    public ResponseEntity<Ticket> addAttachment(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(ticketService.addAttachment(id, payload.get("attachmentUrl")));
    }
}
