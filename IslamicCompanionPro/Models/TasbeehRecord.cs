using SQLite;

namespace IslamicCompanionPro.Models;

/// <summary>One saved zikr counter session/total for a given day and zikr phrase.</summary>
[Table("TasbeehRecords")]
public class TasbeehRecord
{
	[PrimaryKey, AutoIncrement]
	public int Id { get; set; }

	public string ZikrName { get; set; } = string.Empty;

	public string? ZikrArabicText { get; set; }

	public int Count { get; set; }

	public int DailyTarget { get; set; }

	[Indexed]
	public DateTime Date { get; set; } = DateTime.Today;

	public bool IsCustom { get; set; }
}
