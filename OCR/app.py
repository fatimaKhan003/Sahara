# cmd: uvicorn app:app --host 0.0.0.0 --port 8000
import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import io
import re
from contextlib import asynccontextmanager

from transformers import TrOCRProcessor, VisionEncoderDecoderModel


# ---------- Lifespan ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=== TrOCR OCR Server Starting... ===")
    yield
    print("=== TrOCR OCR Server Shutting Down... ===")


app = FastAPI(lifespan=lifespan)


# ---------- Device ----------
device = "cuda" if torch.cuda.is_available() else "cpu"


# =====================================================
#  CLEAN TEXT FUNCTION (removes ALL trailing punctuation)
# =====================================================
def clean_text(text: str) -> str:
    if not text:
        return ""

    text = text.strip()

    # Remove punctuation at start
    text = re.sub(r'^[\s\.,;:!?()\[\]{}"\'-]+', '', text)

    # Remove punctuation at end
    text = re.sub(r'[\s\.,;:!?()\[\]{}"\'-]+$', '', text)

    # Remove space + dot (e.g., "thyroxine .")
    text = re.sub(r"\s+\.", "", text)

    # Normalize multiple spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# =====================================================
#  LOAD TrOCR MODEL ONLY
# =====================================================
processor = TrOCRProcessor.from_pretrained("./trocr_prescription")
trocr_model = VisionEncoderDecoderModel.from_pretrained("./trocr_prescription")
trocr_model.to(device)
trocr_model.eval()


def preprocess_trocr(img):
    img = img.convert("RGB")
    pixel_values = processor(images=img, return_tensors="pt").pixel_values
    return pixel_values.to(device)


# =====================================================
#  OCR ENDPOINT (ONLY TrOCR)
# =====================================================
@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...)):
    try:
        # Load Image
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes))

        # Preprocess
        pixel_values = preprocess_trocr(img)

        # Run TrOCR
        with torch.no_grad():
            generated_ids = trocr_model.generate(pixel_values)
            text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

        # Clean text output
        text = clean_text(text)

        return JSONResponse({
            "text": text,
            "model": "TrOCR",
            "status": "success"
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
