package com.skills;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Hello world!
 *
 */

@SpringBootApplication
public class App implements CommandLineRunner
{
    public static void main( String[] args )
    {
        System.out.println( "Food Chain Service Started!!!!" );
        SpringApplication.run(App.class);
    }

    @Override
    public void run(String[] args) throws Exception {
        System.out.println("Run Method Started");
    }
}
