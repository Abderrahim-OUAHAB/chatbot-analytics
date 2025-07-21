import json
import re
from typing import Dict, Any, Optional
from app.config import SYSTEM_PROMPT, RECOVERY_PROMPT

class ResponseFormatter:
    @staticmethod
    def format_response(raw_response: str, original_query: Optional[str] = None) -> Dict[str, Any]:
        """Format raw response into structured data with error recovery."""
        # First try to parse as clean JSON
        json_result = ResponseFormatter._try_parse_json(raw_response)
        if json_result["success"]:
            return json_result
            
        # Try to extract JSON from markdown
        extracted_json = ResponseFormatter._extract_json(raw_response)
        if extracted_json:
            json_result = ResponseFormatter._try_parse_json(extracted_json)
            if json_result["success"]:
                return json_result
                
        # Try to format as list if JSON fails
        list_result = ResponseFormatter._try_parse_list(raw_response)
        if list_result["success"]:
            return list_result
            
        # Recovery attempt for failed JSON
        if original_query:
            recovery_response = ResponseFormatter._attempt_recovery(raw_response, original_query)
            if recovery_response:
                return recovery_response
                
        # Final fallback to text
        return {
            "type": "text",
            "content": raw_response.strip(),
            "success": True,
            "error": None
        }

    @staticmethod
    def _try_parse_json(text: str) -> Dict[str, Any]:
        """Attempt to parse text as JSON with proper error handling."""
        try:
            parsed = json.loads(text)
            return {
                "type": "json",
                "content": parsed,
                "success": True,
                "error": None
            }
        except json.JSONDecodeError as e:
            return {
                "type": "json",
                "content": None,
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def _extract_json(text: str) -> Optional[str]:
        """Extract JSON from markdown or other formatted text."""
        patterns = [
            r"```json\n(.*?)\n```",  # ```json\n{...}\n```
            r"```(.*?)```",           # ```{...}```
            r"```(.*?)$",             # ```{...} (no closing)
            r"({.*})"                 # Raw JSON in text
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                return match.group(1).strip()
        return None

    @staticmethod
    def _try_parse_list(text: str) -> Dict[str, Any]:
        """Attempt to parse text as a list."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        items = []
        
        for line in lines:
            if line.startswith(("- ", "* ", "• ")):
                items.append(line[2:].strip())
            elif re.match(r"^\d+\.", line):
                items.append(re.sub(r"^\d+\.", "", line).strip())
            elif len(items) > 0 and line:  # Continue previous item
                items[-1] += " " + line
                
        if items:
            return {
                "type": "list",
                "content": items,
                "success": True,
                "error": None
            }
        return {
            "type": "list",
            "content": None,
            "success": False,
            "error": "No list items found"
        }

    @staticmethod
    def _attempt_recovery(failed_response: str, original_query: str) -> Optional[Dict[str, Any]]:
        """Attempt to recover from failed JSON parsing using the recovery prompt."""
        try:
            # Extract the most likely JSON error
            error_msg = extract_json_error(failed_response)
            
            # Format recovery prompt
            recovery_prompt = RECOVERY_PROMPT.format(
                errors=error_msg,
                query=original_query
            )
            
            # Here you would typically send to your LLM for recovery
            # For now we'll just return None since we don't have the LLM context
            return None
        except Exception:
            return None