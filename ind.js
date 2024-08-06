import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import fs from 'fs';
import multer from "multer";
import path from 'path';
import { fileURLToPath } from 'url';
import cors from "cors";
const app = express();
const port = 3001;
const corsOptions = {
    origin: '*',
  };
app.use(express.json());
app.use(cors());
import {readPdfPages} from 'pdf-text-reader';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'build')));

const storage = multer.memoryStorage();
const upload = multer({ dest: 'uploads/' });

let pages = '';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main(fileContent) {
    const chatCompletion = await client.chat.completions.create({
        messages:[{role: "user", content: `Form 5 MCQ questions from text that will be provided. The questions should be based on the text content purely. Note - Output should be in json format - key="question", value="Q(num) Question" ,key="options" - should be array of objects of options, [value= key="option" value= "option 1" ,key="option" value= "option 2" ,key="option" value= "option 3",key="option" value= "option 4"], key="correct", value = "index of correct option(0/1/2/3)". Response should contain only and only json output of 5 questions. The text for question making is ${fileContent}`}],
        model: 'gpt-4o',
    });
    return chatCompletion
}

app.post('/upload', upload.single('file'), async (req, res) => {
    
    if (!req.file) {
        return res.status(400).send('No file uploadedksvjb.');
    }
    
    const filePath = req.file.path;
    try{
        pages = await readPdfPages({url: filePath});
        res.send(pages)
    } catch (error) {
        console.error('Error :', error);
        res.status(500).send('Error');
    }
    
});

app.post('/evaluate', async (req, res) => {
    const { index } = req.body;
    const pageContent = pages[index]?.lines

    try {
        const result = await main(pageContent);
        const openAIResponse = result.choices[0].message.content;
        const jsonResult = JSON.parse(openAIResponse.replace('```json\n', '').replace('\n```', ''));
        res.send(jsonResult);
    } catch (error) {
        console.error('Error in OpenAI part:', error);
        res.status(500).send('Error in final output.');
    }
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });


app.listen(port, () => {
    console.log(`App is running on port ${port}`);
})