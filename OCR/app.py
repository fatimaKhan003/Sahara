# cmd: uvicorn OCR.app:app --host 0.0.0.0 --port 8000
import torch, io, re, json
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from contextlib import asynccontextmanager
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor, BitsAndBytesConfig
from OCR.qwen_vl_utils.qwen_vl_utils import process_vision_info

# ── FASTAPI LIFECYCLE ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=== Qwen OCR Server Starting... ===")
    yield
    print("=== Qwen OCR Server Shutting Down... ===")

app = FastAPI(lifespan=lifespan)
device = "cuda" if torch.cuda.is_available() else "cpu"

# ── IMAGE PREPROCESSING ────────────────────────────────────────
def preprocess(img: Image.Image) -> Image.Image:
    img = img.rotate(-2, expand=True, fillcolor=(255, 255, 255))
    img = ImageEnhance.Sharpness(img).enhance(1.8)
    img = ImageEnhance.Contrast(img).enhance(1.5)
    img = ImageOps.grayscale(img)
    img = img.filter(ImageFilter.MedianFilter(size=3))
    return img

# ── LOAD QWEN 7B MODEL ─────────────────────────────────────────
MODEL_ID = "Qwen/Qwen2.5-VL-7B-Instruct"

def load_qwen_model():
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
    )
    print("Loading Qwen 7B model...")
    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map={"": 0},
    )
    model.eval()
    processor = AutoProcessor.from_pretrained(
        MODEL_ID,
        min_pixels=256*28*28,
        max_pixels=1600*28*28,
    )
    print("Model loaded.")
    return model, processor

model, processor = load_qwen_model()

# ── SHARED CONSTANTS ──────────────────────────────────────────
# Words to strip from the beginning of any line before extracting name
NOISE_PREFIX_PATTERN = r'^(?:[\d]+[\.\)]\s*|(?:Take|Use|Apply|Tab|Cap|Syp|Syrup|Inj|Tablet|INJ|CAP|Capsule|Dr\.?|Rx\.?)[\s\.\:]*)'

# Numeric frequency: 1+1+0, 1-0-1, 1x1x1
FREQ_NUMERIC_PATTERN = r'\b\d+(?:[+\-xX]\d+){1,3}\b'

# Word frequency: once, twice, three times, 1 time, 2 times, daily, BD, TDS, OD
FREQ_WORD_PATTERN = (
    r'\b(once\s*(?:a\s*day|daily)?'
    r'|twice\s*(?:a\s*day|daily)?'
    r'|three\s+times?\s*(?:a\s*day|daily)?'
    r'|one\s+time\s*(?:a\s*day)?'
    r'|two\s+times?\s*(?:a\s*day)?'
    r'|3\s+times?\s*(?:a\s*day)?'
    r'|once\s+daily|twice\s+daily'
    r'|BD|TDS|OD|QID'  # medical shorthand
    r')\b'
)

# Word → times_per_day map (keys are lowercased + whitespace-normalized)
WORD_TO_TPD = {
    "once":              "Once a day",
    "once a day":        "Once a day",
    "once daily":        "Once a day",
    "one time":          "Once a day",
    "one time a day":    "Once a day",
    "od":                "Once a day",
    "twice":             "Twice a day",
    "twice a day":       "Twice a day",
    "twice daily":       "Twice a day",
    "two times":         "Twice a day",
    "two times a day":   "Twice a day",
    "bd":                "Twice a day",
    "three times":       "Three times a day",
    "three times a day": "Three times a day",
    "3 times":           "Three times a day",
    "3 times a day":     "Three times a day",
    "tds":               "Three times a day",
    "qid":               "Three times a day",
}

# Dose: 500mg, 50 mg, 5ml, 1g, 2tab etc.
DOSE_PATTERN = r'\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|tab|tabs|cap|caps|u)\b'


# ── STRUCTURED EXTRACTION VIA PROMPT ─────────────────────────
def extract_medicines_structured(img: Image.Image) -> tuple[str, list]:
    system_prompt = (
        "You are a medical prescription parser.\n"
        "Look at the prescription image and extract ALL medications.\n"
        "Return ONLY a JSON array with this exact structure:\n"
        "[\n"
        "  {\n"
        '    "name": "medication name only — no prefix like Tab/Cap/Take/Use",\n'
        '    "dose": "dose with unit e.g. 50mg, 500mg, 5ml — empty string if not visible",\n'
        '    "frequency": "as written e.g. 1+0+1 or once or twice — empty string if not visible",\n'
        '    "times_per_day": "must be exactly: Once a day | Twice a day | Three times a day | As directed"\n'
        "  }\n"
        "]\n"
        "Rules:\n"
        "- Output ONLY the JSON array. No explanation, no markdown, no code fences.\n"
        "- Strip ALL prefixes from name: Take, Use, Tab, Cap, Syp, Syrup, Inj, Tablet, Capsule, Dr, Rx, numbers.\n"
        "- Recognize word frequencies: once=Once a day, twice=Twice a day, three times=Three times a day.\n"
        "- Recognize shorthand: OD=Once a day, BD=Twice a day, TDS=Three times a day.\n"
        "- Recognize numeric: 1+0+0=Once a day, 1+0+1=Twice a day, 1+1+1=Three times a day.\n"
        "- If frequency is not visible, use empty string and As directed for times_per_day.\n"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": [
            {"type": "image", "image": img},
            {"type": "text", "text": "Extract all medications from this prescription as JSON."},
        ]},
    ]

    prompt = processor.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    eos_token_id = processor.tokenizer.eos_token_id
    img_in, _ = process_vision_info(messages)

    inputs = processor(
        text=[prompt],
        images=img_in,
        padding=True,
        return_tensors="pt"
    ).to(model.device)

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=1000,
            do_sample=False,
            repetition_penalty=1.05,
            eos_token_id=eos_token_id,
        )

    raw = processor.decode(
        output[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True
    ).strip()

    print(f"\n=== RAW MODEL OUTPUT ===\n{raw}\n========================\n")

    medicines = parse_json_output(raw)
    return raw, medicines


# ── JSON PARSING ──────────────────────────────────────────────
def parse_json_output(raw: str) -> list:
    # 1. Strip markdown fences
    cleaned = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).strip()
    cleaned = cleaned.replace("```", "").strip()

    # 2. Find JSON array anywhere in output
    match = re.search(r'\[.*\]', cleaned, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, list):
                return sanitize_medicines(data)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")

    # 3. Try whole cleaned string
    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            return sanitize_medicines(data)
    except json.JSONDecodeError:
        pass

    print("WARNING: JSON parse failed — using regex fallback.")
    return regex_fallback(raw)


def sanitize_medicines(data: list) -> list:
    """Validate fields and normalize times_per_day."""
    valid_tpd = {"Once a day", "Twice a day", "Three times a day", "As directed"}
    result = []
    for item in data:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        tpd = str(item.get("times_per_day", "As directed")).strip()
        frequency=str(item.get("frequency","")).strip()
        num_match = re.match(r'^(\d+)[+\-xX](\d+)(?:[+\-xX](\d+))?$', frequency.strip())
        if num_match:
            parts = [int(g) for g in num_match.groups() if g is not None]
            active_count = sum(1 for p in parts if p > 0)
            tpd = {1: "Once a day", 2: "Twice a day", 3: "Three times a day"}.get(active_count, "As directed")
        elif tpd not in valid_tpd:
            tpd = "As directed"
        result.append({
            "name": name,
            "dose": str(item.get("dose", "")).strip(),
            "frequency": str(item.get("frequency", "")).strip(),
            "times_per_day": tpd,
        })
    return result


# ── REGEX FALLBACK ────────────────────────────────────────────
def extract_frequency(working: str) -> tuple[str, str, str]:
    """
    Try numeric then word frequency patterns.
    Returns (frequency_str, times_per_day, remaining_text).
    """
    # 1. Numeric: 1+1+0
    num_match = re.search(FREQ_NUMERIC_PATTERN, working, re.IGNORECASE)
    if num_match:
        frequency = num_match.group(0).strip()
        remaining = working[:num_match.start()] + working[num_match.end():]
        parts = re.split(r'[+\-xX]', frequency)
        try:
            
            active_count = sum(1 for p in parts if int(re.sub(r'\D', '', p)) > 0)
        except ValueError:
            active_count=0
        mapping = {1: "Once a day", 2: "Twice a day", 3: "Three times a day"}
        tpd = mapping.get(active_count, "As directed")
        return frequency, tpd, remaining

    # 2. Word-based: once, twice, BD, TDS etc.
    word_match = re.search(FREQ_WORD_PATTERN, working, re.IGNORECASE)
    if word_match:
        frequency = word_match.group(0).strip()
        remaining = working[:word_match.start()] + working[word_match.end():]
        key = re.sub(r'\s+', ' ', frequency.lower()).strip()
        tpd = WORD_TO_TPD.get(key, "As directed")
        return frequency, tpd, remaining

    return "", "N/A", working


def regex_fallback(raw: str) -> list:
    """
    Last-resort parser. Handles single-line and multi-line output.
    Splits on newlines OR drug-type keywords to recover individual entries.
    """
    medicines = []

    # Split on newlines or where a new med entry likely starts
    lines = re.split(
        r'\n|(?=\b(?:Take|Tab|Cap|Syp|Syrup|Inj|Tablet|Capsule)\b)',
        raw,
        flags=re.IGNORECASE
    )

    print(f"\n--- Parsing ({len(lines)} lines) ---")

    for line in lines:
        original = line.strip()
        if not original or len(original) < 3:
            continue

        working = original

        # 1. Extract frequency (numeric or word)
        frequency, times_per_day, working = extract_frequency(working)

        # 2. Extract dose
        dose_match = re.search(DOSE_PATTERN, working, re.IGNORECASE)
        dose = ""
        if dose_match:
            dose = dose_match.group(0).strip()
            working = working[:dose_match.start()] + working[dose_match.end():]

        # 3. Strip noise prefixes and clean name
        name = working
        # Strip repeatedly until no more prefixes match (handles "Take Tab Panadol")
        while True:
            stripped = re.sub(NOISE_PREFIX_PATTERN, '', name, flags=re.IGNORECASE).strip()
            if stripped == name:
                break
            name = stripped
        name = re.sub(r'\s+', ' ', name).strip(' ,.-')

        print(f"RAW: '{original}'")
        print(f"  └─ Name: '{name}' | Dose: '{dose}' | Freq: '{frequency}' | TPD: {times_per_day}")

        if name and len(name) > 1:
            medicines.append({
                "name": name,
                "dose": dose,
                "frequency": frequency,
                "times_per_day": times_per_day,
            })

    print("-------------------------------------------\n")
    return medicines


# ── FASTAPI ENDPOINT ──────────────────────────────────────────
@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = preprocess(img)

        raw_output, medicines = extract_medicines_structured(img)

        print(f"Extracted {len(medicines)} medicine(s): {medicines}")

        return JSONResponse({
            "text": raw_output,
            "medicines": medicines,
            "status": "success",
            "model": "Qwen2.5-VL-7B",
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)