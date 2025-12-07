import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import io
import torchvision.transforms as transforms
from crnn import CRNN, StrLabelConverter
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=== OCR Server is starting... ===")
    yield
    print("=== OCR Server is shutting down... ===")

app = FastAPI(lifespan=lifespan)

# Load model once at startup
device = "cuda" if torch.cuda.is_available() else "cpu"

alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-/+ "
converter = StrLabelConverter(alphabet)
nclass = len(alphabet) + 1

model = CRNN(32, 1, nclass, 256).to(device)
model.load_state_dict(torch.load("saved-model/crnn_dataset5_final.pth", map_location=device))
model.eval()

transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])


def preprocess(img):
    img = img.convert('L')
    w, h = img.size
    target_height = 32
    new_w = max(int(w * (target_height / h)), 200)
    img = img.resize((new_w, target_height), Image.BILINEAR)
    return transform(img).unsqueeze(0).to(device)  # [1, 1, H, W]


@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes))

        tensor_img = preprocess(img)

        with torch.no_grad():
            preds = model(tensor_img)
            preds_size = torch.IntTensor([preds.size(0)])
            text = converter.decode(preds, preds_size)

        return JSONResponse({"text": text[0]})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# cmd: uvicorn app:app --host 0.0.0.0 --port 8000
# endpoint: POST http://ip-addr:8000/ocr
#           form-data: file=<image>

