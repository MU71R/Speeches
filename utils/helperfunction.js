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

function formatedDate(dateStr) {
  const date = new Date(dateStr);
  const options = { day: "numeric", month: "long", year: "numeric" };
  let formatted = date.toLocaleDateString("ar-EG", options);

  // تصحيح ترتيب السنة لو ظهرت معكوسة
  formatted = formatted.replace(/(\d{4})/g, (match) => {
    return match.split("").reverse().join("");
  });

  return formatted;
}
// ---------------------------------------------------------------
// مساعدات صغيرة
// ---------------------------------------------------------------
function isArabic(str) {
  return /[\u0600-\u06FF]/.test(str);
}

// إصلاح الأقواس لتظهر صحيحة في RTL
function fixBracketsRTL(text) {
  return text
    .replace(/\(/g, '((((')   // مؤقت
    .replace(/\)/g, '))))')
    .replace(/\[/g, '[[[[')
    .replace(/]/g, ']]]]')
    .replace(/\[\[\[/g, '[')
    .replace(/]]]]/g, ']')
    .replace(/\(\(\(\(/g, '(')
    .replace(/\)\)\)\)/g, ')');
}

// ---------------------------------------------------------------
// writeField – كلمة كلمة
// ---------------------------------------------------------------
const writeField = (doc, label, value, pageW) => {
  const full = fixBracketsRTL(`${label}: ${value || '-'}`);
  const margin = 70;                         // نفس الهامش المستخدم في PDF
  const maxLineW = pageW - 2 * margin;       // العرض المتاح للسطر
  let x = pageW - margin;                    // نبدأ من اليمين
  let y = doc.y;                             // موضع السطر الحالي

  // تقسيم النص إلى كلمات + مسافات (نحتفظ بالمسافات ككلمة منفصلة)
  const parts = full.split(/(\s+)/).filter(Boolean);

  for (const part of parts) {
    const isSpace = /^\s+$/.test(part);
    const isArab = !isSpace && isArabic(part);
    const w = doc.widthOfString(part);

    // ---------- انتقال إلى سطر جديد ----------
    if (!isSpace && x - w < margin) {          // الكلمة لا تتسع
      y += doc.currentLineHeight() + 3;       // lineGap = 3
      x = pageW - margin;                     // إعادة البداية من اليمين
    }

    // ---------- كتابة المسافة ----------
    if (isSpace) {
      x -= w;                                 // نتقدم لليسار بقدر المسافة
      continue;
    }

    // ---------- كتابة الكلمة ----------
    const alignOpt = isArab ? 'right' : 'left';
    const features = isArab ? ['rtla'] : [];

    doc.save();                               // لتطبيق الخيارات المحلية فقط
    doc.text(part, x - w, y, {
      width: w,
      align: alignOpt,
      features,
      continued: false,
    });
    doc.restore();

    x -= w;                                   // ننتقل لليسار للكلمة التالية
  }

  // ---------- تحديث مؤشر الصفحة ----------
  doc.y = y + doc.currentLineHeight() + 8;    // 8 ≈ moveDown(0.6) في الـ PDF الأصلي
};

  const toArabicNumbers = (text) => {
    if (!text) return "";
    return text.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  };
function fixBracketsRTL(text) {
  if (!text) return "";
  return text
    .replace(/\(/g, "__temp__") // نحط مكان القوس المفتوح علامة مؤقتة
    .replace(/\)/g, "(")        // نبدل القوس المغلق
    .replace(/__temp__/g, ")"); // نرجع القوس المفتوح مكان العلامة
}


module.exports = {
  getImageBuffer,
  getUniqueFilePath,
  formatDate,
  writeField,
  reverseNumbersInString,
  toArabicNumbers,
  formatedDate,
  fixBracketsRTL,
};