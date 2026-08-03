package com.guftaguu.config;

import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

/**
 * Configures and creates the netty-socketio server configuration bean.
 * The actual server start/stop lifecycle is managed by SocketIOServerRunner.
 */
@org.springframework.context.annotation.Configuration
public class SocketIOConfig {

    @Value("${socketio.host:0.0.0.0}")
    private String host;

    @Value("${socketio.port:3001}")
    private int port;

    @Value("${socketio.allowed-origins:http://localhost:5173,https://guftaguu.vercel.app}")
    private String allowedOrigins;

    @Value("${socketio.ping-timeout:60000}")
    private int pingTimeout;

    @Value("${socketio.ping-interval:10000}")
    private int pingInterval;

    @Bean
    public com.corundumstudio.socketio.SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setHostname(host);
        config.setPort(port);

        // Allow frontend origins
        config.setOrigin(allowedOrigins);

        // Same ping settings as Node.js socket/index.js
        config.setPingTimeout(pingTimeout);
        config.setPingInterval(pingInterval);

        // Allow address reuse so server can restart quickly
        SocketConfig socketConfig = new SocketConfig();
        socketConfig.setReuseAddress(true);
        config.setSocketConfig(socketConfig);

        // Use random session IDs (UUID-based)
        config.setRandomSession(true);

        return new com.corundumstudio.socketio.SocketIOServer(config);
    }
}
