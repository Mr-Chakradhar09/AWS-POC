package com.ticketdesk.api.config;

import com.ticketdesk.api.model.User;
import com.ticketdesk.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword("admin123");
            admin.setRole("ADMIN");
            userRepository.save(admin);

            User tech = new User();
            tech.setUsername("tech");
            tech.setPassword("tech123");
            tech.setRole("TECH");
            userRepository.save(tech);

            User user = new User();
            user.setUsername("user");
            user.setPassword("user123");
            user.setRole("USER");
            userRepository.save(user);
        }
    }
}
