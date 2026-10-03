import json
import logging
import re
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.services.gemini_service import generate_text, is_gemini_configured

logger = logging.getLogger(__name__)


class BhashiniServiceError(Exception):
    """Raised when an operation in the Bhashini service fails."""
    pass


# Comprehensive catalog of supported Indian languages, dialects, and scripts
SUPPORTED_LANGUAGES: Dict[str, Dict[str, str]] = {
    "en": {
        "code": "en",
        "bcp47": "en-IN",
        "name": "English",
        "nativeName": "English",
        "script": "Latin",
    },
    "hi": {
        "code": "hi",
        "bcp47": "hi-IN",
        "name": "Hindi",
        "nativeName": "हिन्दी",
        "script": "Devanagari",
    },
    "ta": {
        "code": "ta",
        "bcp47": "ta-IN",
        "name": "Tamil",
        "nativeName": "தமிழ்",
        "script": "Tamil",
    },
    "te": {
        "code": "te",
        "bcp47": "te-IN",
        "name": "Telugu",
        "nativeName": "తెలుగు",
        "script": "Telugu",
    },
    "bn": {
        "code": "bn",
        "bcp47": "bn-IN",
        "name": "Bengali",
        "nativeName": "বাংলা",
        "script": "Bengali",
    },
    "mr": {
        "code": "mr",
        "bcp47": "mr-IN",
        "name": "Marathi",
        "nativeName": "मराठी",
        "script": "Devanagari",
    },
    "gu": {
        "code": "gu",
        "bcp47": "gu-IN",
        "name": "Gujarati",
        "nativeName": "ગુજરાતી",
        "script": "Gujarati",
    },
    "kn": {
        "code": "kn",
        "bcp47": "kn-IN",
        "name": "Kannada",
        "nativeName": "ಕನ್ನಡ",
        "script": "Kannada",
    },
    "ml": {
        "code": "ml",
        "bcp47": "ml-IN",
        "name": "Malayalam",
        "nativeName": "മലയാളം",
        "script": "Malayalam",
    },
    "pa": {
        "code": "pa",
        "bcp47": "pa-IN",
        "name": "Punjabi",
        "nativeName": "ਪੰਜਾਬੀ",
        "script": "Gurmukhi",
    },
    "or": {
        "code": "or",
        "bcp47": "or-IN",
        "name": "Odia",
        "nativeName": "ଓଡ଼ିଆ",
        "script": "Odia",
    },
    "as": {
        "code": "as",
        "bcp47": "as-IN",
        "name": "Assamese",
        "nativeName": "অসমীয়া",
        "script": "Bengali",
    },
    "ur": {
        "code": "ur",
        "bcp47": "ur-IN",
        "name": "Urdu",
        "nativeName": "اردو",
        "script": "Perso-Arabic",
    },
}


def get_supported_languages() -> List[Dict[str, str]]:
    """Return list of supported Indian languages with native scripts."""
    return list(SUPPORTED_LANGUAGES.values())


def normalize_language_code(lang: Optional[str]) -> str:
    """Normalize input language tag (e.g. 'hi-IN', 'Hindi', 'hi') to standard ISO 639-1 code."""
    if not lang:
        return "en"
    l = lang.strip().lower()
    if "-" in l:
        l = l.split("-")[0]
    if "_" in l:
        l = l.split("_")[0]
    if l in SUPPORTED_LANGUAGES:
        return l
    for code, info in SUPPORTED_LANGUAGES.items():
        if info["name"].lower() == l or info["nativeName"].lower() == l:
            return code
    return "en"


def detect_indic_script(text: str) -> Optional[str]:
    """
    Fast local heuristic detecting Indic unicode script blocks.
    Returns language code (e.g. 'hi', 'ta', 'te') or None.
    """
    if not text:
        return None
    for char in text:
        cp = ord(char)
        if 0x0900 <= cp <= 0x097F:
            return "hi"  # Devanagari (Hindi / Marathi)
        elif 0x0B80 <= cp <= 0x0BFF:
            return "ta"  # Tamil
        elif 0x0C00 <= cp <= 0x0C7F:
            return "te"  # Telugu
        elif 0x0980 <= cp <= 0x09FF:
            return "bn"  # Bengali / Assamese
        elif 0x0A80 <= cp <= 0x0AFF:
            return "gu"  # Gujarati
        elif 0x0C80 <= cp <= 0x0CFF:
            return "kn"  # Kannada
        elif 0x0D00 <= cp <= 0x0D7F:
            return "ml"  # Malayalam
        elif 0x0A00 <= cp <= 0x0A7F:
            return "pa"  # Gurmukhi (Punjabi)
        elif 0x0B00 <= cp <= 0x0B7F:
            return "or"  # Odia
        elif 0x0600 <= cp <= 0x06FF:
            return "ur"  # Arabic / Urdu
    return None


# ---------------------------------------------------------------------------
# Bhashini ULCA / Dhruva HTTP Client
# ---------------------------------------------------------------------------

def _bhashini_headers() -> Dict[str, str]:
    """Assemble headers for Bhashini ULCA / Dhruva API."""
    api_key = settings.BHASHINI_API_KEY or ""
    user_id = settings.BHASHINI_USER_ID or api_key
    inference_key = settings.BHASHINI_INFERENCE_KEY or api_key

    headers = {
        "Content-Type": "application/json",
        "ulcaApiKey": api_key,
        "userID": user_id,
        "Authorization": inference_key,
    }
    return headers


def call_bhashini_pipeline_config(
    task_type: str,
    source_lang: str,
    target_lang: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Queries Bhashini getModelsPipeline to retrieve active service IDs and inference endpoint.
    Returns config dict or None on failure/unconfigured.
    """
    api_key = settings.BHASHINI_API_KEY
    if not api_key:
        return None

    task_config: Dict[str, Any] = {
        "taskType": task_type,
        "config": {"language": {"sourceLanguage": source_lang}},
    }
    if target_lang and task_type == "translation":
        task_config["config"]["language"]["targetLanguage"] = target_lang

    payload = {
        "pipelineTasks": [task_config],
        "pipelineRequestConfig": {"pipelineId": settings.BHASHINI_PIPELINE_ID},
    }

    try:
        req = urllib.request.Request(
            settings.BHASHINI_PIPELINE_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers=_bhashini_headers(),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.debug("Bhashini pipeline config call failed: %s", str(exc))
    return None


def call_bhashini_dhruva_inference(
    service_id: str,
    task_type: str,
    payload_data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Executes inference request against Bhashini Dhruva endpoint.
    """
    api_key = settings.BHASHINI_API_KEY
    if not api_key:
        return None

    try:
        req = urllib.request.Request(
            settings.BHASHINI_INFERENCE_URL,
            data=json.dumps(payload_data).encode("utf-8"),
            headers=_bhashini_headers(),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.debug("Bhashini Dhruva inference failed: %s", str(exc))
    return None


# ---------------------------------------------------------------------------
# Multilingual Translation (Bhashini + Gemini Indic Fallback)
# ---------------------------------------------------------------------------

def translate_text(
    text: str,
    source_lang: str = "en",
    target_lang: str = "hi",
) -> Dict[str, Any]:
    """
    Translate text between English and Indian languages (or between Indian languages).
    Tries Bhashini NMT service first, automatically falling back to Gemini Indic translation.
    """
    clean_text = (text or "").strip()
    if not clean_text:
        return {"translated_text": "", "source_lang": source_lang, "target_lang": target_lang, "provider": "none"}

    s_lang = normalize_language_code(source_lang)
    t_lang = normalize_language_code(target_lang)

    if s_lang == t_lang:
        return {
            "translated_text": clean_text,
            "source_lang": s_lang,
            "target_lang": t_lang,
            "provider": "identity",
        }

    # 1. Attempt Bhashini NMT
    try:
        pipeline_cfg = call_bhashini_pipeline_config("translation", s_lang, t_lang)
        if pipeline_cfg:
            tasks = pipeline_cfg.get("pipelineResponseConfig", [])
            endpoint_info = pipeline_cfg.get("pipelineInferenceAPIEndPoint", {})
            inf_url = endpoint_info.get("callbackUrl") or settings.BHASHINI_INFERENCE_URL

            service_id = None
            for t in tasks:
                if t.get("taskType") == "translation":
                    cfgs = t.get("config", [])
                    if cfgs:
                        service_id = cfgs[0].get("serviceId")
                        break

            if service_id:
                req_body = {
                    "pipelineTasks": [
                        {
                            "taskType": "translation",
                            "config": {
                                "language": {
                                    "sourceLanguage": s_lang,
                                    "targetLanguage": t_lang,
                                },
                                "serviceId": service_id,
                            },
                        }
                    ],
                    "inputData": {"input": [{"source": clean_text}]},
                }
                headers = _bhashini_headers()
                inf_token = endpoint_info.get("inferenceApiKey", {}).get("value")
                if inf_token:
                    headers["Authorization"] = inf_token

                req = urllib.request.Request(
                    inf_url,
                    data=json.dumps(req_body).encode("utf-8"),
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        output = data.get("pipelineResponse", [{}])[0].get("output", [{}])[0].get("target")
                        if output and output.strip():
                            return {
                                "translated_text": output.strip(),
                                "source_lang": s_lang,
                                "target_lang": t_lang,
                                "provider": "bhashini",
                            }
    except Exception as exc:
        logger.debug("Bhashini translation fallback triggered: %s", str(exc))

    # 2. Resilient Gemini Indic Translation Fallback
    target_info = SUPPORTED_LANGUAGES.get(t_lang, SUPPORTED_LANGUAGES["en"])
    target_name = target_info["name"]
    target_script = target_info["script"]

    prompt = f"""You are an expert Indic translator. Translate the following text into {target_name} ({target_script} script).
Preserve natural tone, professional terminology, and career/job context.
Return ONLY the direct translation, with no explanation or introductory text.

Source text:
{clean_text}"""

    try:
        translated = generate_text(prompt=prompt)
        return {
            "translated_text": translated.strip(),
            "source_lang": s_lang,
            "target_lang": t_lang,
            "provider": "gemini-indic",
        }
    except Exception as exc:
        logger.warning("Gemini Indic translation failed: %s", str(exc))
        return {
            "translated_text": clean_text,
            "source_lang": s_lang,
            "target_lang": t_lang,
            "provider": "fallback-raw",
        }


# ---------------------------------------------------------------------------
# Text to Speech (TTS) in Indian Languages & Dialects
# ---------------------------------------------------------------------------

def text_to_speech(
    text: str,
    language: str = "hi",
    gender: str = "female",
) -> Dict[str, Any]:
    """
    Synthesize text into speech audio for the requested Indian language.
    Returns base64 audio data if Bhashini TTS succeeds, along with Web Speech API voice metadata.
    """
    clean_text = (text or "").strip()
    lang = normalize_language_code(language)
    lang_info = SUPPORTED_LANGUAGES.get(lang, SUPPORTED_LANGUAGES["en"])

    if not clean_text:
        return {
            "audio_base64": None,
            "audio_format": "wav",
            "language": lang,
            "bcp47": lang_info["bcp47"],
            "gender": gender,
            "provider": "none",
        }

    # Attempt Bhashini TTS
    try:
        pipeline_cfg = call_bhashini_pipeline_config("tts", lang)
        if pipeline_cfg:
            tasks = pipeline_cfg.get("pipelineResponseConfig", [])
            endpoint_info = pipeline_cfg.get("pipelineInferenceAPIEndPoint", {})
            inf_url = endpoint_info.get("callbackUrl") or settings.BHASHINI_INFERENCE_URL

            service_id = None
            for t in tasks:
                if t.get("taskType") == "tts":
                    cfgs = t.get("config", [])
                    if cfgs:
                        service_id = cfgs[0].get("serviceId")
                        break

            if service_id:
                req_body = {
                    "pipelineTasks": [
                        {
                            "taskType": "tts",
                            "config": {
                                "language": {"sourceLanguage": lang},
                                "serviceId": service_id,
                                "gender": gender,
                            },
                        }
                    ],
                    "inputData": {"input": [{"source": clean_text[:600]}]},
                }
                headers = _bhashini_headers()
                inf_token = endpoint_info.get("inferenceApiKey", {}).get("value")
                if inf_token:
                    headers["Authorization"] = inf_token

                req = urllib.request.Request(
                    inf_url,
                    data=json.dumps(req_body).encode("utf-8"),
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        audio_res = (
                            data.get("pipelineResponse", [{}])[0]
                            .get("audio", [{}])[0]
                            .get("audioContent")
                        )
                        if audio_res:
                            return {
                                "audio_base64": audio_res,
                                "audio_format": "wav",
                                "language": lang,
                                "bcp47": lang_info["bcp47"],
                                "gender": gender,
                                "provider": "bhashini",
                            }
    except Exception as exc:
        logger.debug("Bhashini TTS call failed: %s", str(exc))

    # Seamless client-side speech synthesis fallback with exact BCP-47 tag
    return {
        "audio_base64": None,
        "audio_format": "web-speech-api",
        "language": lang,
        "bcp47": lang_info["bcp47"],
        "language_name": lang_info["name"],
        "gender": gender,
        "provider": "client-speech-synth",
        "text": clean_text,
    }


# ---------------------------------------------------------------------------
# Speech to Text (ASR)
# ---------------------------------------------------------------------------

def speech_to_text(
    audio_base64: str,
    language: str = "hi",
) -> Dict[str, Any]:
    """
    Transcribe spoken Indian language audio to text using Bhashini ASR.
    """
    lang = normalize_language_code(language)
    lang_info = SUPPORTED_LANGUAGES.get(lang, SUPPORTED_LANGUAGES["en"])

    if not audio_base64:
        return {"transcript": "", "language": lang, "confidence": 0.0, "provider": "none"}

    try:
        pipeline_cfg = call_bhashini_pipeline_config("asr", lang)
        if pipeline_cfg:
            tasks = pipeline_cfg.get("pipelineResponseConfig", [])
            endpoint_info = pipeline_cfg.get("pipelineInferenceAPIEndPoint", {})
            inf_url = endpoint_info.get("callbackUrl") or settings.BHASHINI_INFERENCE_URL

            service_id = None
            for t in tasks:
                if t.get("taskType") == "asr":
                    cfgs = t.get("config", [])
                    if cfgs:
                        service_id = cfgs[0].get("serviceId")
                        break

            if service_id:
                req_body = {
                    "pipelineTasks": [
                        {
                            "taskType": "asr",
                            "config": {
                                "language": {"sourceLanguage": lang},
                                "serviceId": service_id,
                                "audioFormat": "wav",
                            },
                        }
                    ],
                    "inputData": {"audio": [{"audioContent": audio_base64}]},
                }
                headers = _bhashini_headers()
                inf_token = endpoint_info.get("inferenceApiKey", {}).get("value")
                if inf_token:
                    headers["Authorization"] = inf_token

                req = urllib.request.Request(
                    inf_url,
                    data=json.dumps(req_body).encode("utf-8"),
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=12) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        output = (
                            data.get("pipelineResponse", [{}])[0]
                            .get("output", [{}])[0]
                            .get("source")
                        )
                        if output:
                            return {
                                "transcript": output.strip(),
                                "language": lang,
                                "bcp47": lang_info["bcp47"],
                                "confidence": 0.95,
                                "provider": "bhashini",
                            }
    except Exception as exc:
        logger.debug("Bhashini ASR failed: %s", str(exc))

    return {
        "transcript": "",
        "language": lang,
        "bcp47": lang_info["bcp47"],
        "confidence": 0.0,
        "provider": "unsupported-client-capture",
    }
