package com.example.chat_app_project.entity;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table (name = "roles")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, length = 20)
    private String name;
}
