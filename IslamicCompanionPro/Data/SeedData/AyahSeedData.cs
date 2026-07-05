using IslamicCompanionPro.Models;

namespace IslamicCompanionPro.Data.SeedData;

/// <summary>
/// Demonstration Quran text so the app is fully functional (search, bookmarks, favorites, last-read,
/// audio hooks) the moment it is installed, WITHOUT shipping a hand-typed copy of the entire Quran
/// in source code — sacred text must come from a verified corpus, not be retyped from memory.
///
/// This seed intentionally covers only Surah Al-Fatihah (1-7) and the opening Ayahs of Al-Baqarah
/// (8-12 global). For a production release, use <c>QuranImportService</c> (Services/QuranImportService.cs)
/// to bulk-import the complete, verified 6236-Ayah Uthmani text and translations from a trusted source
/// such as Tanzil.net (https://tanzil.net/download) — drop the exported JSON into
/// Resources/Raw/quran_full.json and Resources/Raw/translations_full.json and call
/// IQuranImportService.ImportFullQuranAsync() once (e.g. from an admin/debug menu or first-run task).
/// </summary>
public static class AyahSeedData
{
	public static readonly QuranAyah[] Ayahs =
	{
		// Surah 1: Al-Fatihah (global ayah 1-7)
		new() { SurahNumber = 1, AyahNumber = 1, GlobalAyahNumber = 1, JuzNumber = 1, PageNumber = 1, TextArabic = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
		new() { SurahNumber = 1, AyahNumber = 2, GlobalAyahNumber = 2, JuzNumber = 1, PageNumber = 1, TextArabic = "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
		new() { SurahNumber = 1, AyahNumber = 3, GlobalAyahNumber = 3, JuzNumber = 1, PageNumber = 1, TextArabic = "الرَّحْمَٰنِ الرَّحِيمِ" },
		new() { SurahNumber = 1, AyahNumber = 4, GlobalAyahNumber = 4, JuzNumber = 1, PageNumber = 1, TextArabic = "مَالِكِ يَوْمِ الدِّينِ" },
		new() { SurahNumber = 1, AyahNumber = 5, GlobalAyahNumber = 5, JuzNumber = 1, PageNumber = 1, TextArabic = "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
		new() { SurahNumber = 1, AyahNumber = 6, GlobalAyahNumber = 6, JuzNumber = 1, PageNumber = 1, TextArabic = "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
		new() { SurahNumber = 1, AyahNumber = 7, GlobalAyahNumber = 7, JuzNumber = 1, PageNumber = 1, TextArabic = "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },

		// Surah 2: Al-Baqarah, opening Ayahs (global ayah 8-12)
		new() { SurahNumber = 2, AyahNumber = 1, GlobalAyahNumber = 8, JuzNumber = 1, PageNumber = 2, TextArabic = "الم" },
		new() { SurahNumber = 2, AyahNumber = 2, GlobalAyahNumber = 9, JuzNumber = 1, PageNumber = 2, TextArabic = "ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِلْمُتَّقِينَ" },
		new() { SurahNumber = 2, AyahNumber = 3, GlobalAyahNumber = 10, JuzNumber = 1, PageNumber = 2, TextArabic = "الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنْفِقُونَ" },
		new() { SurahNumber = 2, AyahNumber = 4, GlobalAyahNumber = 11, JuzNumber = 1, PageNumber = 2, TextArabic = "وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنْزِلَ إِلَيْكَ وَمَا أُنْزِلَ مِنْ قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ" },
		new() { SurahNumber = 2, AyahNumber = 5, GlobalAyahNumber = 12, JuzNumber = 1, PageNumber = 2, TextArabic = "أُولَٰئِكَ عَلَىٰ هُدًى مِنْ رَبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ" },
	};

	public static readonly QuranTranslation[] TranslationsEnglish =
	{
		new() { GlobalAyahNumber = 1, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "In the name of Allah, the Entirely Merciful, the Especially Merciful." },
		new() { GlobalAyahNumber = 2, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "[All] praise is [due] to Allah, Lord of the worlds -" },
		new() { GlobalAyahNumber = 3, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "The Entirely Merciful, the Especially Merciful," },
		new() { GlobalAyahNumber = 4, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "Sovereign of the Day of Recompense." },
		new() { GlobalAyahNumber = 5, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "It is You we worship and You we ask for help." },
		new() { GlobalAyahNumber = 6, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "Guide us to the straight path -" },
		new() { GlobalAyahNumber = 7, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray." },
		new() { GlobalAyahNumber = 8, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "Alif, Lam, Meem." },
		new() { GlobalAyahNumber = 9, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "This is the Book about which there is no doubt, a guidance for those conscious of Allah -" },
		new() { GlobalAyahNumber = 10, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "Who believe in the unseen, establish prayer, and spend out of what We have provided for them," },
		new() { GlobalAyahNumber = 11, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "And who believe in what has been revealed to you, [O Muhammad], and what was revealed before you, and of the Hereafter they are certain [in faith]." },
		new() { GlobalAyahNumber = 12, LanguageCode = "en", TranslatorName = "Saheeh International", Text = "Those are upon [right] guidance from their Lord, and it is those who are the successful." },
	};

	public static readonly QuranTranslation[] TranslationsUrdu =
	{
		new() { GlobalAyahNumber = 1, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "اللہ کے نام سے جو نہایت مہربان، رحم کرنے والا ہے۔" },
		new() { GlobalAyahNumber = 2, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "تمام تعریفیں اللہ کے لیے ہیں جو تمام جہانوں کا پروردگار ہے۔" },
		new() { GlobalAyahNumber = 3, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "جو نہایت مہربان، رحم کرنے والا ہے۔" },
		new() { GlobalAyahNumber = 4, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "جو یومِ جزا کا مالک ہے۔" },
		new() { GlobalAyahNumber = 5, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "ہم تیری ہی عبادت کرتے ہیں اور تجھ ہی سے مدد مانگتے ہیں۔" },
		new() { GlobalAyahNumber = 6, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "ہمیں سیدھا راستہ دکھا۔" },
		new() { GlobalAyahNumber = 7, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "ان لوگوں کا راستہ جن پر تو نے انعام کیا، نہ کہ ان کا جن پر غضب نازل ہوا اور نہ گمراہوں کا۔" },
		new() { GlobalAyahNumber = 8, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "الف، لام، میم۔" },
		new() { GlobalAyahNumber = 9, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "یہ وہ کتاب ہے جس میں کوئی شک نہیں، پرہیزگاروں کے لیے ہدایت ہے۔" },
		new() { GlobalAyahNumber = 10, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "جو غیب پر ایمان لاتے ہیں، نماز قائم کرتے ہیں اور جو کچھ ہم نے انہیں دیا ہے اس میں سے خرچ کرتے ہیں۔" },
		new() { GlobalAyahNumber = 11, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "اور جو کچھ آپ پر نازل کیا گیا اور جو آپ سے پہلے نازل کیا گیا اس پر ایمان لاتے ہیں، اور آخرت پر یقین رکھتے ہیں۔" },
		new() { GlobalAyahNumber = 12, LanguageCode = "ur", TranslatorName = "Urdu Translation", Text = "یہی لوگ اپنے رب کی طرف سے ہدایت پر ہیں اور یہی لوگ کامیاب ہونے والے ہیں۔" },
	};
}
