import { dirname, join } from "path";
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import mammoth from "mammoth";
dotenv.config();

// Function to split text into pages
function splitIntoPages(text, pageSize) {
  const pages = [];
  let start = 0;
  while (start < text.length) {
    pages.push(text.substr(start, pageSize));
    start += pageSize;
  }
  return pages;
}

// Function to convert Word file to JSON
const wordToJson = (filePath, pageSize) => {
  return new Promise((resolve, reject) => {
    mammoth
      .extractRawText({ path: filePath })
      .then((result) => {
        const text = result.value;
        const pages = splitIntoPages(text, pageSize);
        resolve(pages);
      })
      .catch((error) => reject(error));
  });
};

const getParsedContents = async () => {
  /** @type string[] */
  const data = await wordToJson("./a.docx", 1000);
  const parsed = data.map((content) =>
    content
      .split("\n")
      .filter((chunk) => chunk.length > 0)
      .join("\n"),
  );

  return parsed;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAIKEY,
});

// app.get("/", async (_, res) => {

// });

// app.listen(port, () => console.log(`Listening on Port ${port}`));

// async function askAI(prompt) {
//   const completion = await openai.chat.completions.create({
//     messages: [
//       { role: "system", content: "You are a helpful assistant." },
//       { role: "user", content: prompt },
//     ],
//     model: "gpt-3.5-turbo",
//   });

//   return completion.choices[0].message.content;
// }

// const correctPara = async () => {
//   const systemPrompt = `${content.content}\n\n Read the above paragraph and correct the wrong sentences, punctuation etc and provide the content in json like this: {content: 'the corrected content'}`;

//   return new Promise(async (res, rej) => {
//     try {
//       const response = await openai.chat.completions.create({
//         model: "gpt-3.5-turbo",
//         messages: [
//           {
//             role: "system",
//             content: `Pretend you're an expert paragraph corrector.`,
//           },
//           {
//             role: "user",
//             content: systemPrompt,
//           },
//         ],
//         max_tokens: 60,
//       });

//       res(response.choices[0].message.content);
//     } catch (err) {
//       console.log(err);
//       rej(err);
//     }
//   });
// };

const main = async () => {
  const pages = await getParsedContents();

  const responses = [];
  const system =
    "You need to study the passed contents and summarize it. I'll send you previous summaries seperated by lines so you can remember them and take into account.";
  const seperator = `\n\n--------------------\n\n`;
  const user = "This is the content, take previous summaries into account and summarize this content"

  for (const content of pages) {
    const response = await openai.chat.completions.create({
      messages: [
        { role: "system", content: system + seperator + responses.join(seperator) },
        { role: "user", content: user + seperator + content },
      ],
      model: "gpt-4",
    });

    const ai_res = response.choices[0]?.message?.content;

    if (typeof ai_res === "string" && ai_res) {
      responses.push(ai_res);
      console.log('Response receied')
      console.log(seperator)
      console.log(ai_res);
    }
  }
}

await main();
