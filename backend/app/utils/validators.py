import re
import json
from typing import Dict, Any, Optional
from config import SYSTEM_PROMPT

class ResponseValidator:
    @staticmethod
    def validate_json_response(response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate the structure of JSON responses against expected schema."""
        errors = []
        
        # Check if it's a non-graphical response
        if "analysis" in response_data and len(response_data) == 1:
            return {"valid": True, "errors": []}
            
        # Validate chart responses
        if "chart" not in response_data:
            errors.append("Missing required 'chart' field")
        else:
            errors.extend(ResponseValidator._validate_chart_structure(response_data["chart"]))
            
        if "analysis" not in response_data:
            errors.append("Missing required 'analysis' field")
        elif not isinstance(response_data["analysis"], str) or len(response_data["analysis"].split()) < 3:
            errors.append("Analysis must be 3-7 lines of text")
            
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }

    @staticmethod
    def _validate_chart_structure(chart_data: Dict[str, Any]) -> list[str]:
        """Validate the chart-specific structure."""
        errors = []
        valid_chart_types = ["bar", "pie", "line", "scatter", "radar", "area", "multiline", "polarArea"]
        
        if "type" not in chart_data:
            errors.append("Chart missing 'type' field")
        elif chart_data["type"] not in valid_chart_types:
            errors.append(f"Invalid chart type. Must be one of: {', '.join(valid_chart_types)}")
            
        if "title" not in chart_data:
            errors.append("Chart missing 'title' field")
        elif not isinstance(chart_data["title"], str):
            errors.append("Chart title must be a string")
            
        if "labels" not in chart_data:
            errors.append("Chart missing 'labels' field")
        elif not isinstance(chart_data["labels"], list):
            errors.append("Chart labels must be a list")
            
        if "datasets" not in chart_data:
            errors.append("Chart missing 'datasets' field")
        elif not isinstance(chart_data["datasets"], list):
            errors.append("Chart datasets must be a list")
            
        return errors

    @staticmethod
    def extract_json_error(error_text: str) -> str:
        """Extract meaningful error messages from JSON parse errors."""
        patterns = [
            (r"Expecting property name enclosed in double quotes", "Missing quotes around property names"),
            (r"Missing required field: (.+)", r"Missing required field: \1"),
            (r"Unexpected character found", "Invalid character in JSON"),
            (r"Expecting ':' delimiter", "Missing colon between property and value"),
            (r"Expecting ',' delimiter", "Missing comma between items"),
            (r"Invalid control character", "Contains invalid control characters"),
            (r"Unterminated string", "String value not properly closed"),
            (r"Invalid \\escape", "Invalid escape sequence"),
            (r"Invalid value", "Invalid JSON value"),
            (r"Extra data", "Extra content after JSON structure")
        ]
        
        for pattern, message in patterns:
            if re.search(pattern, error_text):
                return message
        return "Invalid JSON format"