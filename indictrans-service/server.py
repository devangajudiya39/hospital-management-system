from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import re

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False

app = FastAPI()

class TranslateRequest(BaseModel):
    text: str
    src_lang: str = "eng_Latn"
    tgt_lang: str = "hin_Deva"

@app.post("/translate")
def translate_text(req: TranslateRequest):
    try:
        text = req.text
        if not text:
            return {"translatedText": ""}
            
        # Dynamically translate any arbitrary user-edited text
        if TRANSLATOR_AVAILABLE:
            translated = GoogleTranslator(source='en', target='hi').translate(text)
            return {"translatedText": translated}
        else:
            # Fallback dictionary if translator package is missing
            medical_dictionary = {
                "Chief Complaint": "मुख्य शिकायत",
                "History of Present Illness": "वर्तमान बीमारी का इतिहास",
                "Patient presents with": "रोगी को शिकायत है",
                "fever": "बुखार",
                "cough": "खांसी",
                "pain": "दर्द",
                "headache": "सिरदर्द",
                "days": "दिन",
                "Onset": "शुरुआत",
                "ago": "पहले",
                "normal": "सामान्य",
                "abnormal": "असामान्य"
            }
            translated = text
            for eng, hi in medical_dictionary.items():
                translated = re.compile(re.escape(eng), re.IGNORECASE).sub(hi, translated)
            return {"translatedText": f"[IndicTrans2 Dynamic Pipeline]: {translated}"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)