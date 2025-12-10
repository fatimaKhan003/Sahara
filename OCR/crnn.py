import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import pandas as pd
from PIL import Image
import torchvision.transforms as transforms
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import confusion_matrix, classification_report
import itertools
import json

######################################################################
#  CRNN MODEL
######################################################################

class BidirectionalLSTM(nn.Module):
    def __init__(self, nIn, nHidden, nOut):
        super(BidirectionalLSTM, self).__init__()
        self.rnn = nn.LSTM(nIn, nHidden, num_layers=1, bidirectional=True)
        self.embedding = nn.Linear(nHidden * 2, nOut)

    def forward(self, input):
        recurrent, _ = self.rnn(input)
        T, b, h = recurrent.size()
        t_rec = recurrent.contiguous().view(T * b, h)
        output = self.embedding(t_rec)
        output = output.view(T, b, -1)
        return output


class CRNN(nn.Module):
    def __init__(self, imgH, nc, nclass, nh):
        super(CRNN, self).__init__()
        assert imgH % 16 == 0, 'imgH must be a multiple of 16'

        ks = [3,3,3,3,3,3,2]
        ps = [1,1,1,1,1,1,0]
        ss = [1,1,1,1,1,1,1]
        nm = [64,128,256,256,512,512,512]

        cnn = nn.Sequential()

        def conv_relu(i, batch_norm=False):
            nIn = nc if i == 0 else nm[i - 1]
            nOut = nm[i]
            cnn.add_module(f'conv{i}', nn.Conv2d(nIn, nOut, ks[i], ss[i], ps[i]))
            if batch_norm:
                cnn.add_module(f'batchnorm{i}', nn.BatchNorm2d(nOut))
            cnn.add_module(f'relu{i}', nn.ReLU(True))

        conv_relu(0)
        cnn.add_module('pooling0', nn.MaxPool2d(2,2))

        conv_relu(1)
        cnn.add_module('pooling1', nn.MaxPool2d(2,2))

        conv_relu(2, batch_norm=True)
        conv_relu(3)
        cnn.add_module('pooling2', nn.MaxPool2d((2,1),(2,1)))

        conv_relu(4, batch_norm=True)
        conv_relu(5)
        cnn.add_module('pooling3', nn.MaxPool2d((2,1),(2,1)))

        conv_relu(6, batch_norm=True)

        self.cnn = cnn

        self.rnn = nn.Sequential(
            BidirectionalLSTM(nm[-1], nh, nh),
            BidirectionalLSTM(nh, nh, nclass)
        )

        self._initialize_weights()

    def forward(self, input):
        conv = self.cnn(input)              # [B, C, 1, W]
        b, c, h, w = conv.size()
        assert h == 1, "Conv height must be 1"
        conv = conv.squeeze(2)              # [B, C, W]
        conv = conv.permute(2,0,1)          # [W, B, C]
        output = self.rnn(conv)
        output = F.log_softmax(output, dim=2)
        return output

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, nonlinearity="relu")
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.constant_(m.bias, 0)


######################################################################
#  LABEL CONVERTER
######################################################################

class StrLabelConverter(object):
    def __init__(self, alphabet, ignore_case=True):
        if ignore_case:
            alphabet = alphabet.lower()
        self.alphabet = alphabet
        self.dict = {char: i+1 for i, char in enumerate(alphabet)}

    def encode(self, text_list):
        if isinstance(text_list, str):
            text_list = [text_list]
        lengths = [len(s) for s in text_list]

        encoded = []
        for s in text_list:
            for ch in s:
                encoded.append(self.dict.get(ch, 0))
        if len(encoded) == 0:
            return torch.LongTensor([]), torch.IntTensor(lengths)
        return torch.LongTensor(encoded), torch.IntTensor(lengths)

    def decode(self, preds, preds_size):
        # preds: seq_len x batch x nclass (log probs)
        preds_idx = preds.permute(1,0,2).argmax(2)  # [B, T]
        texts = []

        for b in range(preds_idx.size(0)):
            seq = preds_idx[b]
            char_list = []
            prev = None
            for c in seq:
                c = c.item()
                if c != 0 and c != prev:
                    if 1 <= c <= len(self.alphabet):
                        char_list.append(self.alphabet[c-1])
                prev = c
            texts.append("".join(char_list))

        return texts


######################################################################
#  OCR DATASET (robust: auto-detect columns)
######################################################################

class OCRDataset(Dataset):
    FNAME_CANDIDATES = ['filename','file','image','img','image_name','name','path','filepath','IMAGE','IMAGE_NAME']
    LABEL_CANDIDATES = ['label','text','gt','transcription','trans','word','MEDICINE_NAME','GENERIC_NAME','MEDICINE']

    def __init__(self, image_folder, labels_csv, imgH=32, fname_col=None, label_col=None):
        self.image_folder = image_folder
        self.labels = pd.read_csv(labels_csv)
        # choose columns
        self.fname_col = fname_col or self._find_col(self.FNAME_CANDIDATES)
        self.label_col = label_col or self._find_col(self.LABEL_CANDIDATES, allow_missing=True)

        if self.fname_col is None:
            # fallback use first column
            self.fname_col = self.labels.columns[0]

        # Normalize string columns
        self.labels[self.fname_col] = self.labels[self.fname_col].astype(str).str.strip().str.strip('"').str.strip("'")
        if self.label_col:
            self.labels[self.label_col] = self.labels[self.label_col].astype(str).str.strip()

        self.transform = transforms.Compose([
            transforms.Grayscale(),
            transforms.Resize((imgH, 200)),
            transforms.ToTensor(),              # produces [1, H, W]
            transforms.Normalize((0.5,), (0.5,))
        ])

    def _find_col(self, candidates, allow_missing=False):
        cols = [c.lower() for c in self.labels.columns]
        for cand in candidates:
            if cand.lower() in cols:
                return self.labels.columns[cols.index(cand.lower())]
        return None if allow_missing else None

    def __len__(self):
        return len(self.labels)

    def _resolve_path(self, fname):
        # if absolute
        if os.path.isabs(fname) and os.path.exists(fname):
            return fname
        cand = os.path.join(self.image_folder, fname)
        if os.path.exists(cand):
            return cand
        # try common extensions if missing
        base, ext = os.path.splitext(fname)
        if ext == '':
            for e in ['.png','.jpg','.jpeg','.bmp','.tif']:
                c = os.path.join(self.image_folder, base + e)
                if os.path.exists(c):
                    return c
        # try recursive glob
        for root, _, files in os.walk(self.image_folder):
            if fname in files:
                return os.path.join(root, fname)
        return None

    def __getitem__(self, idx):
        row = self.labels.iloc[idx]
        fname = str(row[self.fname_col]).strip()
        resolved = self._resolve_path(fname)
        if resolved is None:
            raise FileNotFoundError(f"Image '{fname}' not found under '{self.image_folder}'")
        img = Image.open(resolved).convert('L')
        img = self.transform(img)   # [1, H, W]
        label = ""
        if self.label_col:
            label = str(row[self.label_col]).lower()
        return img, label


######################################################################
#  TRAINING & VALIDATION + METRICS
######################################################################

def epoch_train(model, loader, criterion, optimizer, converter, device):
    model.train()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    for imgs, texts in loader:
        imgs = imgs.to(device)
        targets, lengths = converter.encode(list(texts))
        preds = model(imgs)  # seq_len x batch x nclass
        preds_size = torch.IntTensor([preds.size(0)] * imgs.size(0))

        if targets.numel() == 0:
            loss = torch.tensor(0.0, device=imgs.device)
        else:
            loss = criterion(preds, targets, preds_size, lengths)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        total_loss += loss.item()

        with torch.no_grad():
            preds_texts = converter.decode(preds, preds_size)
            for p, gt in zip(preds_texts, texts):
                if p == gt:
                    total_correct += 1
                total_samples += 1

    avg_loss = total_loss / max(1, len(loader))
    acc = total_correct / max(1, total_samples)
    return avg_loss, acc


def epoch_validate(model, loader, criterion, converter, device):
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0

    with torch.no_grad():
        for imgs, texts in loader:
            imgs = imgs.to(device)
            targets, lengths = converter.encode(list(texts))
            preds = model(imgs)
            preds_size = torch.IntTensor([preds.size(0)] * imgs.size(0))
            if targets.numel() == 0:
                loss = torch.tensor(0.0, device=imgs.device)
            else:
                loss = criterion(preds, targets, preds_size, lengths)
            total_loss += loss.item()

            preds_texts = converter.decode(preds, preds_size)
            for p, gt in zip(preds_texts, texts):
                if p == gt:
                    total_correct += 1
                total_samples += 1

    avg_loss = total_loss / max(1, len(loader))
    acc = total_correct / max(1, total_samples)
    return avg_loss, acc


def evaluate_on_loader(model, loader, converter, device):
    model.eval()
    y_true = []
    y_pred = []
    with torch.no_grad():
        for imgs, texts in loader:
            imgs = imgs.to(device)
            preds = model(imgs)
            preds_size = torch.IntTensor([preds.size(0)] * imgs.size(0))
            preds_texts = converter.decode(preds, preds_size)
            for p, gt in zip(preds_texts, texts):
                y_pred.append(p)
                y_true.append(gt)
    return y_true, y_pred

# ---------- new: char-level accuracy ----------
def char_level_accuracy(y_true, y_pred):
    total_chars = sum(len(t) for t in y_true)
    correct_chars = 0
    for pred, gt in zip(y_pred, y_true):
        for pc, gc in zip(pred, gt):
            if pc == gc:
                correct_chars += 1
    return correct_chars / total_chars if total_chars > 0 else 0

######################################################################
#  UTIL: plotting & saving
######################################################################

def plot_loss_acc(history, prefix):
    epochs = list(range(1, len(history['train_loss'])+1))
    plt.figure(figsize=(10,4))
    plt.subplot(1,2,1)
    plt.plot(epochs, history['train_loss'], label='train_loss')
    plt.plot(epochs, history['val_loss'], label='val_loss')
    plt.xlabel('Epoch'); plt.ylabel('Loss'); plt.title('Loss'); plt.legend()
    plt.subplot(1,2,2)
    plt.plot(epochs, history['train_acc'], label='train_acc')
    plt.plot(epochs, history['val_acc'], label='val_acc')
    plt.xlabel('Epoch'); plt.ylabel('Accuracy'); plt.title('Accuracy'); plt.legend()
    plt.tight_layout()
    plt.savefig(f'{prefix}_loss_acc.png')
    plt.close()


def save_metrics_csv(history, prefix):
    df = pd.DataFrame({
        'epoch': list(range(1, len(history['train_loss'])+1)),
        'train_loss': history['train_loss'],
        'val_loss': history['val_loss'],
        'train_acc': history['train_acc'],
        'val_acc': history['val_acc']
    })
    df.to_csv(f'{prefix}_metrics.csv', index=False)


def plot_confusion(y_true, y_pred, prefix, topk=None):
    labels = sorted(list(set(y_true) | set(y_pred)))
    if topk:
        top = pd.Series(y_true).value_counts().nlargest(topk).index.tolist()
        labels = top
    y_true_idx = [labels.index(x) if x in labels else -1 for x in y_true]
    y_pred_idx = [labels.index(x) if x in labels else -1 for x in y_pred]

    cm = confusion_matrix(y_true_idx, y_pred_idx, labels=range(len(labels)))
    plt.figure(figsize=(8,8))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion matrix')
    plt.colorbar()
    tick_marks = np.arange(len(labels))
    plt.xticks(tick_marks, labels, rotation=90, fontsize=6)
    plt.yticks(tick_marks, labels, fontsize=6)
    plt.ylabel('True label')
    plt.xlabel('Predicted label')
    plt.tight_layout()
    plt.savefig(f'{prefix}_confusion.png', dpi=150)
    plt.close()
    if len(labels) <= 100:
        report = classification_report(y_true, y_pred, zero_division=0, output_dict=True)
        pd.DataFrame(report).to_csv(f'{prefix}_classification_report.csv')


######################################################################
#  MAIN FUNCTION
######################################################################

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("Using:", device)

    alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-/+ "
    converter = StrLabelConverter(alphabet)
    nclass = len(alphabet) + 1

    # ---------- dataset5 ----------
    base5 = "datasets/dataset5/Doctor’s Handwritten Prescription BD dataset"
    train5_imgs = os.path.join(base5, "training", "training_words")
    train5_csv = os.path.join(base5, "training", "training_labels.csv")
    val5_imgs = os.path.join(base5, "validation", "validation_words")
    val5_csv = os.path.join(base5, "validation", "validation_labels.csv")
    test5_imgs = os.path.join(base5, "testing", "testing_words")
    test5_csv = os.path.join(base5, "testing", "testing_labels.csv")

    train5_set = OCRDataset(train5_imgs, train5_csv, imgH=32)
    val5_set   = OCRDataset(val5_imgs, val5_csv, imgH=32)
    test5_set  = OCRDataset(test5_imgs, test5_csv, imgH=32)

    train5_loader = DataLoader(train5_set, batch_size=16, shuffle=True, num_workers=2)
    val5_loader   = DataLoader(val5_set, batch_size=16, shuffle=False, num_workers=2)
    test5_loader  = DataLoader(test5_set, batch_size=1, shuffle=False, num_workers=1)

    model = CRNN(32, 1, nclass, 256).to(device)
    pretrained_path="crnn_dataset1_final.pth"
    if os.path.exists(pretrained_path):
        model.load_state_dict(torch.load(pretrained_path,map_location=device))
        print(f"Loaded pre-trained model weights from {pretrained_path}")
    else:
        print(f"Pre-trained model {pretrained_path} not found, training from scratch.")
    criterion = nn.CTCLoss(blank=0, reduction='mean', zero_infinity=True)
    optimizer = torch.optim.Adam(model.parameters(), lr=3e-4)

    EPOCHS5 = 10
    history5 = {'train_loss':[], 'val_loss':[], 'train_acc':[], 'val_acc':[]}
    for epoch in range(EPOCHS5):
        tr_loss, tr_acc = epoch_train(model, train5_loader, criterion, optimizer, converter, device)
        vl_loss, vl_acc = epoch_validate(model, val5_loader, criterion, converter, device)
        history5['train_loss'].append(tr_loss); history5['val_loss'].append(vl_loss)
        history5['train_acc'].append(tr_acc); history5['val_acc'].append(vl_acc)
        print(f"[Dataset5] Epoch {epoch+1}/{EPOCHS5} - Train Loss {tr_loss:.4f} Acc {tr_acc:.4f} | Val Loss {vl_loss:.4f} Acc {vl_acc:.4f}")
        torch.save(model.state_dict(), f"crnn_dataset5_epoch{epoch+1}.pth")

    save_metrics_csv(history5, "dataset5")
    plot_loss_acc(history5, "dataset5")
    y_true5, y_pred5 = evaluate_on_loader(model, test5_loader, converter, device)
    pd.DataFrame({'true': y_true5, 'pred': y_pred5}).to_csv('dataset5_test_predictions.csv', index=False)
    plot_confusion(y_true5, y_pred5, 'dataset5')

    model_path5 = "crnn_dataset5_final.pth"
    torch.save(model.state_dict(), model_path5)
    print("Saved dataset5 model to", model_path5)

    summary = {
        'dataset5': {
            'model': model_path5,
            'metrics_csv': 'dataset5_metrics.csv',
            'lossacc_png': 'dataset5_loss_acc.png',
            'test_predictions': 'dataset5_test_predictions.csv'
        }
    }
    with open('training_summary.json','w') as f:
        json.dump(summary, f, indent=2)

    print("All done. Outputs saved to current folder.")


if __name__ == "__main__":
    main()
