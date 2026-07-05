using IslamicCompanionPro.Models;

namespace IslamicCompanionPro.Data.SeedData;

/// <summary>
/// Dua categories and one authentic, well-referenced Dua per category so every category is usable
/// immediately offline. Each entry has been cross-checked against widely published Hisnul Muslim /
/// Sahih hadith wording. Expand each category with more Duas via <c>IDuaService.AddDuaAsync</c> or a
/// bulk JSON import (see Resources/Raw/duas_full.json) — always verify additions against a trusted
/// reference (Hisnul Muslim, Sunnah.com) before shipping to end users.
/// NOTE: Category.Id is assigned by SQLite AutoIncrement in insertion order (1-10 below); Dua.CategoryId
/// values are set to match that fixed insertion order in DatabaseService.SeedDatabaseAsync.
/// </summary>
public static class DuaSeedData
{
	public static readonly DuaCategory[] Categories =
	{
		new() { NameEnglish = "Morning Duas", NameArabic = "أذكار الصباح", NameUrdu = "صبح کی دعائیں", IconName = "icon_morning.png", SortOrder = 1 },
		new() { NameEnglish = "Evening Duas", NameArabic = "أذكار المساء", NameUrdu = "شام کی دعائیں", IconName = "icon_evening.png", SortOrder = 2 },
		new() { NameEnglish = "Sleeping Duas", NameArabic = "أدعية النوم", NameUrdu = "سونے کی دعائیں", IconName = "icon_sleep.png", SortOrder = 3 },
		new() { NameEnglish = "Eating Duas", NameArabic = "أدعية الطعام", NameUrdu = "کھانے کی دعائیں", IconName = "icon_eating.png", SortOrder = 4 },
		new() { NameEnglish = "Travel Duas", NameArabic = "أدعية السفر", NameUrdu = "سفر کی دعائیں", IconName = "icon_travel.png", SortOrder = 5 },
		new() { NameEnglish = "Protection Duas", NameArabic = "أدعية الحماية", NameUrdu = "حفاظت کی دعائیں", IconName = "icon_protection.png", SortOrder = 6 },
		new() { NameEnglish = "Daily Duas", NameArabic = "أدعية يومية", NameUrdu = "روزانہ کی دعائیں", IconName = "icon_daily.png", SortOrder = 7 },
		new() { NameEnglish = "Hajj / Umrah Duas", NameArabic = "أدعية الحج والعمرة", NameUrdu = "حج و عمرہ کی دعائیں", IconName = "icon_hajj.png", SortOrder = 8 },
		new() { NameEnglish = "Quranic Duas", NameArabic = "أدعية قرآنية", NameUrdu = "قرآنی دعائیں", IconName = "icon_quran_dua.png", SortOrder = 9 },
		new() { NameEnglish = "Ramadan Duas", NameArabic = "أدعية رمضان", NameUrdu = "رمضان کی دعائیں", IconName = "icon_ramadan.png", SortOrder = 10 },
	};

	/// <summary>CategoryId here maps 1:1 to the fixed order of <see cref="Categories"/> above.</summary>
	public static readonly Dua[] Duas =
	{
		new()
		{
			CategoryId = 1,
			Title = "Morning Remembrance",
			TextArabic = "اَللّٰهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
			Transliteration = "Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilaykan-nushur.",
			TranslationEnglish = "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.",
			TranslationUrdu = "اے اللہ! تیری ہی مدد سے ہم نے صبح کی اور تیری ہی مدد سے شام کرتے ہیں، تیرے ہی سہارے جیتے ہیں اور تیرے ہی سہارے مرتے ہیں اور تیری ہی طرف اٹھنا ہے۔",
			Reference = "Jami' at-Tirmidhi 3391",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 2,
			Title = "Evening Remembrance",
			TextArabic = "اَللّٰهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ",
			Transliteration = "Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namutu, wa ilaykal-masir.",
			TranslationEnglish = "O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the return.",
			TranslationUrdu = "اے اللہ! تیری ہی مدد سے ہم نے شام کی اور تیری ہی مدد سے صبح کرتے ہیں، تیرے ہی سہارے جیتے ہیں اور تیرے ہی سہارے مرتے ہیں اور تیری ہی طرف لوٹنا ہے۔",
			Reference = "Jami' at-Tirmidhi 3391",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 3,
			Title = "Before Sleeping",
			TextArabic = "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
			Transliteration = "Bismika Allahumma amutu wa ahya.",
			TranslationEnglish = "In Your name, O Allah, I die and I live.",
			TranslationUrdu = "اے اللہ! تیرے ہی نام کے ساتھ میں مرتا ہوں اور جیتا ہوں۔",
			Reference = "Sahih al-Bukhari 6324",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 4,
			Title = "Before Eating",
			TextArabic = "بِسْمِ اللَّهِ",
			Transliteration = "Bismillah.",
			TranslationEnglish = "In the name of Allah.",
			TranslationUrdu = "اللہ کے نام سے۔",
			Reference = "Sunan Abi Dawud 3767, Jami' at-Tirmidhi 1858",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 5,
			Title = "Dua for Travel",
			TextArabic = "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنْقَلِبُونَ",
			Transliteration = "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun.",
			TranslationEnglish = "Glory to Him Who has subjected this to us, and we could never have it (by our efforts). And indeed, to our Lord we will return.",
			TranslationUrdu = "پاک ہے وہ ذات جس نے اس سواری کو ہمارے قابو میں کر دیا، ورنہ ہم اسے قابو میں لانے والے نہ تھے، اور بیشک ہمیں اپنے رب کی طرف لوٹنا ہے۔",
			Reference = "Qur'an 43:13-14; Sahih Muslim 1342",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 6,
			Title = "Seeking Protection",
			TextArabic = "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
			Transliteration = "A'udhu bikalimatillahi at-tammati min sharri ma khalaq.",
			TranslationEnglish = "I seek refuge in the perfect words of Allah from the evil of what He has created.",
			TranslationUrdu = "میں اللہ کے کامل کلمات کے ذریعے اس کی مخلوق کے شر سے پناہ مانگتا ہوں۔",
			Reference = "Sahih Muslim 2708",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 7,
			Title = "Good in Both Worlds",
			TextArabic = "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
			Transliteration = "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar.",
			TranslationEnglish = "Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
			TranslationUrdu = "اے ہمارے رب! ہمیں دنیا میں بھلائی عطا فرما اور آخرت میں بھی بھلائی عطا فرما اور ہمیں آگ کے عذاب سے بچا۔",
			Reference = "Qur'an 2:201",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 8,
			Title = "Talbiyah",
			TextArabic = "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ",
			Transliteration = "Labbayk Allahumma labbayk, labbayka la sharika laka labbayk, innal-hamda wan-ni'mata laka wal-mulk, la sharika lak.",
			TranslationEnglish = "Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Verily all praise, grace and sovereignty belong to You. You have no partner.",
			TranslationUrdu = "میں حاضر ہوں اے اللہ! میں حاضر ہوں، میں حاضر ہوں تیرا کوئی شریک نہیں، میں حاضر ہوں، بیشک تمام تعریف اور نعمت تیرے ہی لیے ہے اور بادشاہت بھی، تیرا کوئی شریک نہیں۔",
			Reference = "Sahih al-Bukhari 1549, Sahih Muslim 1184",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 9,
			Title = "Steadfastness of the Heart",
			TextArabic = "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ",
			Transliteration = "Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah, innaka Antal-Wahhab.",
			TranslationEnglish = "Our Lord, let not our hearts deviate after You have guided us, and grant us mercy from Yourself. Indeed, You are the Bestower.",
			TranslationUrdu = "اے ہمارے رب! ہمیں ہدایت دینے کے بعد ہمارے دلوں کو ٹیڑھا نہ کر اور ہمیں اپنے پاس سے رحمت عطا فرما، بیشک تو ہی بہت عطا کرنے والا ہے۔",
			Reference = "Qur'an 3:8",
			SortOrder = 1
		},
		new()
		{
			CategoryId = 10,
			Title = "Breaking the Fast (Iftar)",
			TextArabic = "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
			Transliteration = "Dhahaba adh-dhama'u wab-tallatil-'urooqu wa thabatal-ajru in sha Allah.",
			TranslationEnglish = "The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills.",
			TranslationUrdu = "پیاس ختم ہوگئی، رگیں تر ہوگئیں اور اجر ثابت ہوگیا، ان شاء اللہ۔",
			Reference = "Sunan Abi Dawud 2357",
			SortOrder = 1
		},
	};
}
