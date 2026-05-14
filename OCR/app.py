# cmd: uvicorn OCR.app:app --host 0.0.0.0 --port 8000
import torch, io, re, json
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import os
import asyncio
from google import genai
from dotenv import load_dotenv

import os
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from contextlib import asynccontextmanager
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor, BitsAndBytesConfig
from peft import PeftModel
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
MODEL_ID = "Qwen/Qwen2-VL-7B-Instruct"
ADAPTER_PATH = "./final_prescription_adapter" # UPDATE THIS TO YOUR ACTUAL ADAPTER FOLDER IF DIFFERENT

def load_qwen_model():
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
    )
    print("Loading base Qwen2 7B model...")
    base_model = Qwen2VLForConditionalGeneration.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map={"": 0},
    )
    
    import os
    if os.path.exists(ADAPTER_PATH):
        print(f"Applying LoRA adapter from {ADAPTER_PATH}...")
        model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
    else:
        print(f"WARNING: Adapter path '{ADAPTER_PATH}' not found! Loading base model only.")
        model = base_model
        
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
"- CRITICAL: If a dosage (e.g., 500mg, 10ml) is part of the name, MOVE it to the 'dose' field and keep only the brand name in 'name'."
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


# ── GEMINI FALLBACK ──────────────────────────────────────────────
async def extract_medicines_gemini(img: Image.Image, qwen_data=None):

    print("=== Using Gemini ===")

    system_prompt = (
    "You are a medical prescription OCR system.\n"
    "IMPORTANT RULES:\n"
    "- DO NOT guess medicine names.\n"
    "- If text is unclear, return the closest visible spelling ONLY.\n"
    "- Never replace drug names with similar real drugs.\n"
    "- Prefer preserving original OCR text exactly as seen.\n"
    "- If uncertain, keep it unchanged.\n\n"
    "Extract ALL medicines from image.\n"
    "Return ONLY JSON array."
)

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[system_prompt, img]
    )

    raw = response.text.strip()

    print("\n=== GEMINI OUTPUT ===\n", raw)

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
        dose = str(item.get("dose", "")).strip()
        frequency = str(item.get("frequency", "")).strip()
        
        # --- NEW FIX: Extract dose from name if name contains it ---
        if name:
            # Look for patterns like '180mg' or '500 mg' inside the name string
            found_dose = re.search(DOSE_PATTERN, name, re.IGNORECASE)
            if found_dose:
                detected_dose = found_dose.group(0).strip()
                # Only move it if the dose field is currently empty
                if not dose:
                    dose = detected_dose
                # Remove the dose from the name
                name = name.replace(detected_dose, "").strip(' ,.-')
        # -----------------------------------------------------------

        if not name:
            continue

        # Normalize times_per_day based on frequency
        tpd = str(item.get("times_per_day", "As directed")).strip()
        num_match = re.match(r'^(\d+)[+\-xX](\d+)(?:[+\-xX](\d+))?$', frequency)
        if num_match:
            parts = [int(g) for g in num_match.groups() if g is not None]
            active_count = sum(1 for p in parts if p > 0)
            tpd = {1: "Once a day", 2: "Twice a day", 3: "Three times a day"}.get(active_count, "As directed")
        elif tpd not in valid_tpd:
            tpd = "As directed"

        result.append({
            "name": name,
            "dose": dose,
            "frequency": frequency,
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
# ... (rest of your imports and model loading remains the same)

@app.post("/ocr")
async def ocr_api(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = preprocess(img)

        final_medicines = []
        raw_final = ""
        used_model = "qwen"

        # --- STEP 1: QWEN EXTRACTION ---
        try:
            raw_qwen, qwen_medicines = await asyncio.wait_for(
                asyncio.to_thread(extract_medicines_structured, img),
                timeout=60.0
            )
            final_medicines = qwen_medicines
            raw_final = raw_qwen
        except Exception as e:
            print(f"[QWEN FAILED/TIMEOUT]: {e}")
            final_medicines = []

        # --- STEP 2: GEMINI LOGIC (REFINEMENT OR FALLBACK) ---
        try:
            if final_medicines:
                # Qwen succeeded, try to REFINE with Gemini
                print("Attempting Gemini Refinement...")
                raw_gemini, gemini_medicines = await extract_medicines_gemini(img, final_medicines)
                
                # If Gemini successfully returns data, use it
                if gemini_medicines:
                    final_medicines = gemini_medicines
                    raw_final = raw_gemini
                    used_model = "qwen + gemini"
            else:
                # Qwen failed, try Gemini as PRIMARY OCR
                print("Qwen empty. Attempting Gemini Direct OCR...")
                raw_gemini, gemini_medicines = await extract_medicines_gemini(img, None)
                
                if gemini_medicines:
                    final_medicines = gemini_medicines
                    raw_final = raw_gemini
                    used_model = "gemini-fallback"
                else:
                    raise ValueError("Gemini returned empty results.")

        except Exception as gemini_err:
            # This catches Quota full, API keys issues, or Network timeouts
            print(f"[GEMINI BYPASSED]: {gemini_err}")
            # used_model remains whatever it was before Gemini failed
            if not final_medicines:
                return JSONResponse({
                    "error": "Both Qwen and Gemini failed to extract data.",
                    "details": str(gemini_err)
                }, status_code=500)

        # --- STEP 3: FINAL CLEANING ---
        # Ensure we always run the final sanitization on whatever data survived
        sanitized_data = sanitize_medicines(final_medicines)

        return JSONResponse({
            "text": raw_final,
            "medicines": sanitized_data,
            "status": "success",
            "model": used_model,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)