package com.guftaguu.model;

import lombok.Data;

/**
 * Request body for POST /api/report
 */
@Data
public class ReportRequest {
    private String title;
    private String description;
    private String type;
}
