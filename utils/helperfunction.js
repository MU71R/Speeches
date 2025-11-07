const axios = require("axios");
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");
require("dayjs/locale/ar");
async function getImageBuffer(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
    });
    const contentType = response.headers["content-type"];
    if (contentType && contentType.startsWith("image/")) {
      return Buffer.from(response.data);
    }
    return null;
  } catch (error) {
    return null;
  }
}

function getUniqueFilePath(dir, baseName, ext) {
  let counter = 1;
  let filePath = path.join(dir, `${baseName}${ext}`);
  while (fs.existsSync(filePath)) {
    filePath = path.join(dir, `${baseName}_${counter++}${ext}`);
  }
  return filePath;
}

function reverseNumbersInString(str) {
  if (!str) return "";
  return str.replace(/\d+/g, (num) => num.split("").reverse().join(""));
}

const formatDate = (d) => {
  if (!d) return "غير محدد";
  const date = dayjs(d);
  const formatted = date.locale("ar").format("D MMMM YYYY");

  return reverseNumbersInString(formatted).replace(
    /\d/g,
    (d) => "٠١٢٣٤٥٦٧٨٩"[d]
  );
};

const writeField = (doc, label, value, pageW) => {
  const fullText = `${label}: ${value}`;
  const margin = 70;
  const maxWidth = pageW - margin * 2;

  const words = fullText.split(" ");
  let currentLine = "";
  let lines = [];

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (doc.widthOfString(testLine) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  for (const line of lines) {
    doc.text(line, margin, doc.y, {
      width: maxWidth,
      align: "right",
      features: ["rtla"],
      lineGap: 3,
    });
  }
  doc.moveDown(0.6);
};

module.exports = {
  getImageBuffer,
  getUniqueFilePath,
  formatDate,
  writeField,
  reverseNumbersInString,
};