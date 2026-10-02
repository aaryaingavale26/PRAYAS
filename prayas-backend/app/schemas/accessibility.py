from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AccessibilityProfile(BaseModel):
    """
    Pydantic schema representing a user's Accessibility Passport profile.
    All fields are optional to allow incremental profile completion.
    """

    user_id: Optional[str] = Field(default=None, description="Unique user identifier (UUID)")
    disability_type: Optional[str] = Field(default=None, description="Type of disability (e.g. Visual, Motor, Auditory, Cognitive)")
    preferred_assistance: Optional[List[str]] = Field(
        default_factory=list,
        description="Assistance modes requested (e.g. screen reader, simplified forms, voice navigation)",
    )
    preferred_language: Optional[str] = Field(default="en", description="Preferred interaction language code")
    accessibility_preferences: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Detailed accessibility settings (font size, contrast, speech rate, etc.)",
    )
    created_at: Optional[datetime] = Field(default=None, description="Timestamp when profile was created")

    model_config = {
        "json_schema_extra": {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "disability_type": "Visual Impairment",
                "preferred_assistance": ["Screen Reader Optimization", "High Contrast"],
                "preferred_language": "en",
                "accessibility_preferences": {
                    "font_scale": 1.5,
                    "voice_speed": 1.0,
                    "high_contrast": True,
                },
            }
        }
    }
