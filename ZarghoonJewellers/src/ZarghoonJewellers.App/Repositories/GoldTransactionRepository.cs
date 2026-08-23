using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Data.Sqlite;
using ZarghoonJewellers.App.Data;
using ZarghoonJewellers.App.Models;

namespace ZarghoonJewellers.App.Repositories
{
    public class GoldTransactionRepository
    {
        public List<GoldTransaction> GetAll(TransactionType type, DateTime? from = null, DateTime? to = null, string search = null)
        {
            var result = new List<GoldTransaction>();

            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();

            var sql = new StringBuilder(@"
SELECT Id, Date, Type, KarigarId, PersonName, Weight, Purity, Description, Notes, CreatedAt
FROM GoldTransactions
WHERE Type = $type");

            cmd.Parameters.AddWithValue("$type", type.ToString());

            if (from.HasValue)
            {
                sql.Append(" AND Date >= $from");
                cmd.Parameters.AddWithValue("$from", from.Value.ToString("yyyy-MM-dd"));
            }
            if (to.HasValue)
            {
                sql.Append(" AND Date <= $to");
                cmd.Parameters.AddWithValue("$to", to.Value.ToString("yyyy-MM-dd"));
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                sql.Append(" AND (PersonName LIKE $search OR Description LIKE $search)");
                cmd.Parameters.AddWithValue("$search", "%" + search.Trim() + "%");
            }

            sql.Append(" ORDER BY Date DESC, Id DESC");
            cmd.CommandText = sql.ToString();

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                result.Add(ReadTransaction(reader));
            }

            return result;
        }

        public List<GoldTransaction> GetByKarigar(int karigarId, DateTime? from = null, DateTime? to = null)
        {
            var result = new List<GoldTransaction>();

            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();

            var sql = new StringBuilder(@"
SELECT Id, Date, Type, KarigarId, PersonName, Weight, Purity, Description, Notes, CreatedAt
FROM GoldTransactions
WHERE KarigarId = $karigarId");
            cmd.Parameters.AddWithValue("$karigarId", karigarId);

            if (from.HasValue)
            {
                sql.Append(" AND Date >= $from");
                cmd.Parameters.AddWithValue("$from", from.Value.ToString("yyyy-MM-dd"));
            }
            if (to.HasValue)
            {
                sql.Append(" AND Date <= $to");
                cmd.Parameters.AddWithValue("$to", to.Value.ToString("yyyy-MM-dd"));
            }

            sql.Append(" ORDER BY Date ASC, Id ASC");
            cmd.CommandText = sql.ToString();

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                result.Add(ReadTransaction(reader));
            }

            return result;
        }

        public int Add(GoldTransaction transaction)
        {
            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
INSERT INTO GoldTransactions (Date, Type, KarigarId, PersonName, Weight, Purity, Description, Notes, CreatedAt)
VALUES ($date, $type, $karigarId, $personName, $weight, $purity, $description, $notes, $createdAt);
SELECT last_insert_rowid();";

            BindParameters(cmd, transaction);
            cmd.Parameters.AddWithValue("$createdAt", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));

            return Convert.ToInt32((long)cmd.ExecuteScalar());
        }

        public void Update(GoldTransaction transaction)
        {
            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
UPDATE GoldTransactions
SET Date = $date, Type = $type, KarigarId = $karigarId, PersonName = $personName,
    Weight = $weight, Purity = $purity, Description = $description, Notes = $notes
WHERE Id = $id";

            BindParameters(cmd, transaction);
            cmd.Parameters.AddWithValue("$id", transaction.Id);

            cmd.ExecuteNonQuery();
        }

        public void Delete(int id)
        {
            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "DELETE FROM GoldTransactions WHERE Id = $id";
            cmd.Parameters.AddWithValue("$id", id);
            cmd.ExecuteNonQuery();
        }

        /// <summary>Sum of gold weight for a given direction, optionally restricted to a date range and/or a Karigar.</summary>
        public decimal GetTotal(TransactionType type, DateTime? from = null, DateTime? to = null, int? karigarId = null)
        {
            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();

            var sql = new StringBuilder("SELECT COALESCE(SUM(Weight), 0) FROM GoldTransactions WHERE Type = $type");
            cmd.Parameters.AddWithValue("$type", type.ToString());

            if (from.HasValue)
            {
                sql.Append(" AND Date >= $from");
                cmd.Parameters.AddWithValue("$from", from.Value.ToString("yyyy-MM-dd"));
            }
            if (to.HasValue)
            {
                sql.Append(" AND Date <= $to");
                cmd.Parameters.AddWithValue("$to", to.Value.ToString("yyyy-MM-dd"));
            }
            if (karigarId.HasValue)
            {
                sql.Append(" AND KarigarId = $karigarId");
                cmd.Parameters.AddWithValue("$karigarId", karigarId.Value);
            }

            cmd.CommandText = sql.ToString();
            return Convert.ToDecimal(cmd.ExecuteScalar());
        }

        private static void BindParameters(SqliteCommand cmd, GoldTransaction t)
        {
            cmd.Parameters.AddWithValue("$date", t.Date.ToString("yyyy-MM-dd"));
            cmd.Parameters.AddWithValue("$type", t.Type.ToString());
            cmd.Parameters.AddWithValue("$karigarId", (object)t.KarigarId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$personName", t.PersonName ?? string.Empty);
            cmd.Parameters.AddWithValue("$weight", t.Weight);
            cmd.Parameters.AddWithValue("$purity", t.Purity ?? string.Empty);
            cmd.Parameters.AddWithValue("$description", t.Description ?? string.Empty);
            cmd.Parameters.AddWithValue("$notes", t.Notes ?? string.Empty);
        }

        private static GoldTransaction ReadTransaction(SqliteDataReader reader)
        {
            return new GoldTransaction
            {
                Id = reader.GetInt32(0),
                Date = DateTime.Parse(reader.GetString(1)),
                Type = Enum.Parse<TransactionType>(reader.GetString(2)),
                KarigarId = reader.IsDBNull(3) ? (int?)null : reader.GetInt32(3),
                PersonName = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                Weight = reader.GetDecimal(5),
                Purity = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                Description = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                Notes = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                CreatedAt = DateTime.TryParse(reader.IsDBNull(9) ? null : reader.GetString(9), out var dt) ? dt : DateTime.Now,
            };
        }
    }
}
