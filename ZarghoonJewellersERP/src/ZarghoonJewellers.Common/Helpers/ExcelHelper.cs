using ClosedXML.Excel;

namespace ZarghoonJewellers.Common.Helpers;

/// <summary>
/// Generic Excel read/write built on ClosedXML. Deliberately works with plain header/row
/// string data rather than being tied to any one entity, so it can back both the Stock
/// Excel-import wizard and any future export screen without duplicating the ClosedXML
/// plumbing each time - column mapping and validation stay in the Business/Presentation
/// layer that knows what a "Stock row" means.
/// </summary>
public static class ExcelHelper
{
    /// <summary>Reads the first worksheet, treating row 1 as headers. Returns one dictionary
    /// (header -> cell text) per data row, in file order. Blank trailing rows are skipped.</summary>
    public static List<Dictionary<string, string>> ReadRowsAsDictionaries(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var worksheet = workbook.Worksheet(1);
        var headerRow = worksheet.Row(1);

        var headers = new List<string>();
        var lastHeaderCol = headerRow.LastCellUsed()?.Address.ColumnNumber ?? 0;
        for (int col = 1; col <= lastHeaderCol; col++)
            headers.Add(headerRow.Cell(col).GetString().Trim());

        var results = new List<Dictionary<string, string>>();
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;

        for (int rowNum = 2; rowNum <= lastRow; rowNum++)
        {
            var row = worksheet.Row(rowNum);
            if (row.IsEmpty()) continue;

            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int col = 0; col < headers.Count; col++)
            {
                if (string.IsNullOrWhiteSpace(headers[col])) continue;
                dict[headers[col]] = row.Cell(col + 1).GetString().Trim();
            }
            results.Add(dict);
        }

        return results;
    }

    /// <summary>Writes a simple header + row-of-strings table to a new .xlsx file.</summary>
    public static void ExportRows(string filePath, string sheetName, IReadOnlyList<string> headers, IReadOnlyList<string[]> rows)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add(SanitizeSheetName(sheetName));

        for (int col = 0; col < headers.Count; col++)
        {
            var cell = worksheet.Cell(1, col + 1);
            cell.Value = headers[col];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1B1B1B");
            cell.Style.Font.FontColor = XLColor.FromHtml("#D4AF37");
        }

        for (int r = 0; r < rows.Count; r++)
        {
            var row = rows[r];
            for (int col = 0; col < row.Length; col++)
                worksheet.Cell(r + 2, col + 1).Value = row[col];
        }

        worksheet.Columns().AdjustToContents();
        workbook.SaveAs(filePath);
    }

    /// <summary>Writes a starter template workbook (headers only, plus one sample row) that users
    /// can fill in and re-import via the Stock Excel Import wizard.</summary>
    public static void ExportTemplate(string filePath, string sheetName, IReadOnlyList<string> headers, string[] sampleRow)
        => ExportRows(filePath, sheetName, headers, new[] { sampleRow });

    private static string SanitizeSheetName(string name)
    {
        foreach (var invalid in new[] { '\\', '/', '*', '?', ':', '[', ']' })
            name = name.Replace(invalid, '-');
        return name.Length > 31 ? name[..31] : name;
    }
}
