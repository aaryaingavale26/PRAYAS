from pydantic import BaseModel, Field


class GeminiTestRequest(BaseModel):
    """
    Request payload for the basic Gemini test endpoint.
    """
    prompt: str = Field(..., min_length=1, description="Text prompt to send to Google Gemini")

    model_config = {
        "json_schema_extra": {
            "example": {
                "prompt": "Explain what an accessible job application is in simple words."
            }
        }
    }


class GeminiTestResponse(BaseModel):
    """
    Response payload from the Gemini test endpoint.
    """
    success: bool = Field(default=True, description="Indicates whether the generation succeeded")
    response: str = Field(..., description="Generated text response from the Gemini model")

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "response": "An accessible job application is a job application designed so that people with various disabilities can easily read, understand, navigate, and submit it."
            }
        }
    }
