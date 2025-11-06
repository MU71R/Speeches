// ✅ تنسيق التاريخ كـ string عربي جاهز للعرض في الرسائل أو الواجهة
function formatEgyptTime(date) {
  if (!date) return 'غير متاح';
  const parsed = new Date(date);
  if (isNaN(parsed)) return 'غير متاح';

  return parsed.toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

module.exports = { formatEgyptTime };
