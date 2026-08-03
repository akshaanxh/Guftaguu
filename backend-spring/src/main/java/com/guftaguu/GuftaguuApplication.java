package com.guftaguu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GuftaguuApplication {
    public static void main(String[] args) {
        SpringApplication.run(GuftaguuApplication.class, args);
    }
}
