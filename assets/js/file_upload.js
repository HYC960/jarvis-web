const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

let uploadedFileName = null;
let uploadedFileContent = null;
let imageClassification = null;

// Accepted file types
const imageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
const textTypes = [
  'text/plain',
  'text/html',
  'text/css',
  'application/javascript',
  'application/json',
  'text/x-python'
];

// 🖱️ Handle Upload Button Click
uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

// 📂 Handle File Selection
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  uploadedFileName = file.name;
  const fileType = file.type;

  // 🖼️ If Image File
  if (imageTypes.includes(fileType)) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target.result;

      try {
        const classification = await classifyImageWithTogether(base64Image);
        imageClassification = classification;

        uploadedFileContent =
          `🖼️ Image uploaded: ${uploadedFileName}\n` +
          `🧠 Classification:\n${classification}`;

        alert(`🖼️ Image uploaded and classified.\n\n📂 File: ${uploadedFileName}\n🧠 Classification: ${classification}`);
      } catch (err) {
        alert("❌ Image classification failed. Check console.");
        console.error(err);
      }
    };
    reader.readAsDataURL(file); // Read image as base64
  }

  // 📄 If Text-based File
  else if (textTypes.includes(fileType)) {
    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedFileContent = 
        `📄 Text file uploaded: ${uploadedFileName}\n` +
        `📄 Content:\n${event.target.result}`;
      alert(`✅ Text file "${uploadedFileName}" loaded and ready.`);
    };
    reader.readAsText(file);
  }

  // ❌ Unsupported File
  else {
    alert("⚠️ Unsupported file type selected.");
  }
});

// 🧠 Image Classification with Together AI LLaMA Vision
async function classifyImageWithTogether(base64Image) {
  if (!base64Image) throw new Error("No image provided");

  const base64 = base64Image.split(',')[1];
  if (!base64) throw new Error("Invalid base64 image format");

  const requestPayload = {
    model: "meta-llama/Llama-Vision-Free",
    messages: [
      {
        role: "user",
        content: [
          {
          type: "text",
          text: `🧠 You are a **visual expert AI**. When a user uploads any image, analyze it carefully and respond with a clear and simple explanation.

                  Your response **must include** the following:

                  1. 📝 **What the image likely represents** — e.g., a logo, a web page, a photograph, a document, a screenshot, etc.
                  2. 👀 **What is clearly visible** — including layout, text, colors, objects, graphics, people, icons, or anything prominent.
                  3. 🔍 Mention any **notable features or themes** — such as branding style, UI layout, emotional tone, clarity, purpose, or design elements.

                  🎯 Keep your answer short, helpful, and easy to understand — as if explaining it to someone seeing it for the first time.

                  Avoid making assumptions. Be factual and concise.`
                  },
                
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}` }
          }
        ]
      }
    ],
    max_tokens: 300,
    temperature: 0.7
  };

  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 0e2ecc906d7eb82afad652ec41a6548fb7526421eea9bf6023d61bb55d936aae" // Replace with your real API key
    },
    body: JSON.stringify(requestPayload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("API Error Details:", errorData);
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message?.content;

  if (Array.isArray(msg)) {
    return msg.find(m => m.type === "text")?.text || "No text response found";
  }

  return msg?.trim() || "No classification found.";
}

async function sendMessageToAI(userPrompt) {
  let finalPrompt = userPrompt;

  if (uploadedFileContent) {
    if (imageClassification) {
      // 📸 Special case for image
      finalPrompt = 
  `🖼️ The user uploaded an image file named **${uploadedFileName}**.\n\n` +
  `👁️ Your visual system analyzed the image and identified the following:\n${imageClassification}\n\n` +
  `🤖 Now, using your own understanding of the image (not just repeating the description), respond to the user's request in a helpful and intelligent way.\n\n` +
  `🗣️ User prompt: ${userPrompt}`;

    } else {
      // 📄 Case for text-based file
      finalPrompt = 
  `📄 The user uploaded a text file named **${uploadedFileName}**.\n\n` +
  `📂 File Content:\n${uploadedFileContent}\n\n` +
  `🤖 Please analyze the file content and respond helpfully to the user's question below.\n\n` +
  `🗣️ User prompt: ${userPrompt}`;

    }
  }

  console.log("🧠 Final AI Prompt Sent:\n", finalPrompt);

  // 🔁 Send this to your AI backend
  // Example:
  // await callYourAIModel(finalPrompt);
}
