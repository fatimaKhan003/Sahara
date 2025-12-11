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
import json

# ---------------------- CRNN MODEL ---------------------- #
class BidirectionalLSTM(nn.Module):
    def __init__(self, nIn, nHidden, nOut):
        super().__init__()
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
        super().__init__()
        assert imgH % 16 == 0, 'imgH must be multiple of 16'
        ks = [3,3,3,3,3,3,2]
        ps = [1,1,1,1,1,1,0]
        ss = [1,1,1,1,1,1,1]
        nm = [64,128,256,256,512,512,512]

        cnn = nn.Sequential()
        def conv_relu(i, batch_norm=False):
            nIn = nc if i==0 else nm[i-1]
            nOut = nm[i]
            cnn.add_module(f'conv{i}', nn.Conv2d(nIn,nOut,ks[i],ss[i],ps[i]))
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
        conv = self.cnn(input)
        b, c, h, w = conv.size()
        assert h==1, "Conv height must be 1"
        conv = conv.squeeze(2)
        conv = conv.permute(2,0,1)
        output = self.rnn(conv)
        output = F.log_softmax(output, dim=2)
        return output

    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, nonlinearity="relu")
                if m.bias is not None: nn.init.constant_(m.bias,0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight,1)
                nn.init.constant_(m.bias,0)
            elif isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.constant_(m.bias,0)

# ---------------------- LABEL CONVERTER ---------------------- #
class StrLabelConverter:
    def __init__(self, alphabet, ignore_case=True):
        if ignore_case: alphabet = alphabet.lower()
        self.alphabet = alphabet
        self.dict = {char:i+1 for i,char in enumerate(alphabet)}

    def encode(self,text_list):
        if isinstance(text_list,str): text_list=[text_list]
        lengths = [len(s) for s in text_list]
        encoded=[]
        for s in text_list:
            for ch in s:
                encoded.append(self.dict.get(ch,0))
        return torch.LongTensor(encoded), torch.IntTensor(lengths)

    def decode(self, preds, preds_size):
        preds_idx = preds.permute(1,0,2).argmax(2)
        texts=[]
        for b in range(preds_idx.size(0)):
            seq = preds_idx[b]
            char_list=[]
            prev=None
            for c in seq:
                c=c.item()
                if c!=0 and c!=prev:
                    if 1<=c<=len(self.alphabet):
                        char_list.append(self.alphabet[c-1])
                prev=c
            texts.append("".join(char_list))
        return texts

# ---------------------- DATASET ---------------------- #
class OCRDataset(Dataset):
    FNAME_CANDIDATES = ['IMAGE','image','img','filename']
    LABEL_CANDIDATES = ['MEDICINE_NAME','medicine_name','GENERIC_NAME','generic_name']

    def __init__(self,image_folder,labels_csv,imgH=32,fname_col=None,label_col=None):
        self.image_folder=image_folder
        self.labels=pd.read_csv(labels_csv)
        self.fname_col=fname_col or self._find_col(self.FNAME_CANDIDATES)
        self.label_col=label_col or self._find_col(self.LABEL_CANDIDATES, allow_missing=True)

        self.labels[self.fname_col]=self.labels[self.fname_col].astype(str).str.strip()
        if self.label_col: self.labels[self.label_col]=self.labels[self.label_col].astype(str).str.strip()

        self.transform=transforms.Compose([
            transforms.Grayscale(),
            transforms.Resize((imgH,200)),
            transforms.RandomRotation(2),
            transforms.ColorJitter(brightness=0.2,contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize((0.5,),(0.5,))
        ])

    def _find_col(self,candidates,allow_missing=False):
        cols=[c.lower() for c in self.labels.columns]
        for cand in candidates:
            if cand.lower() in cols: return self.labels.columns[cols.index(cand.lower())]
        return None if allow_missing else None

    def __len__(self):
        return len(self.labels)

    def _resolve_path(self,fname):
        if os.path.isabs(fname) and os.path.exists(fname): return fname
        cand=os.path.join(self.image_folder,fname)
        if os.path.exists(cand): return cand
        base,ext=os.path.splitext(fname)
        if ext=='': 
            for e in ['.png','.jpg','.jpeg','.bmp','.tif']:
                c=os.path.join(self.image_folder,base+e)
                if os.path.exists(c): return c
        for root,_,files in os.walk(self.image_folder):
            if fname in files: return os.path.join(root,fname)
        return None

    def __getitem__(self,idx):
        row=self.labels.iloc[idx]
        fname=str(row[self.fname_col]).strip()
        resolved=self._resolve_path(fname)
        if resolved is None:
            raise FileNotFoundError(f"{fname} not found in {self.image_folder}")
        img=Image.open(resolved).convert('L')
        img=self.transform(img)
        label=""
        if self.label_col: label=str(row[self.label_col]).lower()
        return img,label

# ---------------------- TRAIN/VALIDATE ---------------------- #
def epoch_train(model,loader,criterion,optimizer,converter,device):
    model.train()
    total_loss,total_correct,total_samples=0,0,0
    for imgs,texts in loader:
        imgs=imgs.to(device)
        targets,lengths=converter.encode(list(texts))
        preds=model(imgs)
        preds_size=torch.IntTensor([preds.size(0)]*imgs.size(0))
        if targets.numel()==0: loss=torch.tensor(0.0,device=imgs.device)
        else: loss=criterion(preds,targets,preds_size,lengths)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        total_loss+=loss.item()
        with torch.no_grad():
            preds_texts=converter.decode(preds,preds_size)
            for p,gt in zip(preds_texts,texts):
                if p==gt: total_correct+=1
                total_samples+=1
    return total_loss/max(1,len(loader)), total_correct/max(1,total_samples)

def epoch_validate(model,loader,criterion,converter,device):
    model.eval()
    total_loss,total_correct,total_samples=0,0,0
    with torch.no_grad():
        for imgs,texts in loader:
            imgs=imgs.to(device)
            targets,lengths=converter.encode(list(texts))
            preds=model(imgs)
            preds_size=torch.IntTensor([preds.size(0)]*imgs.size(0))
            if targets.numel()==0: loss=torch.tensor(0.0,device=imgs.device)
            else: loss=criterion(preds,targets,preds_size,lengths)
            total_loss+=loss.item()
            preds_texts=converter.decode(preds,preds_size)
            for p,gt in zip(preds_texts,texts):
                if p==gt: total_correct+=1
                total_samples+=1
    return total_loss/max(1,len(loader)), total_correct/max(1,total_samples)

# ---------------------- MAIN ---------------------- #
def main():
    device="cuda" if torch.cuda.is_available() else "cpu"
    print("Using device:",device)

    alphabet="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-/+ "
    converter=StrLabelConverter(alphabet)
    nclass=len(alphabet)+1

    base="OCR/dataset_merged_5_6"
    train_imgs=os.path.join(base,"train")
    train_csv=os.path.join(base,"train_labels.csv")
    val_imgs=os.path.join(base,"val")
    val_csv=os.path.join(base,"val_labels.csv")
    test_imgs=os.path.join(base,"test")
    test_csv=os.path.join(base,"test_labels.csv")

    train_set=OCRDataset(train_imgs,train_csv,imgH=32)
    val_set=OCRDataset(val_imgs,val_csv,imgH=32)
    test_set=OCRDataset(test_imgs,test_csv,imgH=32)

    train_loader=DataLoader(train_set,batch_size=16,shuffle=True,num_workers=2)
    val_loader=DataLoader(val_set,batch_size=16,shuffle=False,num_workers=2)
    test_loader=DataLoader(test_set,batch_size=1,shuffle=False,num_workers=1)

    model=CRNN(32,1,nclass,256).to(device)
    pretrained_path="crnn_dataset1_final.pth"
    if os.path.exists(pretrained_path):
        model.load_state_dict(torch.load(pretrained_path,map_location=device))
        print("Loaded pre-trained weights")
        for param in model.cnn.parameters(): param.requires_grad=False
    else:
        print("No pre-trained model found, training from scratch")

    criterion=nn.CTCLoss(blank=0,reduction='mean',zero_infinity=True)
    optimizer=torch.optim.Adam(filter(lambda p:p.requires_grad,model.parameters()),lr=1e-4)

    EPOCHS=30
    for epoch in range(EPOCHS):
        tr_loss,tr_acc=epoch_train(model,train_loader,criterion,optimizer,converter,device)
        vl_loss,vl_acc=epoch_validate(model,val_loader,criterion,converter,device)
        print(f"Epoch {epoch+1}/{EPOCHS} - Train Loss {tr_loss:.4f} Acc {tr_acc:.4f} | Val Loss {vl_loss:.4f} Acc {vl_acc:.4f}")
        torch.save(model.state_dict(),f"crnn_finetune_epoch{epoch+1}.pth")

    final_model_path="my_crnn_medicines_final.pth"
    torch.save(model.state_dict(),final_model_path)
    print("Saved fine-tuned model to",final_model_path)

if __name__=="__main__":
    main()
