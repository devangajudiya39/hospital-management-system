from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import re
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

MODEL_NAME = "ai4bharat/indictrans2-en-indic-dist-200M"
print("Loading IndicTrans2 model... (first run downloads weights, be patient)")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, trust_remote_code=True)
ip = IndicProcessor(inference=True)
print("IndicTrans2 model loaded.")

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

        batch = ip.preprocess_batch([text], src_lang=req.src_lang, tgt_lang=req.tgt_lang)
        inputs = tokenizer(batch, padding=True, truncation=True, return_tensors="pt")

        with torch.no_grad():
            generated_tokens = model.generate(**inputs, max_length=256, num_beams=1)

        decoded = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)
        translations = ip.postprocess_batch(decoded, lang=req.tgt_lang)

        return {"translatedText": translations[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 

from gtts import gTTS
from fastapi.responses import StreamingResponse
import io

class TTSRequest(BaseModel):
    text: str
    lang: str = "hi"

@app.post("/tts")
def text_to_speech(req: TTSRequest):
    try:
        if not req.text:
            raise HTTPException(status_code=400, detail="No text provided")
        tts = gTTS(text=req.text, lang=req.lang)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        return StreamingResponse(audio_buffer, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)