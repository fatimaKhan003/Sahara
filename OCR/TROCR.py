import os
import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from transformers import Seq2SeqTrainer, Seq2SeqTrainingArguments, DataCollatorForSeq2Seq
import pandas as pd

# --------- Dataset Class ---------
class PrescriptionDataset(Dataset):
    def __init__(self, images_dir, labels_file, transform=None):
        self.images_dir = images_dir
        self.transform = transform
        df = pd.read_csv(labels_file)
        self.samples = []
        for _, row in df.iterrows():
            img_name = row['IMAGE']
            text = f"{row['MEDICINE_NAME']} {row['GENERIC_NAME']}"
            self.samples.append((img_name, text))
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        img_name, text = self.samples[idx]
        img_path = os.path.join(self.images_dir, img_name)
        image = Image.open(img_path).convert("RGB")
        
        # Process image
        pixel_values = processor.feature_extractor(images=image, return_tensors="pt").pixel_values
        pixel_values = pixel_values.squeeze(0)  
        
        # Tokenize text
        labels = processor.tokenizer(text, truncation=True, padding="max_length", max_length=128).input_ids
        labels = torch.tensor(labels)
        
        return {"pixel_values": pixel_values, "labels": labels}

def collate_fn(batch):
    pixel_values = torch.stack([item['pixel_values'] for item in batch])
    labels = torch.stack([item['labels'] for item in batch])
    

    labels[labels == processor.tokenizer.pad_token_id] = -100
    
    return {"pixel_values": pixel_values, "labels": labels}

train_images_dir = "OCR/dataset_merged_5_6/train"
train_labels_file = "OCR/dataset_merged_5_6/train_labels.csv"
val_images_dir = "OCR/dataset_merged_5_6/val"
val_labels_file = "OCR/dataset_merged_5_6/val_labels.csv"

# --------- Image Transform ---------
transform = transforms.Compose([
    transforms.Resize((384, 384)),
])

# --------- Load Dataset ---------
train_dataset = PrescriptionDataset(train_images_dir, train_labels_file, transform)
val_dataset = PrescriptionDataset(val_images_dir, val_labels_file, transform)

# --------- Load TrOCR ---------
processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")
# Set decoder start token and other special tokens
model.config.decoder_start_token_id = processor.tokenizer.bos_token_id
model.config.pad_token_id = processor.tokenizer.pad_token_id
model.config.eos_token_id = processor.tokenizer.eos_token_id
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

# --------- Training Arguments ---------
training_args = Seq2SeqTrainingArguments(
    output_dir="./trocr_prescription",
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    predict_with_generate=True,
    save_total_limit=2,
    num_train_epochs=5,
    fp16=True,
    logging_steps=100,
    save_steps=500,

)

# --------- Data Collator ---------
data_collator = DataCollatorForSeq2Seq(tokenizer=processor.tokenizer, model=model)


# --------- Trainer ---------
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    data_collator=collate_fn,  # use the custom collator
    tokenizer=processor.tokenizer,
)



# --------- Start Training ---------
trainer.train()
