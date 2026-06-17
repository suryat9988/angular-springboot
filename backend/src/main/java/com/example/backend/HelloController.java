package com.example.backend;

import java.time.OffsetDateTime;
import java.util.Map;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class HelloController {

	@GetMapping("/hello")
	public Map<String, Object> hello(@RequestParam(defaultValue = "World") String name) {
		return Map.of(
				"message", "Hello, " + name + "! Greetings from Spring Boot.",
				"timestamp", OffsetDateTime.now().toString());
	}
}
